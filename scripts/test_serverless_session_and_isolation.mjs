import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Initialize isolated SQLite sandbox to protect data/smart_resume.db
setupTestDb('serverless_session_isolation');

// Intercept server-only for standalone Node execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

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
console.log('⚡ SMART RESUME AI: DISTRIBUTED SERVERLESS AUTH & MULTI-USER ISOLATION');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`✓ PASS [${totalTests}]: ${desc}`);
      passedTests++;
    })
    .catch((err) => {
      console.error(`✗ FAIL [${totalTests}]: ${desc}`);
      console.error(err);
      process.exitCode = 1;
      throw err;
    });
}

async function runSuite() {
  // Import session verification tools
  const {
    verifySessionToken: verifySessionTokenEdge,
    getAdminSessionSecret,
    DEV_ONLY_FALLBACK_SECRET,
    CLOCK_SKEW_TOLERANCE_MS,
  } = await import('../src/lib/sessionAuth.ts');

  const {
    createSessionToken,
    verifyAdminToken,
    verifyAdminTokenAsync,
    registerUser,
    loginUser,
    logoutUser,
    getUserBySession,
    getUserById,
    saveUserResume,
    getUserResumes,
    getUserResume,
    deleteUserResume,
    saveResumeVersion,
    getResumeVersions,
    getResumeVersion,
    restoreResumeVersion,
    createJobApplication,
    getUserJobApplications,
    updateJobApplication,
    deleteJobApplication,
    upsertStudentProfile,
    getStudentProfile,
    getUserAssessments,
    deleteUserAndData,
    getAdminByEmail,
    recordAdminLogin,
    revokeAdminSession,
  } = await import('../src/server/db/index.ts');

  const secret = getAdminSessionSecret() || DEV_ONLY_FALLBACK_SECRET;
  assert.ok(secret && secret.length >= 32, 'Session secret must be valid with length >= 32');

  // ============================================================================
  // GROUP 1: SERVERLESS STATELESS TOKEN VERIFICATION (AUTH-01)
  // Simulates independent, disconnected serverless lambda instances
  // ============================================================================
  console.log('--- GROUP 1: DISTRIBUTED SERVERLESS TOKEN INTEROPERABILITY ---');

  // Helper simulating an independent Edge/SubtleCrypto lambda instance
  async function simulateEdgeLambdaVerification(token) {
    // Uses Web Crypto SubtleCrypto directly without server-side memory
    return await verifySessionTokenEdge(token);
  }

  // Helper simulating an independent Node.js lambda instance
  function simulateNodeLambdaVerification(token) {
    // Pure stateless HMAC-SHA256 verification using Node crypto
    if (!token || typeof token !== 'string') return null;
    const parts = token.trim().split('.');
    if (parts.length !== 2) return null;
    const [data, signature] = parts;
    if (!data || !signature) return null;

    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    const now = Date.now();
    if (payload.exp <= payload.iat || payload.iat > now + CLOCK_SKEW_TOLERANCE_MS || now > payload.exp) {
      return null;
    }
    return payload;
  }

  const testUserPayload = {
    sub: 'user_srvless_' + Date.now(),
    email: 'serverless_test@smartresume.ai',
    role: 'USER',
  };

  const testAdminPayload = {
    sub: 'admin_srvless_' + Date.now(),
    email: 'admin_serverless@smartresume.ai',
    role: 'ADMIN',
  };

  let userToken = '';
  let adminToken = '';

  await it('Instance A: Creates stateless HMAC user session token', async () => {
    userToken = createSessionToken(testUserPayload, '7d');
    assert.ok(userToken.includes('.'), 'User token contains data and signature parts');
  });

  await it('Instance A: Creates stateless HMAC admin session token', async () => {
    adminToken = createSessionToken(testAdminPayload, '24h');
    assert.ok(adminToken.includes('.'), 'Admin token contains data and signature parts');
  });

  await it('Instance B (Edge Runtime): Verifies user token across isolated cold-start', async () => {
    const verified = await simulateEdgeLambdaVerification(userToken);
    assert.ok(verified, 'Edge lambda verified token successfully');
    assert.equal(verified.sub, testUserPayload.sub);
    assert.equal(verified.email, testUserPayload.email);
    assert.equal(verified.role, 'USER');
  });

  await it('Instance C (Node Runtime): Verifies user token across separate lambda container', async () => {
    const verified = simulateNodeLambdaVerification(userToken);
    assert.ok(verified, 'Node lambda verified token successfully');
    assert.equal(verified.sub, testUserPayload.sub);
    assert.equal(verified.email, testUserPayload.email);
    assert.equal(verified.role, 'USER');
  });

  await it('Instance D (Stateless Edge Proxy Guard): Verifies admin token statelessly without DB dependency', async () => {
    const verifiedEdge = await simulateEdgeLambdaVerification(adminToken);
    assert.ok(verifiedEdge, 'Edge verified admin token statelessly');
    assert.equal(verifiedEdge.role, 'ADMIN');

    const verifiedNodeStateless = simulateNodeLambdaVerification(adminToken);
    assert.ok(verifiedNodeStateless, 'Node verified admin token statelessly');
    assert.equal(verifiedNodeStateless.role, 'ADMIN');
  });

  const testDbAdminId = `adm_srvless_${Date.now()}`;
  const testDbAdminEmail = `adm_srvless_${Date.now()}@smartresume.ai`;
  let dbAdminToken = '';

  await it('Instance E (Stateful Admin Guard): Verifies active admin token with revocation enforcement', async () => {
    const { getDb } = await import('../src/server/db/index.ts');
    const db = getDb();
    const nowIso = new Date().toISOString();

    if (!db.isPostgres) {
      db.prepare(`
        INSERT INTO admin_users (id, email, password_hash, role, created_at, updated_at, is_active)
        VALUES (?, ?, ?, 'ADMIN', ?, ?, 1)
      `).run(testDbAdminId, testDbAdminEmail, 'salt:fakehash', nowIso, nowIso);
    }

    dbAdminToken = createSessionToken({
      id: testDbAdminId,
      email: testDbAdminEmail,
      role: 'ADMIN',
    });

    await recordAdminLogin(testDbAdminId, dbAdminToken);

    const verified = verifyAdminToken(dbAdminToken);
    assert.ok(verified, 'Node verifyAdminToken accepted active admin');
    assert.equal(verified.sub, testDbAdminId);
    assert.equal(verified.role, 'ADMIN');

    const verifiedAsync = await verifyAdminTokenAsync(dbAdminToken);
    assert.ok(verifiedAsync, 'Node verifyAdminTokenAsync accepted active admin');
    assert.equal(verifiedAsync.sub, testDbAdminId);

    // Test Revocation: Once revoked, verifyAdminToken rejects immediately
    await revokeAdminSession(testDbAdminId);
    const rejectedAfterRevoke = verifyAdminToken(dbAdminToken);
    assert.equal(rejectedAfterRevoke, null, 'verifyAdminToken rejects revoked session token');
  });

  await it('Cross-Runtime Equivalence: Node-generated signature matches Edge-verified signature', async () => {
    const customPayload = {
      sub: 'usr_cross_check_99',
      email: 'cross@check.org',
      role: 'USER',
      iat: Date.now(),
      exp: Date.now() + 3600 * 1000,
    };
    const dataStr = Buffer.from(JSON.stringify(customPayload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
    const fullToken = `${dataStr}.${signature}`;

    const edgeResult = await simulateEdgeLambdaVerification(fullToken);
    assert.ok(edgeResult, 'Edge lambda accepted Node-created HMAC token');
    assert.equal(edgeResult.sub, 'usr_cross_check_99');
  });

  await it('Clock Drift Resilience: Token with +45s future timestamp is accepted (within 60s tolerance)', async () => {
    const driftPayload = {
      sub: 'usr_drift_ok',
      email: 'drift_ok@smartresume.ai',
      role: 'USER',
      iat: Date.now() + 45 * 1000, // 45 seconds ahead
      exp: Date.now() + 3600 * 1000,
    };
    const dataStr = Buffer.from(JSON.stringify(driftPayload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
    const driftToken = `${dataStr}.${signature}`;

    const verified = await simulateEdgeLambdaVerification(driftToken);
    assert.ok(verified, 'Token within clock skew tolerance was accepted');
  });

  await it('Clock Drift Protection: Token with +90s future timestamp is rejected (> 60s tolerance)', async () => {
    const badDriftPayload = {
      sub: 'usr_bad_drift',
      email: 'bad_drift@smartresume.ai',
      role: 'USER',
      iat: Date.now() + 90 * 1000, // 90 seconds ahead
      exp: Date.now() + 3600 * 1000,
    };
    const dataStr = Buffer.from(JSON.stringify(badDriftPayload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(dataStr).digest('base64url');
    const badDriftToken = `${dataStr}.${signature}`;

    const verified = await simulateEdgeLambdaVerification(badDriftToken);
    assert.equal(verified, null, 'Token exceeding clock skew tolerance was strictly rejected');
  });

  await it('Stateless Tamper Defense: 1-character payload tampering fails on all instances', async () => {
    const [data, sig] = userToken.split('.');
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    decoded.role = 'ADMIN'; // Tamper role
    const tamperedData = Buffer.from(JSON.stringify(decoded)).toString('base64url');
    const forgedToken = `${tamperedData}.${sig}`;

    const edgeResult = await simulateEdgeLambdaVerification(forgedToken);
    assert.equal(edgeResult, null, 'Edge lambda rejected forged payload');

    const nodeResult = simulateNodeLambdaVerification(forgedToken);
    assert.equal(nodeResult, null, 'Node lambda rejected forged payload');
  });

  // ============================================================================
  // GROUP 2: MULTI-USER ISOLATION & ROW-LEVEL SEPARATION (AUTH-02)
  // ============================================================================
  console.log('\n--- GROUP 2: COMPLETE MULTI-USER ROW-LEVEL DATA SEPARATION ---');

  const ts = Date.now();
  const userAlphaData = {
    email: `alpha_${ts}@university.edu`,
    password: `AlphaPass123!_${ts}`,
    name: 'Alpha Candidate',
  };
  const userBetaData = {
    email: `beta_${ts}@university.edu`,
    password: `BetaPass123!_${ts}`,
    name: 'Beta Candidate',
  };

  let userAlpha = null;
  let userBeta = null;
  let sessionAlpha = '';
  let sessionBeta = '';

  await it('Registers User Alpha and User Beta', async () => {
    const regAlpha = await registerUser(userAlphaData);
    assert.ok(regAlpha && regAlpha.user && regAlpha.user.id, 'User Alpha registered');
    userAlpha = regAlpha.user;

    const regBeta = await registerUser(userBetaData);
    assert.ok(regBeta && regBeta.user && regBeta.user.id, 'User Beta registered');
    userBeta = regBeta.user;
    assert.notEqual(userAlpha.id, userBeta.id, 'User IDs must be distinct');
  });

  await it('Logs in both users and issues independent session tokens', async () => {
    const loginAlpha = await loginUser({
      email: userAlphaData.email,
      password: userAlphaData.password,
    });
    assert.ok(loginAlpha && loginAlpha.sessionToken, 'Alpha login successful');
    sessionAlpha = loginAlpha.sessionToken;

    const loginBeta = await loginUser({
      email: userBetaData.email,
      password: userBetaData.password,
    });
    assert.ok(loginBeta && loginBeta.sessionToken, 'Beta login successful');
    sessionBeta = loginBeta.sessionToken;

    assert.notEqual(sessionAlpha, sessionBeta, 'Session tokens must be strictly different');
  });

  let resumeAlphaId = '';
  let versionAlphaId = '';
  let appIdAlpha = '';

  await it('User Alpha creates private resume, resume version, and job application', async () => {
    // 1. Resume
    const savedResume = await saveUserResume(userAlpha.id, {
      filename: 'Alpha_Confidential_Robotics.json',
      resumeData: {
        personalInfo: {
          fullName: 'Alpha Candidate',
          email: userAlphaData.email,
          phone: '+1-555-0101',
          location: 'Boston, MA',
        },
        targetRole: 'Robotics Engineer',
        education: [{ institution: 'MIT', degree: 'M.S. Robotics', year: '2025' }],
        skills: ['ROS2', 'C++', 'Control Theory'],
      },
    });
    assert.ok(savedResume && savedResume.id, 'Alpha resume saved');
    resumeAlphaId = savedResume.id;

    // 2. Resume Version
    const version = await saveResumeVersion(
      userAlpha.id,
      resumeAlphaId,
      savedResume.resume_data || savedResume,
      'Initial confidential DARPA submission'
    );
    assert.ok(version && version.id, 'Alpha resume version created');
    versionAlphaId = version.id;

    // 3. Job Application
    const app = await createJobApplication(userAlpha.id, {
      jobTitle: 'Autonomous Systems Lead',
      company: 'Boston Dynamics',
      location: 'Waltham, MA',
      status: 'applied',
      notes: "Alpha's secret interview referral code: BD-SEC-9912",
    });
    assert.ok(app && app.id, 'Alpha job application created');
    appIdAlpha = app.id;

    // 4. Student Profile
    await upsertStudentProfile(userAlpha.id, {
      institution: 'MIT Department of EECS',
      degree: 'Master of Science',
      fieldOfStudy: 'Robotics & Control Systems',
      graduationYear: 2025,
      targetRole: 'Autonomous Systems Engineer',
      projects: [
        {
          title: 'Project Cerebrum: Autonomous Quadruped',
          description: 'Classified locomotion experiments',
          techStack: ['C++', 'PyTorch', 'ROS2'],
        },
      ],
    });
  });

  await it('Isolation Check: User Beta cannot see User Alpha resumes in list', async () => {
    const betaResumes = await getUserResumes(userBeta.id);
    const leaked = betaResumes.find((r) => r.id === resumeAlphaId || r.title?.includes('Alpha'));
    assert.equal(leaked, undefined, 'Beta resume list must NOT contain any Alpha resumes');

    const singleResume = await getUserResume(userBeta.id, resumeAlphaId);
    assert.equal(singleResume, null, 'Beta querying Alpha resume directly returns null');
  });

  await it('Isolation Check: User Beta cannot access User Alpha resume versions', async () => {
    let versionAccessBlocked = false;
    try {
      await getResumeVersions(userBeta.id, resumeAlphaId);
    } catch (err) {
      versionAccessBlocked = /Forbidden/i.test(err.message);
    }
    assert.ok(versionAccessBlocked, 'Beta must be forbidden from accessing Alpha resume versions');

    let singleVersionBlocked = false;
    try {
      await getResumeVersion(userBeta.id, versionAlphaId);
    } catch (err) {
      singleVersionBlocked = /Forbidden/i.test(err.message);
    }
    assert.ok(singleVersionBlocked, 'Beta must be forbidden from querying Alpha single version');
  });

  await it('Isolation Check: User Beta cannot restore or overwrite User Alpha resume version', async () => {
    let restoreBlocked = false;
    try {
      await restoreResumeVersion(userBeta.id, versionAlphaId);
    } catch (err) {
      restoreBlocked = /Forbidden/i.test(err.message);
    }
    assert.ok(restoreBlocked, 'Beta must be forbidden from restoring Alpha resume version');
  });

  await it('Isolation Check: User Beta cannot see User Alpha job applications', async () => {
    const betaApps = await getUserJobApplications(userBeta.id);
    const leaked = betaApps.find((a) => a.id === appIdAlpha || a.company === 'Boston Dynamics');
    assert.equal(leaked, undefined, 'Beta applications list must NOT leak Alpha application');
  });

  await it('Isolation Check: User Beta cannot modify or tamper with User Alpha job application', async () => {
    let updateBlocked = false;
    try {
      await updateJobApplication(userBeta.id, appIdAlpha, {
        status: 'rejected',
        notes: 'Tampered by Beta!',
      });
    } catch (err) {
      updateBlocked = /unauthorized|not found/i.test(err.message);
    }
    assert.ok(updateBlocked, 'Beta must be blocked from updating Alpha job application');

    // Confirm Alpha application remains intact
    const alphaApps = await getUserJobApplications(userAlpha.id);
    const intact = alphaApps.find((a) => a.id === appIdAlpha);
    assert.ok(intact, 'Alpha application exists');
    assert.equal(intact.status, 'applied');
    assert.ok(intact.notes.includes('BD-SEC-9912'), 'Alpha confidential notes intact');
  });

  await it('Isolation Check: User Beta cannot delete User Alpha job application', async () => {
    const deleteAttempt = await deleteJobApplication(userBeta.id, appIdAlpha);
    assert.equal(deleteAttempt, false, 'Beta delete attempt of Alpha application returns false');

    // Confirm Alpha application is still present
    const alphaApps = await getUserJobApplications(userAlpha.id);
    const intact = alphaApps.find((a) => a.id === appIdAlpha);
    assert.ok(intact, 'Alpha application was not deleted');
  });

  await it('Isolation Check: User Beta cannot read User Alpha student profile', async () => {
    const betaProfile = await getStudentProfile(userBeta.id);
    if (betaProfile) {
      assert.notEqual(betaProfile.institution, 'MIT Department of EECS');
      assert.notEqual(betaProfile.projects?.[0]?.title, 'Project Cerebrum: Autonomous Quadruped');
    }
  });

  await it('Isolation Check: User Beta cannot read User Alpha assessment results', async () => {
    const betaAssessments = await getUserAssessments(userBeta.id);
    assert.equal(betaAssessments.length, 0, 'Beta assessment list must be empty or contain only Beta assessments');
  });

  await it('Privilege Boundary: User Alpha token is rejected by admin verifiers', async () => {
    const adminCheck = verifyAdminToken(sessionAlpha);
    assert.equal(adminCheck, null, 'verifyAdminToken strictly rejects standard user token');

    const adminCheckAsync = await verifyAdminTokenAsync(sessionAlpha);
    assert.equal(adminCheckAsync, null, 'verifyAdminTokenAsync strictly rejects standard user token');
  });

  // ============================================================================
  // GROUP 3: CLEANUP FIXTURES
  // ============================================================================
  console.log('\n--- GROUP 3: ISOLATED FIXTURE TEARDOWN ---');

  await it('Safely tears down isolated test user records', async () => {
    const adminActor = { id: 'admin_sys_teardown', email: 'admin@smartresume.ai' };
    if (userAlpha?.id) {
      await deleteUserAndData(userAlpha.id, adminActor);
    }
    if (userBeta?.id) {
      await deleteUserAndData(userBeta.id, adminActor);
    }
    try {
      const { getDb } = await import('../src/server/db/index.ts');
      const db = getDb();
      if (!db.isPostgres) {
        db.prepare('DELETE FROM admin_users WHERE id = ?').run(testDbAdminId);
      }
    } catch {
      // ignore teardown error
    }
  });

  console.log('\n================================================================');
  console.log(`TOTAL SERVERLESS & ISOLATION TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: 0`);
  console.log('================================================================');
  console.log('🎉 ALL DISTRIBUTED SERVERLESS AUTH & MULTI-USER ISOLATION TESTS PASSED (100%)');
}

runSuite().catch((err) => {
  console.error('Fatal Test Execution Error:', err);
  process.exit(1);
});
