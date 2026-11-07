import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Initialize isolated SQLite sandbox to protect data/smart_resume.db
setupTestDb('p0_p1_security_fixes');

// Intercept server-only for standalone test execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

import {
  verifySessionToken as verifySessionTokenEdge,
  getAdminSessionSecret,
  DEV_ONLY_FALLBACK_SECRET,
} from '../src/lib/sessionAuth.ts';

// Load environment variables from .env.local (if present) so tests share server secret
function loadEnv() {
  const envFile = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

console.log('================================================================');
console.log('SMART RESUME AI: AUTHENTICATION & SESSION SECURITY TEST SUITE');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

async function test(desc, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`✓ PASS [${totalTests}]: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ FAIL [${totalTests}]: ${desc}`);
    console.error(err);
    process.exitCode = 1;
  }
}

// Helper to create a signed token using standard node:crypto HMAC-SHA256
function makeToken(payload, secret = (getAdminSessionSecret() || DEV_ONLY_FALLBACK_SECRET)) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

async function runAllTests() {
  const {
    getDb,
    verifySessionToken: verifySessionTokenNode,
    verifyAdminToken: verifyAdminTokenNode,
    createSessionToken,
  } = await import('../src/server/db/index.ts');

  const db = getDb();
  const seededAdminIds = [];
  const testAdminFixtures = [
    { id: 'adm_valid_001', email: 'admin@example.com' },
    { id: 'adm_canonical_001', email: 'canonical@example.com' },
    { id: 'adm_test_auth_001', email: 'admin_auth@example.com' },
  ];

  try {
    for (const fixture of testAdminFixtures) {
      const existing = await db
        .prepare('SELECT id FROM admin_users WHERE id = ? OR LOWER(email) = ?')
        .get(fixture.id, fixture.email.toLowerCase());
      if (!existing) {
        const nowIso = new Date().toISOString();
        await db.prepare(`
          INSERT INTO admin_users (id, email, password_hash, role, created_at, updated_at, is_active)
          VALUES (?, ?, ?, 'ADMIN', ?, ?, 1)
        `).run(fixture.id, fixture.email.toLowerCase(), 'salt:dummyhash', nowIso, nowIso);
        seededAdminIds.push(fixture.id);
      }
    }
  } catch (seedErr) {
    console.warn('Notice: Could not pre-seed test admin fixtures:', seedErr.message);
  }

  const now = Date.now();

  try {
  // -------------------------------------------------------------
  // GROUP 1: CRYPTOGRAPHIC VERIFICATION & CLAIM ENFORCEMENT (EDGE & NODE)
  // -------------------------------------------------------------
  console.log('--- GROUP 1: CRYPTOGRAPHIC VERIFICATION & CLAIM ENFORCEMENT ---');

  await test('Valid user token with valid HMAC signature is successfully verified by Edge & Node', async () => {
    const payload = {
      sub: 'usr_valid_001',
      email: 'candidate@example.com',
      role: 'USER',
      iat: Date.now(),
      exp: Date.now() + 60000,
    };
    const token = makeToken(payload);
    const edgeResult = await verifySessionTokenEdge(token);
    const nodeResult = verifySessionTokenNode(token);

    assert.ok(edgeResult, 'Edge result should not be null');
    assert.equal(edgeResult.sub, 'usr_valid_001');
    assert.equal(edgeResult.role, 'USER');
    assert.equal(edgeResult.email, 'candidate@example.com');

    assert.ok(nodeResult, 'Node result should not be null');
    assert.equal(nodeResult.sub, 'usr_valid_001');
    assert.equal(nodeResult.role, 'USER');
    assert.equal(nodeResult.email, 'candidate@example.com');
  });

  await test('Valid admin token is verified by Edge, Node, and verifyAdminToken', async () => {
    const payload = {
      sub: 'adm_valid_001',
      email: 'admin@example.com',
      role: 'ADMIN',
      iat: Date.now(),
      exp: Date.now() + 60000,
    };
    const token = makeToken(payload);
    const edgeResult = await verifySessionTokenEdge(token);
    const nodeResult = verifySessionTokenNode(token);
    const adminResult = verifyAdminTokenNode(token);

    assert.ok(edgeResult && edgeResult.role === 'ADMIN');
    assert.ok(nodeResult && nodeResult.role === 'ADMIN');
    assert.ok(adminResult && adminResult.role === 'ADMIN');
  });

  await test('createSessionToken creates valid tokens accepted by Edge, Node, and Admin verifiers', async () => {
    const token = createSessionToken({
      id: 'adm_canonical_001',
      email: 'canonical@example.com',
      role: 'ADMIN',
    });
    const edgeResult = await verifySessionTokenEdge(token);
    const nodeResult = verifySessionTokenNode(token);
    const adminResult = verifyAdminTokenNode(token);

    assert.ok(edgeResult && edgeResult.sub === 'adm_canonical_001');
    assert.ok(nodeResult && nodeResult.sub === 'adm_canonical_001');
    assert.ok(adminResult && adminResult.sub === 'adm_canonical_001');
  });

  await test('Missing exp claim is strictly rejected (no non-expiring token bypass)', async () => {
    const payload = {
      sub: 'usr_no_exp_001',
      email: 'user@example.com',
      role: 'USER',
      iat: Date.now(),
      // exp is missing
    };
    const token = makeToken(payload);
    assert.equal(await verifySessionTokenEdge(token), null, 'Edge must reject missing exp');
    assert.equal(verifySessionTokenNode(token), null, 'Node must reject missing exp');
  });

  await test('Missing iat claim is strictly rejected', async () => {
    const payload = {
      sub: 'usr_no_iat_001',
      email: 'user@example.com',
      role: 'USER',
      // iat is missing
      exp: Date.now() + 60000,
    };
    const token = makeToken(payload);
    assert.equal(await verifySessionTokenEdge(token), null, 'Edge must reject missing iat');
    assert.equal(verifySessionTokenNode(token), null, 'Node must reject missing iat');
  });

  await test('Non-numeric and non-finite exp claims (string, NaN, Infinity) are rejected', async () => {
    for (const badExp of ['not-a-number', null, true, NaN, Infinity, -Infinity]) {
      const payload = {
        sub: 'usr_bad_exp',
        email: 'user@example.com',
        role: 'USER',
        iat: Date.now(),
        exp: badExp,
      };
      const token = makeToken(payload);
      assert.equal(await verifySessionTokenEdge(token), null, `Edge must reject exp=${badExp}`);
      assert.equal(verifySessionTokenNode(token), null, `Node must reject exp=${badExp}`);
    }
  });

  await test('Non-numeric and non-finite iat claims are rejected', async () => {
    for (const badIat of ['invalid-iat', null, false, NaN, Infinity]) {
      const payload = {
        sub: 'usr_bad_iat',
        email: 'user@example.com',
        role: 'USER',
        iat: badIat,
        exp: Date.now() + 60000,
      };
      const token = makeToken(payload);
      assert.equal(await verifySessionTokenEdge(token), null, `Edge must reject iat=${badIat}`);
      assert.equal(verifySessionTokenNode(token), null, `Node must reject iat=${badIat}`);
    }
  });

  await test('Non-positive timestamps (iat <= 0 or exp <= 0) are rejected', async () => {
    const zeroIatToken = makeToken({ sub: 'usr_001', role: 'USER', iat: 0, exp: Date.now() + 60000 });
    const negExpToken = makeToken({ sub: 'usr_001', role: 'USER', iat: Date.now(), exp: -100 });

    assert.equal(await verifySessionTokenEdge(zeroIatToken), null);
    assert.equal(verifySessionTokenNode(zeroIatToken), null);
    assert.equal(await verifySessionTokenEdge(negExpToken), null);
    assert.equal(verifySessionTokenNode(negExpToken), null);
  });

  await test('Tokens with exp <= iat are strictly rejected', async () => {
    const invertedToken = makeToken({
      sub: 'usr_001',
      role: 'USER',
      iat: Date.now(),
      exp: Date.now() - 1000,
    });
    assert.equal(await verifySessionTokenEdge(invertedToken), null);
    assert.equal(verifySessionTokenNode(invertedToken), null);
  });

  await test('Future iat beyond 60s clock skew tolerance is rejected', async () => {
    const futureToken = makeToken({
      sub: 'usr_future_001',
      role: 'USER',
      iat: Date.now() + 120000, // 2 minutes in future (> 60s tolerance)
      exp: Date.now() + 600000,
    });
    assert.equal(await verifySessionTokenEdge(futureToken), null, 'Edge must reject future iat beyond tolerance');
    assert.equal(verifySessionTokenNode(futureToken), null, 'Node must reject future iat beyond tolerance');
  });

  await test('Future iat within 60s clock skew tolerance is accepted', async () => {
    const tolerableToken = makeToken({
      sub: 'usr_skew_001',
      email: 'skew@example.com',
      role: 'USER',
      iat: Date.now() + 20000, // 20s in future (< 60s tolerance)
      exp: Date.now() + 600000,
    });
    const edgeRes = await verifySessionTokenEdge(tolerableToken);
    const nodeRes = verifySessionTokenNode(tolerableToken);
    assert.ok(edgeRes, 'Edge should accept iat within 60s skew tolerance');
    assert.ok(nodeRes, 'Node should accept iat within 60s skew tolerance');
  });

  await test('Expired tokens are strictly rejected', async () => {
    const expiredToken = makeToken({
      sub: 'usr_expired_001',
      role: 'USER',
      iat: Date.now() - 100000,
      exp: Date.now() - 5000, // 5 seconds ago
    });
    assert.equal(await verifySessionTokenEdge(expiredToken), null);
    assert.equal(verifySessionTokenNode(expiredToken), null);
  });

  await test('Missing or empty string sub is strictly rejected', async () => {
    for (const badSub of ['', '   ', null, undefined, 12345]) {
      const token = makeToken({
        sub: badSub,
        role: 'USER',
        iat: Date.now(),
        exp: Date.now() + 60000,
      });
      assert.equal(await verifySessionTokenEdge(token), null);
      assert.equal(verifySessionTokenNode(token), null);
    }
  });

  await test('Invalid roles (e.g. GUEST, SUPERADMIN, hacker) are strictly rejected', async () => {
    for (const badRole of ['GUEST', 'SUPERADMIN', 'hacker', '', null, undefined, 123]) {
      const token = makeToken({
        sub: 'usr_valid_id',
        role: badRole,
        iat: Date.now(),
        exp: Date.now() + 60000,
      });
      assert.equal(await verifySessionTokenEdge(token), null);
      assert.equal(verifySessionTokenNode(token), null);
    }
  });

  await test('Forged token with arbitrary/fake signature is strictly rejected', async () => {
    const payload = {
      sub: 'usr_attacker_001',
      email: 'hacker@example.com',
      role: 'ADMIN',
      iat: Date.now(),
      exp: Date.now() + 60000,
    };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const forgedToken = `${data}.fake_forged_signature_that_should_never_pass`;

    assert.equal(await verifySessionTokenEdge(forgedToken), null);
    assert.equal(verifySessionTokenNode(forgedToken), null);
  });

  await test('Tampered payload with original signature is strictly rejected', async () => {
    const originalToken = makeToken({
      sub: 'usr_user_001',
      email: 'user@example.com',
      role: 'USER',
      iat: Date.now(),
      exp: Date.now() + 60000,
    });
    const [origPayload, origSig] = originalToken.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: 'usr_user_001',
        email: 'user@example.com',
        role: 'ADMIN', // escalated role
        iat: Date.now(),
        exp: Date.now() + 60000,
      })
    ).toString('base64url');
    const tamperedToken = `${tamperedPayload}.${origSig}`;

    assert.equal(await verifySessionTokenEdge(tamperedToken), null);
    assert.equal(verifySessionTokenNode(tamperedToken), null);
  });

  await test('Corrupted signature (single byte modification) is rejected', async () => {
    const payload = { sub: 'usr_001', email: 'test@example.com', role: 'USER', iat: Date.now(), exp: Date.now() + 60000 };
    const token = makeToken(payload);
    const [data, sig] = token.split('.');
    const corruptedSig = sig.slice(0, -2) + (sig.slice(-2) === 'aa' ? 'bb' : 'aa');
    const corruptedToken = `${data}.${corruptedSig}`;

    assert.equal(await verifySessionTokenEdge(corruptedToken), null);
    assert.equal(verifySessionTokenNode(corruptedToken), null);
  });

  await test('Malformed tokens (missing dot, empty string, null, extra parts) return null', async () => {
    for (const malformed of ['', null, undefined, 'nodotshere', 'a.b.c.extra', 'just.one.dot.too.many']) {
      assert.equal(await verifySessionTokenEdge(malformed), null);
      assert.equal(verifySessionTokenNode(malformed), null);
    }
  });

  await test('Production fail-closed: missing ADMIN_SESSION_SECRET rejects all tokens', async () => {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldSecret = process.env.ADMIN_SESSION_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      delete process.env.ADMIN_SESSION_SECRET;

      const payload = { sub: 'usr_001', email: 'test@example.com', role: 'USER', iat: Date.now(), exp: Date.now() + 60000 };
      const token = makeToken(payload, 'any-secret');

      assert.equal(await verifySessionTokenEdge(token), null);
      assert.equal(verifySessionTokenNode(token), null);
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
      if (oldSecret) process.env.ADMIN_SESSION_SECRET = oldSecret;
    }
  });

  await test('Production fail-closed: weak ADMIN_SESSION_SECRET (< 32 chars) rejects all tokens', async () => {
    const oldNodeEnv = process.env.NODE_ENV;
    const oldSecret = process.env.ADMIN_SESSION_SECRET;

    try {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_SESSION_SECRET = 'short-weak-secret-123'; // < 32 chars

      const payload = { sub: 'usr_001', email: 'test@example.com', role: 'USER', iat: Date.now(), exp: Date.now() + 60000 };
      const token = makeToken(payload, 'short-weak-secret-123');

      assert.equal(await verifySessionTokenEdge(token), null);
      assert.equal(verifySessionTokenNode(token), null);
    } finally {
      process.env.NODE_ENV = oldNodeEnv;
      if (oldSecret) process.env.ADMIN_SESSION_SECRET = oldSecret;
    }
  });

  // -------------------------------------------------------------
  // GROUP 2: LIVE HTTP ENDPOINT ROUTE ACCESS CONTROL & ADMIN SEPARATION
  // -------------------------------------------------------------
  console.log('\n--- GROUP 2: LIVE HTTP ENDPOINT ROUTE ACCESS CONTROL ---');

  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

  await test('Anonymous GET /privacy returns HTTP 200 (Public Legal Page)', async () => {
    const res = await fetch(`${baseUrl}/privacy`, { redirect: 'manual' });
    assert.equal(res.status, 200, `Expected HTTP 200 but got ${res.status}`);
    const html = await res.text();
    assert.ok(html.includes('Privacy Policy'), 'Page must contain Privacy Policy heading');
    assert.ok(html.includes('kiran81232@gmail.com'), 'Page must contain DPO contact email');
  });

  await test('Anonymous GET /terms returns HTTP 200 (Public Legal Page)', async () => {
    const res = await fetch(`${baseUrl}/terms`, { redirect: 'manual' });
    assert.equal(res.status, 200, `Expected HTTP 200 but got ${res.status}`);
    const html = await res.text();
    assert.ok(html.includes('Terms and Conditions'), 'Page must contain Terms and Conditions heading');
  });

  await test('Anonymous GET /dashboard redirects to /login?from=/dashboard (HTTP 307)', async () => {
    const res = await fetch(`${baseUrl}/dashboard`, { redirect: 'manual' });
    assert.equal(res.status, 307, `Expected HTTP 307 redirect but got ${res.status}`);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/login?from=%2Fdashboard') || location?.includes('/login?from=/dashboard'));
  });

  await test('Anonymous GET /admin/dashboard redirects to /admin/login (HTTP 307)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, { redirect: 'manual' });
    assert.equal(res.status, 307, `Expected HTTP 307 redirect but got ${res.status}`);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/admin/login'));
  });

  await test('Anonymous GET /api/user/profile is rejected with HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/user/profile`, { redirect: 'manual' });
    assert.equal(res.status, 401, `Expected HTTP 401 but got ${res.status}`);
    const body = await res.json();
    assert.equal(body.error, 'Unauthorized. Please log in.');
  });

  await test('Anonymous GET /api/admin/stats is rejected with HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`, { redirect: 'manual' });
    assert.equal(res.status, 401, `Expected HTTP 401 but got ${res.status}`);
    const body = await res.json();
    assert.equal(body.error, 'Unauthorized. Admin access required.');
  });

  await test('Anonymous GET /api/admin/auth/me is rejected with HTTP 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/admin/auth/me`, { redirect: 'manual' });
    assert.equal(res.status, 401, `Expected HTTP 401 but got ${res.status}`);
  });

  // Token fixtures
  const validUserToken = makeToken({
    sub: 'usr_test_auth_001',
    email: 'user_auth@example.com',
    role: 'USER',
    iat: Date.now(),
    exp: Date.now() + 3600000,
  });

  const validAdminToken = makeToken({
    sub: 'adm_test_auth_001',
    email: 'admin_auth@example.com',
    role: 'ADMIN',
    iat: Date.now(),
    exp: Date.now() + 3600000,
  });

  await test('Regular user presenting token to /api/admin/auth/me is rejected with HTTP 401 (never returns user as admin)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/auth/me`, {
      headers: { Cookie: `sra_admin_session=${validUserToken}` },
      redirect: 'manual',
    });
    assert.equal(res.status, 401, `Expected HTTP 401 when regular user accesses admin/me: got ${res.status}`);
  });

  await test('Valid admin session presenting token to /api/admin/auth/me returns HTTP 200 with admin profile', async () => {
    const res = await fetch(`${baseUrl}/api/admin/auth/me`, {
      headers: { Cookie: `sra_admin_session=${validAdminToken}` },
      redirect: 'manual',
    });
    assert.equal(res.status, 200, `Expected HTTP 200 for valid admin session: got ${res.status}`);
    const body = await res.json();
    assert.ok(body.admin, 'Response must include admin object');
    assert.equal(body.admin.role, 'ADMIN');
    assert.equal(body.admin.id, 'adm_test_auth_001');
  });

  await test('Authenticated User cannot access /admin/dashboard (Redirected to /admin/login)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Cookie: `sra_user_session=${validUserToken}` },
      redirect: 'manual',
    });
    assert.equal(res.status, 307, `Regular user must be redirected away from admin dashboard: got ${res.status}`);
    const location = res.headers.get('location');
    assert.ok(location?.includes('/admin/login'));
  });

  await test('Authenticated User cannot access /api/admin/stats (HTTP 401)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Cookie: `sra_user_session=${validUserToken}` },
      redirect: 'manual',
    });
    assert.equal(res.status, 401);
  });

  await test('Valid Admin token successfully accesses /admin/dashboard (HTTP 200)', async () => {
    const res = await fetch(`${baseUrl}/admin/dashboard`, {
      headers: { Cookie: `sra_admin_session=${validAdminToken}` },
      redirect: 'manual',
    });
    assert.equal(res.status, 200, `Admin token must get 200 on /admin/dashboard: got ${res.status}`);
  });

  await test('Exact path matching: public auth API /api/auth/login is accessible', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      redirect: 'manual',
    });
    // Should reach the route handler (which returns 400 for empty body), NOT 401 Unauthorized from middleware
    assert.equal(res.status, 400, `Expected 400 Bad Request from handler, got ${res.status}`);
  });

  await test('Exact path matching: path extension /api/auth/login/unintended is blocked by middleware (HTTP 401)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login/unintended_subpath`, {
      redirect: 'manual',
    });
    assert.equal(res.status, 401, `Expected 401 for non-exact public path: got ${res.status}`);
  });
  } finally {
    if (seededAdminIds.length > 0) {
      console.log('\n--- CLEANING UP TEST FIXTURES ---');
      try {
        for (const id of seededAdminIds) {
          await db.prepare('DELETE FROM admin_users WHERE id = ?').run(id);
        }
        console.log(`✓ Cleaned up ${seededAdminIds.length} isolated test admin records.`);
      } catch (cleanErr) {
        console.warn('Notice: Test admin cleanup failed:', cleanErr.message);
      }
    }
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL AUTHENTICATION & SESSION SECURITY TESTS PASSED (100%)');
  } else {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
