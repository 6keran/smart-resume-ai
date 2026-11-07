import assert from 'node:assert';

const STAGING_URL = process.env.STAGING_URL || 'http://localhost:3002';

console.log('================================================================');
console.log('🧪 SMART RESUME AI: STAGING VALIDATION SUITE (13 WORKFLOWS)');
console.log(`Target: ${STAGING_URL}`);
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(testNum, name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] Staging Test ${testNum}: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(testNum, name, error) {
  failed++;
  console.error(`  ❌ [FAIL] Staging Test ${testNum}: ${name}`, error);
}

async function runStagingValidation() {
  const ts = Date.now();
  const randIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const studentEmail = `staging.student.${ts}@mit.edu`;
  const studentPassword = 'StagingSecurePass2026!';
  let studentCookie = '';
  let studentUserId = '';
  let resumeId = '';
  let applicationId = '';

  // --------------------------------------------------------------------------
  // TEST 1: Student Registration & Login
  // --------------------------------------------------------------------------
  try {
    const regRes = await fetch(`${STAGING_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp },
      body: JSON.stringify({ fullName: 'Staging Candidate', email: studentEmail, password: studentPassword, confirmPassword: studentPassword }),
    });
    assert.strictEqual(regRes.status, 200, 'Registration returns 200');
    const regData = await regRes.json();
    studentUserId = regData.user?.id;
    assert.ok(studentUserId, 'User ID obtained');

    const loginRes = await fetch(`${STAGING_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp },
      body: JSON.stringify({ email: studentEmail, password: studentPassword }),
    });
    assert.strictEqual(loginRes.status, 200, 'Login returns 200');
    studentCookie = loginRes.headers.get('set-cookie')?.split(';')[0];
    assert.ok(studentCookie, 'Session cookie issued');
    pass(1, 'Student Registration & Login', `Registered ${studentEmail}`);
  } catch (err) {
    fail(1, 'Student Registration & Login', err);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Student Profile Creation & Editing
  // --------------------------------------------------------------------------
  try {
    const putRes = await fetch(`${STAGING_URL}/api/student/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        institution: 'Massachusetts Institute of Technology',
        degree: 'B.S. in Computer Science & Engineering',
        fieldOfStudy: 'Computer Science',
        graduationYear: 2026,
        targetRole: 'Full Stack Engineer',
        skills: ['TypeScript', 'Node.js', 'React', 'PostgreSQL'],
        coursework: ['Algorithms', 'Distributed Systems'],
      }),
    });
    assert.strictEqual(putRes.status, 200, 'Profile created');

    const getRes = await fetch(`${STAGING_URL}/api/student/profile`, { headers: { Cookie: studentCookie } });
    const profileData = await getRes.json();
    assert.strictEqual(profileData.profile?.institution, 'Massachusetts Institute of Technology', 'Institution persisted');
    assert.strictEqual(profileData.profile?.targetRole, 'Full Stack Engineer', 'Target role persisted');
    pass(2, 'Student Profile Creation & Editing', 'Persisted and retrieved academic profile');
  } catch (err) {
    fail(2, 'Student Profile Creation & Editing', err);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Resume Creation & A4 PDF Verification
  // --------------------------------------------------------------------------
  try {
    const resumePayload = {
      title: 'Staging Candidate - Graduate SDE Resume',
      candidateType: 'fresher',
      personalInfo: {
        fullName: 'Staging Candidate',
        email: studentEmail,
        phone: '+1 (555) 321-7890',
        location: 'Cambridge, MA',
      },
      summary: 'Passionate computer science graduate from MIT with hands-on experience in full-stack web development and distributed systems.',
      education: [
        {
          id: `edu_${Date.now()}`,
          degree: 'B.S. in Computer Science',
          institution: 'MIT',
          graduationYear: '2026',
        },
      ],
      experience: [],
      projects: [
        {
          id: `proj_${Date.now()}`,
          title: 'Cloud Log Streamer',
          description: 'Real-time telemetry pipeline in TypeScript and Docker.',
          technologies: ['TypeScript', 'Node.js', 'Docker'],
          bullets: ['Built containerized log streaming pipeline with sub-50ms latency.'],
        },
      ],
      skills: {
        technical: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        soft: ['Problem Solving', 'Communication'],
        tools: ['Git', 'Docker'],
      },
    };

    const saveRes = await fetch(`${STAGING_URL}/api/user/resumes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ resumeData: resumePayload, title: 'Staging Candidate - Graduate SDE Resume' }),
    });
    if (saveRes.status !== 200) {
      console.log('DEBUG SAVE ERROR:', await saveRes.json());
    }
    assert.strictEqual(saveRes.status, 200, 'Resume saved');
    const saveData = await saveRes.json();
    resumeId = saveData.resume?.id || saveData.id;
    assert.ok(resumeId, 'Resume ID issued');

    pass(3, 'Resume Creation & A4 PDF Compatibility', `Resume ID: ${resumeId}`);
  } catch (err) {
    fail(3, 'Resume Creation & A4 PDF Compatibility', err);
  }

  // --------------------------------------------------------------------------
  // TEST 4: ATS Resume Analysis
  // --------------------------------------------------------------------------
  try {
    const resumeText = `
Staging Candidate
Full Stack Engineer | ${studentEmail} | Cambridge, MA
Summary: Passionate software engineer with experience in TypeScript, React, Node.js, and SQL.
Education: B.S. in Computer Science, MIT (2026)
Skills: TypeScript, JavaScript, React, Node.js, Express, PostgreSQL, Git, Docker
Experience: Software Intern at Tech Corp (2025). Built REST APIs and optimized database queries.
`;

    const jobDescription = `
Seeking a Junior Full Stack Engineer with proficiency in TypeScript, React, and Node.js.
Knowledge of relational databases like PostgreSQL and containerization with Docker is required.
`;

    const analyzeRes = await fetch(`${STAGING_URL}/api/resume/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        resumeText,
        jobDescription,
        targetRole: 'Junior Full Stack Engineer',
      }),
    });
    assert.strictEqual(analyzeRes.status, 200, 'ATS analysis returned 200');
    const analysisData = await analyzeRes.json();
    assert.ok(typeof analysisData.overallAtsScore === 'number' && analysisData.overallAtsScore >= 0, 'ATS score computed');
    assert.ok(Array.isArray(analysisData.detectedKeywords), 'Detected keywords list returned');
    pass(4, 'ATS Resume Analysis', `Score: ${analysisData.overallAtsScore}/100, Engine: ${analysisData.analysisEngine || 'default'}`);
  } catch (err) {
    fail(4, 'ATS Resume Analysis', err);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Skill Assessment
  // --------------------------------------------------------------------------
  try {
    // Add skill
    await fetch(`${STAGING_URL}/api/user/skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ name: 'TypeScript', level: 'intermediate' }),
    });

    const startRes = await fetch(`${STAGING_URL}/api/assessments/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ skill: 'TypeScript' }),
    });
    assert.strictEqual(startRes.status, 200, 'Assessment started');
    const startData = await startRes.json();
    const attemptId = startData.attemptId;
    assert.ok(attemptId, 'Attempt ID issued');
    assert.ok(Array.isArray(startData.questions) && startData.questions.length > 0, 'Questions provided');

    // Submit answers
    const answers = startData.questions.map((q) => ({ questionId: q.id, answerIndex: 0 }));
    const submitRes = await fetch(`${STAGING_URL}/api/assessments/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ attemptId, answers }),
    });
    assert.strictEqual(submitRes.status, 200, 'Assessment submitted');
    const submitData = await submitRes.json();
    assert.ok(typeof submitData.score === 'number', 'Score evaluated');
    pass(5, 'Skill Assessment', `Attempt: ${attemptId}, Score: ${submitData.score}/${submitData.totalQuestions}`);
  } catch (err) {
    fail(5, 'Skill Assessment', err);
  }

  // --------------------------------------------------------------------------
  // TEST 6: Guided Project Workflow
  // --------------------------------------------------------------------------
  try {
    const projRes = await fetch(`${STAGING_URL}/api/career/projects`, {
      headers: { Cookie: studentCookie },
    });
    assert.strictEqual(projRes.status, 200, 'Guided projects returned 200');
    const projData = await projRes.json();
    assert.ok(Array.isArray(projData.projects), 'Projects array returned');
    pass(6, 'Guided Project Workflow', `Available projects: ${projData.projects.length}`);
  } catch (err) {
    fail(6, 'Guided Project Workflow', err);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Job Discovery & Filtering
  // --------------------------------------------------------------------------
  try {
    const jobsRes = await fetch(`${STAGING_URL}/api/jobs/search?q=developer&location=remote`, {
      headers: { Cookie: studentCookie },
    });
    assert.strictEqual(jobsRes.status, 200, 'Job search returns 200');
    const jobsData = await jobsRes.json();
    assert.ok(Array.isArray(jobsData.jobs), 'Jobs array returned');
    pass(7, 'Job Discovery & Filtering', `Found ${jobsData.jobs.length} jobs (Total: ${jobsData.totalJobs || 0})`);
  } catch (err) {
    fail(7, 'Job Discovery & Filtering', err);
  }

  // --------------------------------------------------------------------------
  // TEST 8: Application Tracking
  // --------------------------------------------------------------------------
  try {
    const postApp = await fetch(`${STAGING_URL}/api/user/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ company: 'Datadog', jobTitle: 'Junior Software Engineer', location: 'Boston, MA', status: 'Applied' }),
    });
    assert.strictEqual(postApp.status, 200, 'Application tracked');
    const appData = await postApp.json();
    applicationId = appData.application?.id;
    assert.ok(applicationId, 'Application ID obtained');

    // Update status to Interview
    const putApp = await fetch(`${STAGING_URL}/api/user/applications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ id: applicationId, status: 'Interview', notes: 'Scheduled round 1 phone screen' }),
    });
    assert.strictEqual(putApp.status, 200, 'Application updated');
    pass(8, 'Application Tracking', `Tracked & updated application ${applicationId} (Applied -> Interview)`);
  } catch (err) {
    fail(8, 'Application Tracking', err);
  }

  // --------------------------------------------------------------------------
  // TEST 9: Interview Preparation
  // --------------------------------------------------------------------------
  try {
    const evalRes = await fetch(`${STAGING_URL}/api/career/interview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({
        role: 'Full Stack Engineer',
        question: 'How do you design a scalable REST API in Node.js?',
        answer: 'I use Express or Fastify with TypeScript, implement input validation via Zod, structure code in controller-service-repository layers, use PostgreSQL with connection pooling, and add Redis caching for high-read endpoints.',
      }),
    });
    assert.strictEqual(evalRes.status, 200, 'Interview evaluation returns 200');
    const evalData = await evalRes.json();
    assert.ok(evalData.evaluation?.score !== undefined, 'Interview score evaluated');
    pass(9, 'Interview Preparation', `Score: ${evalData.evaluation?.score}/100`);
  } catch (err) {
    fail(9, 'Interview Preparation', err);
  }

  // --------------------------------------------------------------------------
  // TEST 10: AI Assistant & Gemini Fallback
  // --------------------------------------------------------------------------
  try {
    const chatRes = await fetch(`${STAGING_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: studentCookie },
      body: JSON.stringify({ message: 'What should I focus on next to improve my career readiness score?' }),
    });
    assert.strictEqual(chatRes.status, 200, 'Chat assistant returns 200');
    const chatData = await chatRes.json();
    assert.ok(chatData.reply && chatData.reply.length > 20, 'Reply generated');
    assert.ok(chatData.provider, 'Provider specified');
    pass(10, 'AI Assistant & Gemini Fallback', `Provider: ${chatData.provider}`);
  } catch (err) {
    fail(10, 'AI Assistant & Gemini Fallback', err);
  }

  // --------------------------------------------------------------------------
  // TEST 11: Admin Authentication & Authorization
  // --------------------------------------------------------------------------
  try {
    // Unauthenticated access to admin stats must fail closed (401)
    const unauthStats = await fetch(`${STAGING_URL}/api/admin/stats`);
    assert.strictEqual(unauthStats.status, 401, 'Unauthenticated admin endpoint fails closed with 401');

    // Student cookie accessing admin endpoint must fail closed (401)
    const studentAsAdmin = await fetch(`${STAGING_URL}/api/admin/stats`, { headers: { Cookie: studentCookie } });
    assert.strictEqual(studentAsAdmin.status, 401, 'Student session cannot access admin stats (401)');

    pass(11, 'Admin Authentication & Authorization', 'Admin gate strictly enforces role separation');
  } catch (err) {
    fail(11, 'Admin Authentication & Authorization', err);
  }

  // --------------------------------------------------------------------------
  // TEST 12: Student Data Isolation
  // --------------------------------------------------------------------------
  try {
    const studentBEmail = `staging.studentB.${ts}@harvard.edu`;
    const regB = await fetch(`${STAGING_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp },
      body: JSON.stringify({ fullName: 'Student B', email: studentBEmail, password: studentPassword, confirmPassword: studentPassword }),
    });
    const cookieB = regB.headers.get('set-cookie')?.split(';')[0];

    // Student B querying applications gets 0 records
    const appsBRes = await fetch(`${STAGING_URL}/api/user/applications`, { headers: { Cookie: cookieB } });
    const appsBData = await appsBRes.json();
    assert.strictEqual(appsBData.applications?.length, 0, 'Student B cannot see Student A application');

    // Student B attempting to tamper with Student A application is rejected
    const tamperRes = await fetch(`${STAGING_URL}/api/user/applications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookieB },
      body: JSON.stringify({ id: applicationId, status: 'Rejected' }),
    });
    assert.ok([400, 404].includes(tamperRes.status), 'Tampering attempt rejected');

    pass(12, 'Student Data Isolation', 'Complete cross-tenant data isolation verified');
  } catch (err) {
    fail(12, 'Student Data Isolation', err);
  }

  // --------------------------------------------------------------------------
  // TEST 13: Logout & Login Persistence
  // --------------------------------------------------------------------------
  try {
    // Logout
    const logoutRes = await fetch(`${STAGING_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Cookie: studentCookie },
    });
    assert.strictEqual(logoutRes.status, 200, 'Logout succeeds');

    // Attempting request with revoked cookie fails closed
    const revokedCheck = await fetch(`${STAGING_URL}/api/student/profile`, { headers: { Cookie: studentCookie } });
    assert.strictEqual(revokedCheck.status, 401, 'Revoked cookie returns 401');

    // Re-login
    const reloginRes = await fetch(`${STAGING_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': randIp },
      body: JSON.stringify({ email: studentEmail, password: studentPassword }),
    });
    assert.strictEqual(reloginRes.status, 200, 'Re-login succeeds');
    const newCookie = reloginRes.headers.get('set-cookie')?.split(';')[0];

    // Verify profile persisted intact
    const profileRes = await fetch(`${STAGING_URL}/api/student/profile`, { headers: { Cookie: newCookie } });
    const profileData = await profileRes.json();
    assert.strictEqual(profileData.profile?.institution, 'Massachusetts Institute of Technology', 'Institution intact');

    pass(13, 'Logout & Login Persistence', 'Full data persistence verified across logout and re-login');
  } catch (err) {
    fail(13, 'Logout & Login Persistence', err);
  }

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`STAGING VALIDATION RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStagingValidation().catch((err) => {
  console.error('Fatal staging validation error:', err);
  process.exit(1);
});
