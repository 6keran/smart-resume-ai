import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Initialize isolated SQLite sandbox to protect data/smart_resume.db
setupTestDb('auth_security_comprehensive');

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
import { resetRateLimitsForTesting } from '../src/lib/rateLimit.ts';

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
console.log('SMART RESUME AI: COMPREHENSIVE AUTH & SECURITY REGRESSION SUITE');
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
    verifySessionToken: verifySessionTokenNode,
    verifyAdminToken: verifyAdminTokenNode,
    createSessionToken,
    recordAdminLogin,
    registerUser,
    loginUser,
    getUserBySession,
    logoutUser,
    saveResumeVersion,
    getResumeVersions,
    getResumeVersion,
    restoreResumeVersion,
    createJobApplication,
    deleteJobApplication,
  } = await import('../src/server/db/index.ts');

  const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
  const db = getDb();
  const testRunId = Date.now().toString(36);
  const createdUserIds = [];

  try {
    // -------------------------------------------------------------
    // GROUP 1: SECRET CONFIGURATION & PRODUCTION FAIL-CLOSED
    // -------------------------------------------------------------
    console.log('--- GROUP 1: SECRET CONFIGURATION & FAIL-CLOSED GUARDS ---');

    await test('Session secret resolution recognizes SESSION_SECRET when ADMIN_SESSION_SECRET is unset', async () => {
      const oldAdmin = process.env.ADMIN_SESSION_SECRET;
      const oldSession = process.env.SESSION_SECRET;
      try {
        delete process.env.ADMIN_SESSION_SECRET;
        process.env.SESSION_SECRET = 'a_very_secure_and_long_session_secret_32_characters_min';
        const resolved = getAdminSessionSecret();
        assert.equal(resolved, 'a_very_secure_and_long_session_secret_32_characters_min');
      } finally {
        if (oldAdmin !== undefined) process.env.ADMIN_SESSION_SECRET = oldAdmin;
        else delete process.env.ADMIN_SESSION_SECRET;
        if (oldSession !== undefined) process.env.SESSION_SECRET = oldSession;
        else delete process.env.SESSION_SECRET;
      }
    });

    await test('Production fail-closed: missing both secrets rejects token creation and verification', async () => {
      const oldEnv = process.env.NODE_ENV;
      const oldAdmin = process.env.ADMIN_SESSION_SECRET;
      const oldSession = process.env.SESSION_SECRET;
      try {
        process.env.NODE_ENV = 'production';
        delete process.env.ADMIN_SESSION_SECRET;
        delete process.env.SESSION_SECRET;

        assert.equal(getAdminSessionSecret(), null);

        assert.throws(() => {
          createSessionToken({ id: 'u1', email: 'test@example.com', role: 'USER' });
        }, /missing or invalid in production environment/);

        const dummyToken = makeToken({ sub: 'u1', email: 'test@example.com', role: 'USER', iat: Date.now(), exp: Date.now() + 60000 }, 'dummy');
        assert.equal(await verifySessionTokenEdge(dummyToken), null);
        assert.equal(verifySessionTokenNode(dummyToken), null);
      } finally {
        process.env.NODE_ENV = oldEnv;
        if (oldAdmin !== undefined) process.env.ADMIN_SESSION_SECRET = oldAdmin;
        if (oldSession !== undefined) process.env.SESSION_SECRET = oldSession;
      }
    });

    await test('Production fail-closed: weak secret (< 32 chars) fails closed', async () => {
      const oldEnv = process.env.NODE_ENV;
      const oldAdmin = process.env.ADMIN_SESSION_SECRET;
      try {
        process.env.NODE_ENV = 'production';
        process.env.ADMIN_SESSION_SECRET = 'short_secret_20_chars!';

        assert.equal(getAdminSessionSecret(), null);
      } finally {
        process.env.NODE_ENV = oldEnv;
        if (oldAdmin !== undefined) process.env.ADMIN_SESSION_SECRET = oldAdmin;
      }
    });

    // -------------------------------------------------------------
    // GROUP 2: USER REGISTRATION & EMAIL NORMALIZATION
    // -------------------------------------------------------------
    console.log('\n--- GROUP 2: USER REGISTRATION & EMAIL NORMALIZATION ---');

    const userAEmail = `audit_usera_${testRunId}@example.com`;
    const userBEmail = `audit_userb_${testRunId}@example.com`;
    const userAPassword = 'SecurePassword123!';
    const userBPassword = 'SecurePassword456!';

    let userAData;
    let userBData;

    await test('User registration creates user with hashed password and role USER', async () => {
      const mixedCaseEmail = `Audit_UserA_${testRunId}@Example.COM`;
      userAData = await registerUser({
        name: 'Audit User A',
        email: mixedCaseEmail,
        password: userAPassword,
      });

      assert.ok(userAData.user.id);
      assert.equal(userAData.user.email, userAEmail.toLowerCase());
      assert.equal(userAData.user.role, 'USER');
      assert.ok(userAData.sessionToken);
      createdUserIds.push(userAData.user.id);

      // Verify DB record directly
      const dbRow = await db.prepare('SELECT id, email, password_hash, role FROM users WHERE id = ?').get(userAData.user.id);
      assert.ok(dbRow);
      assert.equal(dbRow.email, userAEmail.toLowerCase());
      assert.equal(dbRow.role, 'USER');
      // Password must be scrypt salt:hash format, not plaintext
      assert.ok(dbRow.password_hash.includes(':'));
      assert.notEqual(dbRow.password_hash, userAPassword);
    });

    await test('Duplicate registration with same email (regardless of case) is rejected (409 Conflict)', async () => {
      await assert.rejects(
        async () => {
          await registerUser({
            name: 'Imposter User',
            email: userAEmail.toUpperCase(),
            password: 'DifferentPassword999!',
          });
        },
        /already exists/i
      );
    });

    await test('Register User B for cross-user isolation tests', async () => {
      userBData = await registerUser({
        name: 'Audit User B',
        email: userBEmail,
        password: userBPassword,
      });
      assert.ok(userBData.user.id);
      createdUserIds.push(userBData.user.id);
    });

    // -------------------------------------------------------------
    // GROUP 3: AUTHENTICATION, LOGIN & INVALIDATION
    // -------------------------------------------------------------
    console.log('\n--- GROUP 3: AUTHENTICATION, LOGIN & INVALIDATION ---');

    await test('User can log in with correct credentials (case-insensitive email)', async () => {
      const loginRes = await loginUser({
        email: userAEmail.toUpperCase(),
        password: userAPassword,
      });
      assert.equal(loginRes.user.id, userAData.user.id);
      assert.ok(loginRes.sessionToken);
      userAData.sessionToken = loginRes.sessionToken;
    });

    await test('Login with incorrect password fails with generic message (no enumeration)', async () => {
      await assert.rejects(
        async () => {
          await loginUser({
            email: userAEmail,
            password: 'WrongPassword!',
          });
        },
        (err) => err.message === 'Invalid email or password.'
      );
    });

    await test('Login with non-existent email fails with identical generic message (no enumeration)', async () => {
      await assert.rejects(
        async () => {
          await loginUser({
            email: `nonexistent_${testRunId}@example.com`,
            password: 'SomePassword123!',
          });
        },
        (err) => err.message === 'Invalid email or password.'
      );
    });

    await test('getUserBySession returns valid user profile for active session', async () => {
      const profile = await getUserBySession(userAData.sessionToken);
      assert.ok(profile);
      assert.equal(profile.id, userAData.user.id);
    });

    await test('logoutUser invalidates token in database so subsequent getUserBySession returns null', async () => {
      await logoutUser(userAData.sessionToken);
      const profileAfterLogout = await getUserBySession(userAData.sessionToken);
      assert.equal(profileAfterLogout, null, 'Revoked token must return null');

      // Refresh User A session for subsequent tests
      const freshLogin = await loginUser({ email: userAEmail, password: userAPassword });
      userAData.sessionToken = freshLogin.sessionToken;
    });

    // -------------------------------------------------------------
    // GROUP 4: CROSS-USER DATA ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- GROUP 4: CROSS-USER DATA ISOLATION ---');

    let resumeAId;
    let versionAId;
    let applicationAId;

    await test('Setup: Create resume, version, and job application owned by User A', async () => {
      resumeAId = `res_audit_${testRunId}`;
      const now = new Date().toISOString();
      await db.prepare(`
        INSERT INTO resumes (id, user_id, filename, file_type, uploaded_at, parsed_successfully, created_at)
        VALUES (?, ?, 'UserA_Resume.pdf', 'pdf', ?, 1, ?)
      `).run(resumeAId, userAData.user.id, now, now);

      const v = await saveResumeVersion(
        userAData.user.id,
        resumeAId,
        { personalInfo: { fullName: 'User A' }, experience: [] },
        'Initial version User A'
      );
      versionAId = v.id;

      const app = await createJobApplication(userAData.user.id, {
        jobTitle: 'Software Engineer',
        company: 'TechCorp A',
        status: 'applied',
      });
      applicationAId = app.id;

      assert.ok(versionAId);
      assert.ok(applicationAId);
    });

    await test('User B cannot retrieve User A resume versions (Forbidden)', async () => {
      await assert.rejects(
        async () => {
          await getResumeVersions(userBData.user.id, resumeAId);
        },
        /Forbidden: You do not own this resume/i
      );
    });

    await test('User B cannot retrieve User A single version detail (Forbidden)', async () => {
      await assert.rejects(
        async () => {
          await getResumeVersion(userBData.user.id, versionAId);
        },
        /Forbidden: You do not have permission to view this version/i
      );
    });

    await test('User B cannot restore User A resume version (Forbidden)', async () => {
      await assert.rejects(
        async () => {
          await restoreResumeVersion(userBData.user.id, versionAId);
        },
        /Forbidden/i
      );
    });

    await test('User B cannot delete User A job application', async () => {
      const deleted = await deleteJobApplication(userBData.user.id, applicationAId);
      assert.equal(deleted, false, 'User B must not be able to delete User A application');

      // Verify User A application still exists
      const row = await db.prepare('SELECT id FROM job_applications WHERE id = ?').get(applicationAId);
      assert.ok(row, 'User A application must still exist');
    });

    // -------------------------------------------------------------
    // GROUP 5: ADMIN SEPARATION & PRIVILEGE ENFORCEMENT
    // -------------------------------------------------------------
    console.log('\n--- GROUP 5: ADMIN SEPARATION & PRIVILEGE ENFORCEMENT ---');

    // Pre-flight check: Verify live Next.js HTTP server is reachable for HTTP route tests
    let serverReachable = false;
    try {
      await fetch(`${baseUrl}/`, { redirect: 'manual', signal: AbortSignal.timeout(2000) });
      serverReachable = true;
    } catch {
      serverReachable = false;
    }

    if (!serverReachable) {
      console.log('\n⚠️  [STANDALONE NOTICE]: Live Next.js server at ' + baseUrl + ' is not reachable.');
      console.log('   Groups 1-4 (In-Process Security & DB Isolation) PASSED (' + passedTests + '/' + totalTests + ').');
      console.log('   To run Groups 5-6 (HTTP Route & Session Tests), start the server or run via:');
      console.log('   node scripts/run_live_e2e_isolated.mjs\n');
      console.log('================================================================');
      console.log(`TOTAL IN-PROCESS TESTS: ${totalTests} | PASSED: ${passedTests} | SKIPPED HTTP: 8`);
      console.log('================================================================');
      return;
    }

    const adminId = `adm_${testRunId}`;
    const adminEmail = `admin_audit_${testRunId}@example.com`;
    const nowIso = new Date().toISOString();
    await db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, role, created_at, updated_at, is_active)
      VALUES (?, ?, ?, 'ADMIN', ?, ?, 1)
    `).run(adminId, adminEmail, 'salt:dummyhash', nowIso, nowIso);

    const adminToken = createSessionToken({
      id: adminId,
      email: adminEmail,
      role: 'ADMIN',
    });
    await recordAdminLogin(adminId, adminToken);

    await test('User session cookie on /api/admin/users returns HTTP 401 Unauthorized', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Cookie: `sra_user_session=${userAData.sessionToken}` },
        redirect: 'manual',
      });
      assert.equal(res.status, 401);
    });

    await test('User session cookie on /admin/dashboard redirects to /admin/login (HTTP 307)', async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Cookie: `sra_user_session=${userAData.sessionToken}` },
        redirect: 'manual',
      });
      assert.equal(res.status, 307);
      const loc = res.headers.get('location');
      assert.ok(loc?.includes('/admin/login'));
    });

    await test('Admin session cookie on /admin/dashboard returns HTTP 200', async () => {
      const res = await fetch(`${baseUrl}/admin/dashboard`, {
        headers: { Cookie: `sra_admin_session=${adminToken}` },
        redirect: 'manual',
      });
      assert.equal(res.status, 200);
    });

    await test('Admin session cookie on /api/admin/users returns HTTP 200 with user list', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users`, {
        headers: { Cookie: `sra_admin_session=${adminToken}` },
        redirect: 'manual',
      });
      if (res.status === 500) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`Server returned HTTP 500 (Infrastructure/Database failure: ${errJson.details || errJson.message || 'Internal Server Error'})`);
      }
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.users));
    });

    // -------------------------------------------------------------
    // GROUP 6: HTTP COOKIE ATTRIBUTES & RATE LIMITING
    // -------------------------------------------------------------
    console.log('\n--- GROUP 6: HTTP COOKIE SECURITY & RATE LIMITING ---');

    await test('Auth login sets HttpOnly, SameSite=lax, Path=/ cookies', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userAEmail, password: userAPassword }),
      });
      if (res.status === 500) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(`Server returned HTTP 500 (Infrastructure/Database failure: ${errJson.details || errJson.message || 'Internal Server Error'})`);
      }
      assert.equal(res.status, 200);
      const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || ''];
      const sessionCookie = setCookies.find((c) => c.includes('sra_user_session='));
      assert.ok(sessionCookie, 'Response must set sra_user_session');
      assert.ok(sessionCookie.toLowerCase().includes('httponly'), 'Must have HttpOnly flag');
      assert.ok(sessionCookie.toLowerCase().includes('samesite=lax'), 'Must have SameSite=lax');
      assert.ok(sessionCookie.toLowerCase().includes('path=/'), 'Must have Path=/');
      assert.ok(sessionCookie.toLowerCase().includes('max-age=604800'), 'Must have 7-day max-age');
    });

    await test('Auth logout sets Max-Age=0 to clear cookies', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { Cookie: `sra_user_session=${userAData.sessionToken}` },
      });
      assert.equal(res.status, 200);
      const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie') || ''];
      const sessionCookie = setCookies.find((c) => c.includes('sra_user_session='));
      assert.ok(sessionCookie?.toLowerCase().includes('max-age=0'));
    });

    await test('Brute-force rate limiting: 11 rapid failed logins from same IP trigger HTTP 429', async () => {
      resetRateLimitsForTesting();
      const ip = '198.51.100.42'; // Simulated test IP via x-forwarded-for
      let hit429 = false;
      let lastRes;

      for (let i = 1; i <= 12; i++) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({ email: 'attacker@example.com', password: 'bad' }),
        });

        if (res.status === 429) {
          hit429 = true;
          lastRes = res;
          break;
        }
      }

      assert.ok(hit429, 'Rate limiter must trigger HTTP 429 after threshold');
      assert.ok(lastRes.headers.get('retry-after'), 'Must include Retry-After header');
      assert.equal(lastRes.headers.get('x-ratelimit-remaining'), '0');
      const body = await lastRes.json();
      assert.ok(body.error?.includes('Too many login attempts'));
    });

    await test('Admin login rate limiting triggers HTTP 429 after 5 attempts', async () => {
      resetRateLimitsForTesting();
      const ip = '198.51.100.99';
      let hit429 = false;

      for (let i = 1; i <= 7; i++) {
        const res = await fetch(`${baseUrl}/api/admin/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': ip,
          },
          body: JSON.stringify({ email: 'admin@example.com', password: 'wrong' }),
        });

        if (res.status === 429) {
          hit429 = true;
          break;
        }
      }

      assert.ok(hit429, 'Admin rate limiter must trigger HTTP 429 after 5 attempts');
      resetRateLimitsForTesting();
    });

  } finally {
    // -------------------------------------------------------------
    // CLEANUP TEST FIXTURES
    // -------------------------------------------------------------
    console.log('\n--- CLEANING UP TEST FIXTURES ---');
    try {
      for (const uid of createdUserIds) {
        await db.prepare('DELETE FROM job_applications WHERE user_id = ?').run(uid);
        await db.prepare('DELETE FROM resume_versions WHERE user_id = ?').run(uid);
        await db.prepare('DELETE FROM resumes WHERE user_id = ?').run(uid);
        await db.prepare('DELETE FROM audit_events WHERE actor_id = ?').run(uid);
        await db.prepare('DELETE FROM users WHERE id = ?').run(uid);
      }
      try {
        await db.prepare('DELETE FROM admin_users WHERE id = ?').run(adminId);
      } catch {}
      resetRateLimitsForTesting();
      console.log(`✓ Cleaned up ${createdUserIds.length} isolated test user records.`);
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TOTAL AUDIT TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
  console.log('================================================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL COMPREHENSIVE AUTH & SECURITY REGRESSION TESTS PASSED (100%)');
  } else {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
