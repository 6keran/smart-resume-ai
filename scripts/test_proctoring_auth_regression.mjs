import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

// Load environment variables
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

const secret = process.env.ADMIN_SESSION_SECRET || 'smart_resume_ai_super_secret_admin_jwt_key_2026_dev_fallback';
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

function makeToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

const adminToken = makeToken({
  sub: 'admin_test_01',
  email: 'admin@smartresume.ai',
  role: 'ADMIN',
  iat: Date.now(),
  exp: Date.now() + 3600000,
});

async function registerCandidate(name, email) {
  const res = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: name,
      email,
      password: 'Password123!',
      confirmPassword: 'Password123!',
    }),
  });
  if (res.status !== 200) {
    const txt = await res.text();
    throw new Error(`Candidate registration failed: HTTP ${res.status} ${txt}`);
  }
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/sra_user_session=([^;]+)/);
  if (!match) throw new Error('Failed to extract sra_user_session cookie');
  const data = await res.json();
  return { token: match[1], user: data.user };
}

let candidateAToken = '';
let candidateBToken = '';
let candidateAUser = null;
let candidateBUser = null;

async function run() {
  console.log('Registering test candidates...');
  const ts = Date.now();
  const candA = await registerCandidate('Alice Candidate', `alice_test_${ts}@example.com`);
  candidateAToken = candA.token;
  candidateAUser = candA.user;

  const candB = await registerCandidate('Bob Candidate', `bob_test_${ts}@example.com`);
  candidateBToken = candB.token;
  candidateBUser = candB.user;

  console.log('================================================================');
  console.log('PROCTORING AUTHORIZATION & OWNERSHIP REGRESSION TEST SUITE');
  console.log('================================================================\n');

  const testAssessmentId = `asm_reg_${Date.now()}`;
  let passed = 0;

  async function check(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // 1. Unauthenticated checks
  await check('1. Unauthenticated GET /api/proctoring/session returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/session?assessmentId=${testAssessmentId}`);
    assert.equal(res.status, 401);
  });

  await check('2. Unauthenticated POST /api/proctoring/session returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: testAssessmentId, skill: 'React' }),
    });
    assert.equal(res.status, 401);
  });

  await check('3. Unauthenticated POST /api/proctoring/frame returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: testAssessmentId, frame: 'data:image/jpeg;base64,123' }),
    });
    assert.equal(res.status, 401);
  });

  await check('4. Unauthenticated POST /api/proctoring/heartbeat returns 401', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assessmentId: testAssessmentId, status: 'in_progress' }),
    });
    assert.equal(res.status, 401);
  });

  // 2. Candidate A creates their assessment session
  await check('5. Authorized Candidate A creates proctoring session (returns 200)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sra_user_session=${candidateAToken}`,
      },
      body: JSON.stringify({
        assessmentId: testAssessmentId,
        skill: 'TypeScript',
        status: 'in_progress',
        cameraStatus: 'active',
        consentGiven: true,
        candidateName: 'Alice Candidate',
        candidateEmail: 'alice@example.com',
      }),
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  // 3. Candidate A posts frame
  await check('6. Authorized Candidate A posts stream frame (returns 200)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sra_user_session=${candidateAToken}`,
      },
      body: JSON.stringify({
        assessmentId: testAssessmentId,
        frame: 'data:image/jpeg;base64,testframealice',
      }),
    });
    assert.equal(res.status, 200);
  });

  // 4. Candidate A reads their own session
  await check('7. Authorized Candidate A reads own session detail (returns 200)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/session?assessmentId=${testAssessmentId}`, {
      headers: { 'Cookie': `sra_user_session=${candidateAToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.assessment_id, testAssessmentId);
    assert.equal(data.candidate_name, 'Alice Candidate');
  });

  // 5. Non-owner Candidate B checks (Cross-tenant boundary / IDOR)
  await check('8. Non-owner Candidate B is BLOCKED from reading Candidate A session (returns 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/session?assessmentId=${testAssessmentId}`, {
      headers: { 'Cookie': `sra_user_session=${candidateBToken}` },
    });
    assert.equal(res.status, 403);
  });

  await check('9. Non-owner Candidate B is BLOCKED from posting frames to Candidate A session (returns 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/frame`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sra_user_session=${candidateBToken}`,
      },
      body: JSON.stringify({
        assessmentId: testAssessmentId,
        frame: 'data:image/jpeg;base64,spoofedframebybob',
      }),
    });
    assert.equal(res.status, 403);
  });

  await check('10. Non-owner Candidate B is BLOCKED from sending heartbeats to Candidate A session (returns 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sra_user_session=${candidateBToken}`,
      },
      body: JSON.stringify({
        assessmentId: testAssessmentId,
        status: 'completed',
      }),
    });
    assert.equal(res.status, 403);
  });

  await check('11. Non-owner Candidate B is BLOCKED from sending WebRTC signal to Candidate A session (returns 403)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/signal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sra_user_session=${candidateBToken}`,
      },
      body: JSON.stringify({
        assessmentId: testAssessmentId,
        sender: 'candidate',
        type: 'offer',
        data: { sdp: 'fake' },
      }),
    });
    assert.equal(res.status, 403);
  });

  // 6. Authorized Admin checks
  await check('12. Authorized Admin can inspect Candidate A session (returns 200)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/session?assessmentId=${testAssessmentId}`, {
      headers: { 'Cookie': `sra_admin_session=${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.assessment_id, testAssessmentId);
  });

  await check('13. Authorized Admin can view Candidate A live video frame (returns 200)', async () => {
    const res = await fetch(`${BASE_URL}/api/proctoring/frame?assessmentId=${testAssessmentId}`, {
      headers: { 'Cookie': `sra_admin_session=${adminToken}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.active, true);
    assert.equal(data.frame, 'data:image/jpeg;base64,testframealice');
  });

  console.log(`\n================================================================`);
  console.log(`SUCCESS: All ${passed}/${passed} proctoring authorization checks passed!`);
  console.log(`================================================================`);
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
