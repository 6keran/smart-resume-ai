import assert from 'node:assert';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log('================================================================');
console.log('🛡️  SMART RESUME AI: DEEP SECURITY, ISOLATION & INTEGRITY AUDIT');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] Security Test ${passed}: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}:`, error);
}

const randIp = () => `198.51.100.${Math.floor(Math.random() * 240) + 10}`;

async function runSecurityAudit() {
  const ts = Date.now();

  // --------------------------------------------------------------------------
  // TEST GROUP 1: Fail-Closed Unauthenticated Access (HTTP 401)
  // --------------------------------------------------------------------------
  console.log('--- Test Group 1: Fail-Closed Unauthenticated Access Control ---');
  try {
    const unauthProfileGet = await fetch(`${BASE_URL}/api/student/profile`);
    assert.strictEqual(unauthProfileGet.status, 401, 'GET /api/student/profile rejects unauthenticated request with 401');

    const unauthProfilePut = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ institution: 'Hacker College', degree: 'B.S.', fieldOfStudy: 'Exploits', graduationYear: 2026 }),
    });
    assert.strictEqual(unauthProfilePut.status, 401, 'PUT /api/student/profile rejects unauthenticated request with 401');

    const unauthAppsGet = await fetch(`${BASE_URL}/api/user/applications`);
    assert.strictEqual(unauthAppsGet.status, 401, 'GET /api/user/applications rejects unauthenticated request with 401');

    const unauthAppsPost = await fetch(`${BASE_URL}/api/user/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobTitle: 'SDE', company: 'Google' }),
    });
    assert.strictEqual(unauthAppsPost.status, 401, 'POST /api/user/applications rejects unauthenticated request with 401');

    const unauthResumesGet = await fetch(`${BASE_URL}/api/user/resumes`);
    assert.strictEqual(unauthResumesGet.status, 401, 'GET /api/user/resumes rejects unauthenticated request with 401');

    const unauthProctorFrame = await fetch(`${BASE_URL}/api/proctoring/frame`);
    assert.strictEqual(unauthProctorFrame.status, 401, 'GET /api/proctoring/frame rejects unauthenticated/non-admin request with 401');

    pass('Unauthenticated Access Control', 'All 6 protected student endpoints fail-closed with HTTP 401');
  } catch (err) {
    fail('Test Group 1: Fail-Closed Access Control', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 2: Register Two Separate Student Accounts & Issue Sessions
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 2: Account Creation & Isolation Fixture Setup ---');
  const studentA = {
    email: `sec_student_a_${ts}@test.com`,
    password: `P@ssword123!_${ts}`,
    confirmPassword: `P@ssword123!_${ts}`,
    fullName: 'Student Alice',
  };
  const studentB = {
    email: `sec_student_b_${ts}@test.com`,
    password: `P@ssword123!_${ts}`,
    confirmPassword: `P@ssword123!_${ts}`,
    fullName: 'Student Bob',
  };

  let cookieA = '';
  let cookieB = '';

  try {
    const regResA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp() },
      body: JSON.stringify(studentA),
    });
    const regDataA = await regResA.json();
    assert.ok(regResA.status === 200 || regResA.status === 201, `Student A registered: ${regDataA.message || ''}`);
    const cookieHeaderA = regResA.headers.get('set-cookie');
    cookieA = cookieHeaderA ? cookieHeaderA.split(';')[0] : `sra_user_session=${regDataA.sessionToken}`;

    const regResB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp() },
      body: JSON.stringify(studentB),
    });
    const regDataB = await regResB.json();
    assert.ok(regResB.status === 200 || regResB.status === 201, `Student B registered: ${regDataB.message || ''}`);
    const cookieHeaderB = regResB.headers.get('set-cookie');
    cookieB = cookieHeaderB ? cookieHeaderB.split(';')[0] : `sra_user_session=${regDataB.sessionToken}`;

    pass('Isolated Test Accounts Created', `Student A (${studentA.fullName}) and Student B (${studentB.fullName}) verified`);
  } catch (err) {
    fail('Test Group 2: Test Account Setup', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 3: Input Validation & Bounds Enforcement (HTTP 400)
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Input Validation & Boundary Enforcement ---');
  try {
    // 1. Missing institution
    const missingInst = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie: cookieA },
      body: JSON.stringify({ institution: '', degree: 'B.S.', fieldOfStudy: 'CS', graduationYear: 2026 }),
    });
    assert.strictEqual(missingInst.status, 400, 'Rejects empty institution with 400');

    // 2. Out-of-bounds graduation year (e.g. 1850 or 2200)
    const badYearPast = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie: cookieA },
      body: JSON.stringify({ institution: 'Valid Univ', degree: 'B.S.', fieldOfStudy: 'CS', graduationYear: 1850 }),
    });
    assert.strictEqual(badYearPast.status, 400, 'Rejects graduation year before 1990 with 400');

    const badYearFuture = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie: cookieA },
      body: JSON.stringify({ institution: 'Valid Univ', degree: 'B.S.', fieldOfStudy: 'CS', graduationYear: 2200 }),
    });
    assert.strictEqual(badYearFuture.status, 400, 'Rejects graduation year too far in future with 400');

    // 3. Application missing company
    const missingCompany = await fetch(`${BASE_URL}/api/user/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: cookieA },
      body: JSON.stringify({ jobTitle: 'SDE Intern', company: '' }),
    });
    assert.strictEqual(missingCompany.status, 400, 'Rejects job application missing company name with 400');

    pass('Input Validation & Boundary Guarding', 'Enforced required strings, year bounds (1990 - current+10), and mandatory application fields');
  } catch (err) {
    fail('Test Group 3: Input Validation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 4: Cross-User Profile Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 4: Cross-User Profile Data Isolation ---');
  try {
    // Student A saves profile
    const saveResA = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie: cookieA },
      body: JSON.stringify({
        institution: 'Alice Academy of Technology',
        degree: 'B.S. in Software Systems',
        fieldOfStudy: 'Distributed Systems',
        graduationYear: 2026,
        targetRole: 'Distributed Systems Engineer',
        projects: [
          {
            title: "Alice's Secret Research Project",
            description: 'Proprietary consensus protocol implementation.',
            techStack: ['Rust', 'Raft'],
          },
        ],
      }),
    });
    assert.strictEqual(saveResA.status, 200, 'Student A successfully saved profile');

    // Student B requests profile: MUST NOT see Student A's university or confidential project
    const getResB = await fetch(`${BASE_URL}/api/student/profile`, {
      headers: { cookie: cookieB },
    });
    assert.strictEqual(getResB.status, 200, 'Student B can fetch their own profile');
    const dataB = await getResB.json();
    assert.notStrictEqual(dataB.profile?.institution, 'Alice Academy of Technology', 'Student B cannot read Student A institution');
    assert.notStrictEqual(dataB.profile?.projects?.[0]?.title, "Alice's Secret Research Project", 'Student B cannot read Student A projects');

    pass('Cross-User Profile Isolation', 'Student B completely isolated from Student A profile and capstone data');
  } catch (err) {
    fail('Test Group 4: Profile Isolation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 5: Cross-User Job Application Isolation & Tamper Protection
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 5: Job Application Ownership & Cross-User Tamper Protection ---');
  try {
    // Student A creates an application
    const appResA = await fetch(`${BASE_URL}/api/user/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: cookieA },
      body: JSON.stringify({
        jobTitle: 'Core Systems Intern',
        company: 'Stripe',
        location: 'San Francisco, CA',
        status: 'applied',
        notes: "Alice's interview notes: confidential referral code REF-99482",
      }),
    });
    const appDataA = await appResA.json();
    assert.strictEqual(appResA.status, 200, 'Student A created application');
    const appIdA = appDataA.application.id;
    assert.ok(appIdA, 'Application ID returned');

    // Student B fetches their own applications: must NOT contain Student A's application
    const getAppsB = await fetch(`${BASE_URL}/api/user/applications`, {
      headers: { cookie: cookieB },
    });
    const dataAppsB = await getAppsB.json();
    const leakedApp = (dataAppsB.applications || []).find((a) => a.id === appIdA);
    assert.strictEqual(leakedApp, undefined, "Student A's application not visible in Student B application list");

    // Student B attempts to modify Student A's application (tamper attempt)
    const tamperRes = await fetch(`${BASE_URL}/api/user/applications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', cookie: cookieB },
      body: JSON.stringify({
        id: appIdA,
        status: 'rejected',
        notes: 'Tampered by Bob!',
      }),
    });
    // Expected: Student A's application was not altered
    const getAppsA = await fetch(`${BASE_URL}/api/user/applications`, {
      headers: { cookie: cookieA },
    });
    const dataAppsA = await getAppsA.json();
    const appAAfterTamper = dataAppsA.applications.find((a) => a.id === appIdA);
    assert.strictEqual(appAAfterTamper.status, 'applied', "Student A's application status was not altered by Student B");
    assert.strictEqual(appAAfterTamper.notes.includes('Tampered'), false, "Student A's application notes were not overwritten");

    // Student B attempts to delete Student A's application
    const deleteRes = await fetch(`${BASE_URL}/api/user/applications?id=${appIdA}`, {
      method: 'DELETE',
      headers: { cookie: cookieB },
    });
    // Verify Student A's application still exists
    const checkStillExists = await fetch(`${BASE_URL}/api/user/applications`, {
      headers: { cookie: cookieA },
    });
    const dataStillExists = await checkStillExists.json();
    const appStillThere = dataStillExists.applications.find((a) => a.id === appIdA);
    assert.ok(appStillThere, "Student A's application was NOT deleted by unauthorized Student B");

    pass('Application Isolation & Tamper Protection', 'Student B cannot list, mutate status, alter notes, or delete Student A applications');
  } catch (err) {
    fail('Test Group 5: Application Isolation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 6: Proctoring Session Ownership & Hijack Prevention
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 6: Proctoring Session Ownership & Hijack Protection ---');
  try {
    const assessmentSessionId = `assess_sec_${ts}`;

    // Student A initializes a proctoring session
    const createSessionA = await fetch(`${BASE_URL}/api/proctoring/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: cookieA },
      body: JSON.stringify({
        assessmentId: assessmentSessionId,
        skill: 'Systems Engineering',
        candidateName: studentA.fullName,
        candidateEmail: studentA.email,
        status: 'in_progress',
        cameraStatus: 'granted',
      }),
    });
    assert.strictEqual(createSessionA.status, 200, 'Student A started proctoring session');

    // Student B attempts to send camera frames for Student A's assessment session
    const hijackFrameB = await fetch(`${BASE_URL}/api/proctoring/frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: cookieB },
      body: JSON.stringify({
        assessmentId: assessmentSessionId,
        frame: 'data:image/jpeg;base64,/9j/fakeImpersonatedFrameData==',
      }),
    });
    assert.strictEqual(hijackFrameB.status, 403, 'Student B blocked with HTTP 403 Forbidden when injecting frames into Student A proctoring session');

    pass('Proctoring Session Hijack Prevention', 'HTTP 403 Forbidden strictly prevents candidate B from submitting frames to candidate A assessment');
  } catch (err) {
    fail('Test Group 6: Proctoring Session Protection', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST GROUP 7: SQL Injection & Parameterized Query Resilience
  // --------------------------------------------------------------------------
  console.log('\n--- Test Group 7: SQL Injection & Malicious Payload Resilience ---');
  try {
    const maliciousPayloads = [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "admin'--",
      "\" OR \"\"=\"",
    ];

    for (const payload of maliciousPayloads) {
      const res = await fetch(`${BASE_URL}/api/jobs/search?q=${encodeURIComponent(payload)}&location=${encodeURIComponent(payload)}`, {
        headers: { cookie: cookieA },
      });
      assert.strictEqual(res.status, 200, `Search endpoint handles payload without SQL crash: ${payload}`);
      const data = await res.json();
      assert.ok(Array.isArray(data.jobs), 'Gracefully handled search query returning safe array');
    }

    pass('SQL Injection Resilience', 'Tested 4 classic injection patterns across search query params with zero server faults');
  } catch (err) {
    fail('Test Group 7: SQL Injection Resilience', err);
    throw err;
  }

  console.log('\n================================================================');
  console.log(`TOTAL SECURITY AUDIT TESTS: 7 | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

runSecurityAudit().catch((err) => {
  console.error('Fatal Security Audit Error:', err);
  process.exit(1);
});
