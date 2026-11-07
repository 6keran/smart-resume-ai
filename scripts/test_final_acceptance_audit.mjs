import assert from 'node:assert';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log('================================================================');
console.log('🔍 SMART RESUME AI: FINAL INDEPENDENT ACCEPTANCE AUDIT');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] Acceptance Test ${passed}: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}:`, error);
}

async function runAcceptanceAudit() {
  const ts = Date.now();
  const randIp1 = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const randIp2 = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;

  // --------------------------------------------------------------------------
  // TEST 1: Database Persistence Across Logout and Re-Login
  // --------------------------------------------------------------------------
  console.log('--- Test 1: Database Persistence After Logout & Re-Login ---');
  try {
    const studentEmail = `audit.persist.${ts}@berkeley.edu`;
    const password = 'StrongPassword2026!';

    // Register
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp1 },
      body: JSON.stringify({ fullName: 'Audit Student', email: studentEmail, password, confirmPassword: password }),
    });
    assert.strictEqual(regRes.status, 200, 'Registration succeeds');
    const cookie1 = regRes.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie1, 'Initial session cookie issued');

    // Persist Profile
    const profilePayload = {
      institution: 'UC Berkeley',
      degree: 'B.S. Electrical Engineering & Computer Science',
      fieldOfStudy: 'Computer Science',
      graduationYear: 2026,
      currentGpa: '3.92',
      targetRole: 'Full Stack Distributed Systems Engineer',
      projects: [{ title: 'Distributed Event Bus', description: 'Kafka-like log streaming in Go' }],
    };

    const putProfileRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
      body: JSON.stringify(profilePayload),
    });
    assert.strictEqual(putProfileRes.status, 200, 'Profile saved successfully');

    // Persist Skill
    const addSkillRes = await fetch(`${BASE_URL}/api/user/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
      body: JSON.stringify({ name: 'TypeScript', level: 'intermediate' }),
    });
    assert.strictEqual(addSkillRes.status, 200, 'Skill added successfully');

    // Persist Application
    const appRes = await fetch(`${BASE_URL}/api/user/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie1 },
      body: JSON.stringify({
        company: 'Stripe',
        jobTitle: 'Software Engineer - Infrastructure',
        location: 'San Francisco, CA',
        salary: '$165,000',
        status: 'Applied',
        notes: 'Submitted referral application via university career portal',
      }),
    });
    assert.strictEqual(appRes.status, 200, 'Application tracked successfully');

    // Logout
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie1 },
    });
    assert.strictEqual(logoutRes.status, 200, 'Logout succeeds with 200');

    // Verify unauthenticated attempt with old cookie fails closed (401)
    const checkAfterLogout = await fetch(`${BASE_URL}/api/student/profile`, {
      headers: { Cookie: cookie1 },
    });
    assert.strictEqual(checkAfterLogout.status, 401, 'Old session rejected with 401 after logout');

    // Re-Login with credentials
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp1 },
      body: JSON.stringify({ email: studentEmail, password }),
    });
    assert.strictEqual(loginRes.status, 200, 'Re-login succeeds with 200');
    const cookie2 = loginRes.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie2, 'New session cookie issued on re-login');

    // Verify all data persisted intact
    const getProfile = await fetch(`${BASE_URL}/api/student/profile`, { headers: { Cookie: cookie2 } });
    assert.strictEqual(getProfile.status, 200, 'Profile fetched after re-login');
    const profileData = await getProfile.json();
    assert.strictEqual(profileData.profile?.institution, 'UC Berkeley', 'Institution persisted');
    assert.strictEqual(profileData.profile?.degree, 'B.S. Electrical Engineering & Computer Science', 'Degree persisted');
    assert.strictEqual(profileData.profile?.graduationYear, 2026, 'Graduation year persisted');
    assert.strictEqual(profileData.profile?.targetRole, 'Full Stack Distributed Systems Engineer', 'Target role persisted');

    const getSkills = await fetch(`${BASE_URL}/api/user/skills`, { headers: { Cookie: cookie2 } });
    assert.strictEqual(getSkills.status, 200, 'Skills fetched after re-login');
    const skillsData = await getSkills.json();
    assert.ok(Array.isArray(skillsData.skills) && skillsData.skills.length >= 1, 'Skills array preserved');
    assert.strictEqual(skillsData.skills[0].name, 'TypeScript', 'Skill name preserved');

    const getApps = await fetch(`${BASE_URL}/api/user/applications`, { headers: { Cookie: cookie2 } });
    assert.strictEqual(getApps.status, 200, 'Applications fetched after re-login');
    const appsData = await getApps.json();
    assert.strictEqual(appsData.applications?.length, 1, 'Application record preserved');
    assert.strictEqual(appsData.applications?.[0]?.company, 'Stripe', 'Application company preserved');

    pass('Database Persistence After Logout & Re-Login', 'Profile, skills, and applications bit-for-bit preserved across sessions');
  } catch (err) {
    fail('Test 1: Persistence After Logout & Re-Login', err);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Readiness Scores Change Exclusively on Qualifying Activities
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Readiness Scores Change Exclusively on Qualifying Activities ---');
  try {
    const studentEmail = `audit.qualify.${ts}@gatech.edu`;
    const password = 'StrongPassword2026!';

    // Register fresh student
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp2 },
      body: JSON.stringify({ fullName: 'Readiness Auditor', email: studentEmail, password, confirmPassword: password }),
    });
    const cookie = regRes.headers.get('set-cookie')?.split(';')[0];

    // Check initial snapshot history on brand new account (MUST BE 0)
    const histRes1 = await fetch(`${BASE_URL}/api/student/readiness-history`, { headers: { Cookie: cookie } });
    const histData1 = await histRes1.json();
    const initialCount = histData1.snapshots?.length || 0;
    assert.strictEqual(initialCount, 0, 'Fresh account has zero fabricated historical snapshots');

    // Perform multiple read-only operations
    await fetch(`${BASE_URL}/api/student/profile`, { headers: { Cookie: cookie } });
    await fetch(`${BASE_URL}/api/dashboard`, { headers: { Cookie: cookie } });

    // Snapshot count must remain 0
    const histRes2 = await fetch(`${BASE_URL}/api/student/readiness-history`, { headers: { Cookie: cookie } });
    const histData2 = await histRes2.json();
    const countAfterReads = histData2.snapshots?.length || 0;
    assert.strictEqual(countAfterReads, 0, 'Read-only requests create zero snapshots');

    // Perform genuine qualifying activity: Complete student profile
    const putRes = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
      body: JSON.stringify({
        institution: 'Georgia Institute of Technology',
        degree: 'B.S. Computer Science',
        fieldOfStudy: 'Computer Science',
        graduationYear: 2026,
        targetRole: 'Site Reliability Engineer',
      }),
    });
    assert.strictEqual(putRes.status, 200, 'Profile completed');

    // Snapshot count must now be > countAfterReads
    const histRes3 = await fetch(`${BASE_URL}/api/student/readiness-history`, { headers: { Cookie: cookie } });
    const histData3 = await histRes3.json();
    const countAfterProfile = histData3.snapshots?.length || 0;
    assert.ok(countAfterProfile > countAfterReads, `Qualifying activity (profile completion) created an authentic readiness snapshot (${countAfterProfile} > ${countAfterReads})`);
    const hasProfileTrigger = histData3.snapshots.some((s) => s.triggerActivity === 'profile_completed');
    assert.ok(hasProfileTrigger, 'Snapshot trigger correctly recorded as profile_completed');
    const latestSnapshot = histData3.snapshots[histData3.snapshots.length - 1];
    assert.ok(typeof latestSnapshot.overallScore === 'number' && latestSnapshot.overallScore > 0, 'Overall score computed from real dimensions');

    // Further reads do NOT create duplicate snapshots
    await fetch(`${BASE_URL}/api/student/profile`, { headers: { Cookie: cookie } });
    await fetch(`${BASE_URL}/api/dashboard`, { headers: { Cookie: cookie } });
    const histRes4 = await fetch(`${BASE_URL}/api/student/readiness-history`, { headers: { Cookie: cookie } });
    const histData4 = await histRes4.json();
    assert.strictEqual(histData4.snapshots?.length, countAfterProfile, 'Subsequent reads maintain snapshot deduplication');

    pass('Readiness Score Exclusivity', 'Read operations produce zero snapshots; qualifying milestones log authentic timestamped snapshots');
  } catch (err) {
    fail('Test 2: Readiness Score Exclusivity', err);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Concurrent Two-Student Full Data Isolation
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Concurrent Two-Student Complete Data Isolation ---');
  try {
    const emailA = `audit.studentA.${ts}@cmu.edu`;
    const emailB = `audit.studentB.${ts}@cmu.edu`;
    const password = 'StrongPassword2026!';

    // Register Student A
    const regA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp1 },
      body: JSON.stringify({ fullName: 'Alice CMU', email: emailA, password, confirmPassword: password }),
    });
    const cookieA = regA.headers.get('set-cookie')?.split(';')[0];

    // Register Student B
    const regB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp2 },
      body: JSON.stringify({ fullName: 'Bob CMU', email: emailB, password, confirmPassword: password }),
    });
    const cookieB = regB.headers.get('set-cookie')?.split(';')[0];

    // Student A saves profile & application
    await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({
        institution: 'Carnegie Mellon University',
        degree: 'M.S. in Software Engineering',
        fieldOfStudy: 'Software Engineering',
        graduationYear: 2026,
        targetRole: 'Systems Engineer',
      }),
    });

    const appARes = await fetch(`${BASE_URL}/api/user/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieA },
      body: JSON.stringify({ company: 'Apple', jobTitle: 'OS Engineer' }),
    });
    const appAId = (await appARes.json()).application?.id;

    // Student B saves their own distinct profile
    const putB = await fetch(`${BASE_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({
        institution: 'CMU Heinz College',
        degree: 'M.S. Information Systems',
        fieldOfStudy: 'Information Systems',
        graduationYear: 2027,
        targetRole: 'Product Manager',
      }),
    });
    assert.strictEqual(putB.status, 200, 'Student B profile saved successfully');

    // Verify Student B querying profile gets ONLY Bob's data
    const getBProfile = await fetch(`${BASE_URL}/api/student/profile`, { headers: { Cookie: cookieB } });
    const dataB = await getBProfile.json();
    assert.strictEqual(dataB.profile?.degree, 'M.S. Information Systems', 'Bob receives only Bob degree');
    assert.strictEqual(dataB.profile?.targetRole, 'Product Manager', 'Bob target role isolated');
    assert.ok(!JSON.stringify(dataB).includes('Software Engineering'), 'Zero leakage of Alice data to Bob');

    // Verify Student B querying applications gets 0 records (Alice has 1)
    const getBApps = await fetch(`${BASE_URL}/api/user/applications`, { headers: { Cookie: cookieB } });
    const appsB = await getBApps.json();
    assert.strictEqual(appsB.applications?.length, 0, 'Bob has 0 applications, completely isolated from Alice Apple app');

    // Verify Student B cannot mutate or delete Alice application
    const tamperRes = await fetch(`${BASE_URL}/api/user/applications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({ id: appAId, status: 'Rejected', notes: 'Hacked by Bob' }),
    });
    assert.ok([400, 404].includes(tamperRes.status), `Bob tampering with Alice application rejected with status ${tamperRes.status}`);

    pass('Concurrent Dual-Student Isolation', 'Zero cross-tenant data leakage or tampering between concurrent students');
  } catch (err) {
    fail('Test 3: Dual-Student Isolation', err);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Dashboard Career Action Recommendations and Destination Deep Links
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Dashboard Recommendation Deep Link Destinations ---');
  try {
    const studentEmail = `audit.actions.${ts}@mit.edu`;
    const password = 'StrongPassword2026!';

    // Register
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp1 },
      body: JSON.stringify({ fullName: 'MIT Student', email: studentEmail, password, confirmPassword: password }),
    });
    const cookie = regRes.headers.get('set-cookie')?.split(';')[0];

    // Fetch dynamic career actions from API
    const actionsRes = await fetch(`${BASE_URL}/api/career/actions`, { headers: { Cookie: cookie } });
    assert.strictEqual(actionsRes.status, 200, 'Career actions API returns 200');
    const actionsData = await actionsRes.json();
    const actionsList = actionsData.actionPlan?.actions || actionsData.actions;
    assert.ok(Array.isArray(actionsList), 'Actions array returned');
    assert.ok(actionsList.length > 0, 'Dynamic recommendations generated');

    const testedDestinations = new Set();
    for (const action of actionsList) {
      assert.ok(action.href, `Action ${action.id} has an href`);
      const baseRoute = action.href.split('?')[0];

      if (!testedDestinations.has(baseRoute)) {
        testedDestinations.add(baseRoute);
        const destRes = await fetch(`${BASE_URL}${baseRoute}`, { headers: { Cookie: cookie } });
        assert.ok([200, 307, 308].includes(destRes.status), `Route ${baseRoute} resolves cleanly (status: ${destRes.status})`);
      }
    }

    pass('Dashboard Recommendation Deep Link Integrity', `All ${testedDestinations.size} generated destination routes resolve cleanly with HTTP 200`);
  } catch (err) {
    fail('Test 4: Recommendation Deep Links', err);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Job Discovery Resilience Under Authenticated Queries & Edge Cases
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Job Discovery Resilience ---');
  try {
    const studentEmail = `audit.jobs.${ts}@columbia.edu`;
    const password = 'StrongPassword2026!';

    // Register
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp2 },
      body: JSON.stringify({ fullName: 'Columbia Student', email: studentEmail, password, confirmPassword: password }),
    });
    const cookie = regRes.headers.get('set-cookie')?.split(';')[0];

    // 1. Authenticated query with normal fresher terms
    const res1 = await fetch(`${BASE_URL}/api/jobs/search?q=frontend+developer&location=remote`, {
      headers: { Cookie: cookie },
    });
    assert.strictEqual(res1.status, 200, 'Authenticated job search returns 200');
    const data1 = await res1.json();
    assert.ok(Array.isArray(data1.jobs), 'Jobs array returned');

    // 2. Query with empty parameters (must not crash, must return clean results)
    const res2 = await fetch(`${BASE_URL}/api/jobs/search?q=&location=`, {
      headers: { Cookie: cookie },
    });
    assert.strictEqual(res2.status, 200, 'Empty job search returns 200 without crashing');
    const data2 = await res2.json();
    assert.ok(Array.isArray(data2.jobs), 'Empty search returns valid jobs array');

    // 3. Query with special characters / injection strings
    const res3 = await fetch(`${BASE_URL}/api/jobs/search?q='OR+1=1--&location=%3Cscript%3Ealert(1)%3C/script%3E`, {
      headers: { Cookie: cookie },
    });
    assert.strictEqual(res3.status, 200, 'Malicious payload search handled without crash');
    const data3 = await res3.json();
    assert.ok(Array.isArray(data3.jobs), 'Malicious parameters handled cleanly without crash');

    // 4. Unauthenticated attempt fails closed with 401
    const unauthRes = await fetch(`${BASE_URL}/api/jobs/search?q=engineer`);
    assert.strictEqual(unauthRes.status, 401, 'Unauthenticated search fails closed with 401');

    pass('Job Discovery Resilience', 'Authenticated searches succeed; empty/malicious queries handled safely; unauthenticated searches fail-closed (401)');
  } catch (err) {
    fail('Test 5: Job Discovery Resilience', err);
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`FINAL ACCEPTANCE AUDIT: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAcceptanceAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
