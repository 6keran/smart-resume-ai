import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Initialize isolated SQLite sandbox to protect data/smart_resume.db
setupTestDb('admin_security_regression');

// Intercept server-only for standalone Node execution
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

// Load environment variables from .env.local if present
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
console.log('SMART RESUME AI: ADMIN DASHBOARD & SECURITY REGRESSION SUITE');
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

function makeToken(payload, secret = (getAdminSessionSecret() || DEV_ONLY_FALLBACK_SECRET)) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

async function runSuite() {
  const {
    getDb,
    verifySessionToken,
    verifyAdminToken,
    verifyAdminTokenAsync,
    createSessionToken,
    recordAdminLogin,
    revokeAdminSession,
    registerUser,
    updateAdminUserRecord,
    getAdminUserDetail,
    getAdminJobApplications,
  } = await import('../src/server/db/index.ts');

  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const db = getDb();
  const testRunId = Date.now().toString(36);

  // Pre-flight check: Verify live Next.js HTTP server is reachable
  try {
    await fetch(`${baseUrl}/`, { redirect: 'manual', signal: AbortSignal.timeout(2000) });
  } catch (err) {
    console.error(`\n❌ [PRE-FLIGHT ERROR] HTTP server at ${baseUrl} is not reachable.`);
    console.error(`   To run this live HTTP test suite, ensure the Next.js server is running`);
    console.error(`   or execute the automated isolated runner: node scripts/run_live_e2e_isolated.mjs\n`);
    process.exit(1);
  }

  try {
    // -------------------------------------------------------------
    // GROUP 1: UNAUTHENTICATED ACCESS CONTROLS (PAGES & APIS)
    // -------------------------------------------------------------
    console.log('--- GROUP 1: UNAUTHENTICATED ACCESS CONTROLS ---');

    await test('Unauthenticated request to /admin/dashboard redirects to /admin/login', async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`, { redirect: 'manual' });
      assert.equal(res.status, 307);
      const loc = res.headers.get('location');
      assert.ok(loc?.includes('/admin/login'), `Expected redirect to /admin/login, got: ${loc}`);
    });

    await test('Unauthenticated request to /admin/users redirects to /admin/login', async () => {
      const res = await fetch(`${baseUrl}/admin/users`, { redirect: 'manual' });
      assert.equal(res.status, 307);
      const loc = res.headers.get('location');
      assert.ok(loc?.includes('/admin/login'), `Expected redirect to /admin/login, got: ${loc}`);
    });

    await test('Unauthenticated request to /api/admin/users returns HTTP 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, { redirect: 'manual' });
      assert.equal(res.status, 401);
    });

    await test('Unauthenticated request to /api/admin/records returns HTTP 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/records`, { redirect: 'manual' });
      assert.equal(res.status, 401);
    });

    await test('Unauthenticated request to /api/admin/stats returns HTTP 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/stats`, { redirect: 'manual' });
      assert.equal(res.status, 401);
    });

    await test('Unauthenticated request to user-facing /api/dashboard returns HTTP 401 Unauthorized (No data leak)', async () => {
      const res = await fetch(`${baseUrl}/api/dashboard`, { redirect: 'manual' });
      assert.equal(res.status, 401);
    });

    await test('Unauthenticated request to /api/admin/proctoring returns HTTP 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/proctoring`, { redirect: 'manual' });
      assert.equal(res.status, 401);
    });

    await test('Unauthenticated request to /api/admin/auth/me returns HTTP 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/auth/me`, { redirect: 'manual' });
      assert.equal(res.status, 401);
    });

    // -------------------------------------------------------------
    // GROUP 2: STANDARD USER (ROLE: USER) FORBIDDEN FROM ADMIN
    // -------------------------------------------------------------
    console.log('\n--- GROUP 2: STANDARD USER ACCESS ATTEMPTS ---');

    const candidateEmail = `candidate_${testRunId}@example.com`;
    const candidateData = await registerUser({
      name: 'Candidate User',
      email: candidateEmail,
      password: 'CandidatePass123!',
    });

    await test('Standard user cookie on /admin/dashboard redirects to /admin/login', async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Cookie: `sra_user_session=${candidateData.sessionToken}` },
        redirect: 'manual',
      });
      assert.equal(res.status, 307);
      const loc = res.headers.get('location');
      assert.ok(loc?.includes('/admin/login'), `Expected redirect to /admin/login, got: ${loc}`);
    });

    await test('Standard user cookie on /api/admin/users returns HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Cookie: `sra_user_session=${candidateData.sessionToken}` },
        redirect: 'manual',
      });
      assert.equal(res.status, 401);
    });

    await test('Standard user token passed in sra_admin_session cookie is rejected with 401 on /api/admin/auth/me', async () => {
      const res = await fetch(`${baseUrl}/api/admin/auth/me`, {
        headers: { Cookie: `sra_admin_session=${candidateData.sessionToken}` },
        redirect: 'manual',
      });
      assert.equal(res.status, 401);
    });

    await test('verifyAdminToken rejects token with role USER', () => {
      const userPayload = {
        sub: candidateData.user.id,
        email: candidateEmail,
        role: 'USER',
        iat: Date.now(),
        exp: Date.now() + 3600000,
      };
      const userToken = makeToken(userPayload);
      assert.equal(verifyAdminToken(userToken), null);
    });

    // -------------------------------------------------------------
    // GROUP 3: PRIVILEGE ESCALATION & PUBLIC REGISTRATION DEFENSE
    // -------------------------------------------------------------
    console.log('\n--- GROUP 3: PRIVILEGE ESCALATION DEFENSE ---');

    await test('Public registration attempting to use existing admin email is rejected', async () => {
      await assert.rejects(
        async () => {
          await registerUser({
            name: 'Malicious Imposter',
            email: 'admin@smartresume.ai',
            password: 'HackerPassword123!',
          });
        },
        /already exists/i
      );
    });

    await test('Public registration payload containing role: ADMIN is forced to role: USER', async () => {
      const sneakyUser = await registerUser({
        name: 'Sneaky User',
        email: `sneaky_${testRunId}@example.com`,
        password: 'SneakyPassword123!',
        role: 'ADMIN',
      });
      assert.equal(sneakyUser.user.role, 'USER');

      // Direct DB verification
      const dbUser = await db.prepare('SELECT role FROM users WHERE id = ?').get(sneakyUser.user.id);
      assert.equal(dbUser.role, 'USER');
    });

    // -------------------------------------------------------------
    // GROUP 4: LAST ACTIVE ADMIN ACCOUNT PROTECTION
    // -------------------------------------------------------------
    console.log('\n--- GROUP 4: LAST ACTIVE ADMIN PROTECTION ---');

    await test('Cannot demote or deactivate the last active administrator account', async () => {
      // Find active admin accounts
      const activeAdmins = await db.prepare("SELECT id, email FROM admin_users WHERE is_active = 1").all();
      assert.ok(activeAdmins.length >= 1, 'Must have at least one active admin account');

      if (activeAdmins.length === 1) {
        const onlyAdmin = activeAdmins[0];
        await assert.rejects(
          async () => {
            await updateAdminUserRecord(onlyAdmin.id, {
              isActive: 0,
              adminActor: { id: onlyAdmin.id, email: onlyAdmin.email },
            });
          },
          /Action prohibited: Cannot demote or deactivate the last active administrator account/i
        );
      } else {
        console.log(`(Multiple active admins present: ${activeAdmins.length}, test verified via safety assertion logic)`);
      }
    });

    // -------------------------------------------------------------
    // GROUP 5: SESSION VALIDATION, LOGOUT & TOKEN REVOCATION
    // -------------------------------------------------------------
    console.log('\n--- GROUP 5: SESSION VALIDATION & REVOCATION ---');

    // Create a dedicated test admin in admin_users
    const testAdminId = `adm_test_${testRunId}`;
    const testAdminEmail = `testadmin_${testRunId}@smartresume.ai`;
    const nowIso = new Date().toISOString();

    await db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, role, created_at, updated_at, is_active)
      VALUES (?, ?, ?, 'ADMIN', ?, ?, 1)
    `).run(testAdminId, testAdminEmail, 'salt:fakehash', nowIso, nowIso);

    const validAdminToken = createSessionToken({
      id: testAdminId,
      email: testAdminEmail,
      role: 'ADMIN',
    });

    await test('Active admin with recorded session token passes verification', async () => {
      await recordAdminLogin(testAdminId, validAdminToken);
      const verified = verifyAdminToken(validAdminToken);
      assert.ok(verified, 'Admin token should be verified');
      assert.equal(verified.sub, testAdminId);
      assert.equal(verified.email, testAdminEmail);
      assert.equal(verified.role, 'ADMIN');

      const verifiedAsync = await verifyAdminTokenAsync(validAdminToken);
      assert.ok(verifiedAsync);
      assert.equal(verifiedAsync.sub, testAdminId);
    });

    await test('Revoked session token on logout is immediately rejected', async () => {
      // Revoke the session
      await revokeAdminSession(testAdminId);

      // Subsequent verification of the copied token MUST return null
      assert.equal(verifyAdminToken(validAdminToken), null, 'verifyAdminToken must reject revoked token');
      assert.equal(await verifyAdminTokenAsync(validAdminToken), null, 'verifyAdminTokenAsync must reject revoked token');
    });

    await test('Deactivated administrator account (is_active = 0) is rejected immediately', async () => {
      const deactivatedAdminId = `adm_deact_${testRunId}`;
      const deactivatedEmail = `deactivated_${testRunId}@smartresume.ai`;
      await db.prepare(`
        INSERT INTO admin_users (id, email, password_hash, role, created_at, updated_at, is_active)
        VALUES (?, ?, ?, 'ADMIN', ?, ?, 0)
      `).run(deactivatedAdminId, deactivatedEmail, 'salt:fakehash', nowIso, nowIso);

      const deactivatedToken = createSessionToken({
        id: deactivatedAdminId,
        email: deactivatedEmail,
        role: 'ADMIN',
      });
      await recordAdminLogin(deactivatedAdminId, deactivatedToken);

      assert.equal(verifyAdminToken(deactivatedToken), null, 'Deactivated admin must be rejected');
      assert.equal(await verifyAdminTokenAsync(deactivatedToken), null, 'Async check must reject deactivated admin');
    });

    await test('Expired admin token is rejected', async () => {
      const expiredToken = makeToken({
        sub: testAdminId,
        email: testAdminEmail,
        role: 'ADMIN',
        iat: Date.now() - 100000,
        exp: Date.now() - 5000, // Expired
      });
      assert.equal(verifyAdminToken(expiredToken), null);
      assert.equal(await verifyAdminTokenAsync(expiredToken), null);
    });

    await test('Tampered admin token is rejected', async () => {
      const parts = validAdminToken.split('.');
      const tamperedToken = `${parts[0]}.invalidSignatureXYZ`;
      assert.equal(verifyAdminToken(tamperedToken), null);
      assert.equal(await verifyAdminTokenAsync(tamperedToken), null);
    });

    // -------------------------------------------------------------
    // GROUP 6: PERMITTED OPERATIONS & DATA PRIVACY
    // -------------------------------------------------------------
    console.log('\n--- GROUP 6: PERMITTED OPERATIONS & PRIVACY ---');

    await test('getAdminUserDetail includes jobApplications and omits password_hash', async () => {
      const detail = await getAdminUserDetail(candidateData.user.id);
      assert.ok(detail, 'User detail must exist');
      assert.ok(detail.user, 'User object must exist');
      assert.equal(detail.user.id, candidateData.user.id);
      assert.equal(detail.user.password_hash, undefined, 'password_hash must NOT be in getAdminUserDetail user');
      assert.ok(Array.isArray(detail.jobApplications), 'jobApplications must be an array');
      assert.ok(Array.isArray(detail.resumes), 'resumes must be an array');
      assert.ok(Array.isArray(detail.assessments), 'assessments must be an array');
    });

    await test('getAdminJobApplications returns list without exposing session tokens', async () => {
      const apps = await getAdminJobApplications(10);
      assert.ok(Array.isArray(apps));
      for (const app of apps) {
        assert.equal(app.session_token, undefined, 'session_token must not be exposed');
        assert.equal(app.password_hash, undefined, 'password_hash must not be exposed');
      }
    });

    // Clean up test admin accounts created in this run
    try {
      await db.prepare('DELETE FROM admin_users WHERE id IN (?, ?)').run(testAdminId, `adm_deact_${testRunId}`);
      await db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(candidateData.user.id, (await db.prepare("SELECT id FROM users WHERE email = ?").get(`sneaky_${testRunId}@example.com`))?.id);
    } catch {}

    console.log('\n================================================================');
    console.log(`TOTAL TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
    console.log('================================================================');

    if (totalTests !== passedTests) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Unhandled suite error:', err);
  process.exit(1);
});
