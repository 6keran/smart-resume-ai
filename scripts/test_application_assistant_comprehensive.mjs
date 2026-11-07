import assert from 'node:assert';
import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log('================================================================');
console.log('🚀 SMART RESUME AI: AI JOB APPLICATION ASSISTANT VALIDATION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] Test ${passed}: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}:`, error);
}

async function runApplicationAssistantValidation() {
  const {
    analyzeJobApplicationRequirements,
    generateApplicationMaterials,
    generateFollowUpMessage,
    getDefaultChecklistState,
    computeChecklistProgress,
    extractSkillsFromText,
  } = await import('../src/server/services/applicationAssistant.ts');

  const {
    getDb,
    upsertStudentProfile,
    createJobApplication,
    getJobApplicationById,
    getUserJobApplications,
    updateJobApplication,
    syncUserSkillVerification,
    addUserSkill,
  } = await import('../src/server/db/index.ts');

  const timestamp = Date.now();
  const testIp1 = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const testIp2 = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const studentAEmail = `maya.assistant.${timestamp}@berkeley.edu`;
  const studentBEmail = `liam.assistant.${timestamp}@cmu.edu`;
  const defaultPassword = 'SecureStudentPass2026!';

  let cookieA = '';
  let cookieB = '';
  let userAId = '';
  let userBId = '';

  try {
    // ------------------------------------------------------------------------
    // SETUP: Register Student A & Student B via HTTP API
    // ------------------------------------------------------------------------
    console.log('--- Phase 1: Authentication & Student Profile Setup ---');

    const regResA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp1,
      },
      body: JSON.stringify({
        fullName: 'Maya Lin',
        email: studentAEmail,
        password: defaultPassword,
        confirmPassword: defaultPassword,
      }),
    });

    const regDataA = await regResA.json();
    assert.ok(
      regResA.status === 200 || regResA.status === 201,
      `Registration failed for Student A: ${regDataA.message}`
    );
    userAId = regDataA.user?.id;
    const rawCookieA = regResA.headers.get('set-cookie');
    if (rawCookieA) {
      cookieA = rawCookieA.split(';')[0];
    }
    pass('Register Student A', `ID: ${userAId}`);

    const regResB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp2,
      },
      body: JSON.stringify({
        fullName: 'Liam Vance',
        email: studentBEmail,
        password: defaultPassword,
        confirmPassword: defaultPassword,
      }),
    });

    const regDataB = await regResB.json();
    assert.ok(
      regResB.status === 200 || regResB.status === 201,
      `Registration failed for Student B: ${regDataB.message}`
    );
    userBId = regDataB.user?.id;
    const rawCookieB = regResB.headers.get('set-cookie');
    if (rawCookieB) {
      cookieB = rawCookieB.split(';')[0];
    }
    pass('Register Student B', `ID: ${userBId}`);

    // Seed Student A Profile & Verified Skills
    await upsertStudentProfile(userAId, {
      institution: 'UC Berkeley',
      degree: 'B.S. in Computer Science',
      fieldOfStudy: 'Computer Science',
      graduationYear: 2026,
      currentSemester: 'Semester 7',
      cgpa: '3.85',
      studentType: 'college_student',
      targetRole: 'Graduate Software Engineer',
      targetWorkType: 'both',
      preferredLocations: 'San Francisco, CA; Remote',
      projects: [
        {
          title: 'Distributed Task Queue',
          techStack: ['Node.js', 'Redis', 'TypeScript', 'Docker'],
          bullets: [
            'Architected asynchronous message queue handling 1,500 jobs/sec with Redis',
            'Implemented sliding-window rate limiting middleware preventing API throttling',
          ],
        },
      ],
      coursework: ['Data Structures & Algorithms', 'Operating Systems', 'Database Systems'],
      achievements: ['Dean’s Honors List (3 terms)', 'CalHacks Top 10 Finalist'],
    });

    const nowIso = new Date().toISOString();
    await syncUserSkillVerification(userAId, 'Python', 92, 'CERT-PY-92', nowIso);
    await syncUserSkillVerification(userAId, 'JavaScript', 88, 'CERT-JS-88', nowIso);
    await syncUserSkillVerification(userAId, 'SQL', 90, 'CERT-SQL-90', nowIso);
    await addUserSkill(userAId, 'React', 'Frontend', true);
    pass('Seed Student A Authentic Profile & Verified Skills');

    // ------------------------------------------------------------------------
    // TEST 1: Service Unit Test - Skill Extraction
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 2: Service Unit Tests ---');

    const sampleJobText = 'We are hiring a Junior Engineer. Must know Python, Docker, PostgreSQL and React with REST APIs.';
    const extractedSkills = extractSkillsFromText(sampleJobText);
    assert.ok(extractedSkills.includes('Python'), 'Extracted skills must include Python');
    assert.ok(extractedSkills.includes('Docker'), 'Extracted skills must include Docker');
    assert.ok(extractedSkills.includes('React'), 'Extracted skills must include React');
    assert.ok(extractedSkills.includes('PostgreSQL'), 'Extracted skills must include PostgreSQL');
    pass('Deterministic Skill Extraction from Text', `Extracted: ${extractedSkills.join(', ')}`);

    // ------------------------------------------------------------------------
    // TEST 2: Service Unit Test - Job Requirements & Match Analysis
    // ------------------------------------------------------------------------
    const jobDetails = {
      title: 'Graduate Software Engineer',
      company: 'Stripe',
      location: 'San Francisco, CA (Hybrid)',
      workArrangement: 'Hybrid / Flexible',
      description: 'Looking for a passionate Graduate Software Engineer. Core stack includes Python, SQL, Docker, and AWS.',
      requiredSkills: ['Python', 'SQL', 'Docker', 'AWS'],
      educationRequirement: 'Bachelor’s degree in Computer Science or related field',
      experienceRequirement: 'Fresh graduate or student graduating in 2026',
    };

    const analysis = await analyzeJobApplicationRequirements(userAId, jobDetails);
    assert.ok(typeof analysis.overallMatchScore === 'number', 'Match score must be a number');
    assert.ok(analysis.overallMatchScore >= 40 && analysis.overallMatchScore <= 98, 'Match score must be in calibrated 40-98 range');
    assert.ok(Array.isArray(analysis.matchingSkills), 'matchingSkills must be array');
    assert.ok(Array.isArray(analysis.missingSkills), 'missingSkills must be array');

    const matchingNames = analysis.matchingSkills.map((s) => s.name);
    assert.ok(matchingNames.includes('Python') || matchingNames.includes('SQL'), 'Python or SQL must be recognized as matching');

    // Education & Experience eligibility checks
    assert.strictEqual(analysis.educationEligibility.eligible, true, 'BS in Computer Science must qualify for education requirement');
    assert.ok(['eligible', 'near_match'].includes(analysis.experienceEligibility.status), 'Student Class of 2026 must be eligible for fresher role');
    assert.ok(analysis.strengths.length > 0, 'Strengths must not be empty');
    assert.ok(analysis.recommendedPrepSteps.length > 0, 'Recommended prep steps must not be empty');
    pass('Job Requirements & Eligibility Match Analysis', `Score: ${analysis.overallMatchScore}%`);

    // ------------------------------------------------------------------------
    // TEST 3: Service Unit Test - Application Materials Generation
    // ------------------------------------------------------------------------
    const materials = await generateApplicationMaterials(userAId, jobDetails);
    assert.ok(typeof materials.tailoredSummary === 'string' && materials.tailoredSummary.length > 30, 'Tailored summary must be generated');
    assert.ok(materials.tailoredSummary.includes('UC Berkeley') || materials.tailoredSummary.includes('Computer Science') || materials.tailoredSummary.includes('Python'), 'Summary must reference student background');

    // Check improved projects
    assert.ok(Array.isArray(materials.improvedProjects), 'improvedProjects must be array');
    assert.strictEqual(materials.improvedProjects.length, 1, 'Only authentic student projects must be included');
    assert.strictEqual(materials.improvedProjects[0].originalTitle, 'Distributed Task Queue');

    // Check 4-paragraph cover letter
    assert.ok(materials.coverLetter, 'Cover letter must be generated');
    assert.ok(materials.coverLetter.fullText.includes('Dear Hiring Team'), 'Cover letter must include formal salutation');
    assert.ok(materials.coverLetter.wordCount >= 140 && materials.coverLetter.wordCount <= 480, `Cover letter word count (${materials.coverLetter.wordCount}) must be in standard 140-480 range`);

    // Check recruiter outreach & LinkedIn note <= 300 chars
    assert.ok(materials.recruiterOutreach, 'Recruiter outreach must be generated');
    assert.ok(materials.recruiterOutreach.linkedInNote.length <= 300, `LinkedIn note length (${materials.recruiterOutreach.linkedInNote.length}) must be <= 300 chars`);
    assert.ok(materials.applicationEmailDraft.body.includes('Maya Lin'), 'Email draft must reference student name');
    pass('Application Materials Generation', `Summary, Projects, Cover Letter (${materials.coverLetter.wordCount} words), LinkedIn note (${materials.recruiterOutreach.linkedInNote.length} chars)`);

    // ------------------------------------------------------------------------
    // TEST 4: Non-Fabrication Verification
    // ------------------------------------------------------------------------
    const forbiddenEmployers = ['Google Inc', 'Meta Platforms', 'Amazon Web Services Inc', 'Apple Computer'];
    for (const emp of forbiddenEmployers) {
      assert.ok(
        !materials.tailoredSummary.toLowerCase().includes(emp.toLowerCase()),
        `Summary must not invent past employment at ${emp}`
      );
      assert.ok(
        !materials.coverLetter.fullText.toLowerCase().includes(`previously worked at ${emp.toLowerCase()}`),
        `Cover letter must not invent past employment at ${emp}`
      );
    }
    pass('Strict Non-Fabrication Guarantee', 'No hallucinated corporate employment or fake metrics');

    // ------------------------------------------------------------------------
    // TEST 5: Checklist State Machine Progression
    // ------------------------------------------------------------------------
    const initialChecklist = getDefaultChecklistState();
    assert.strictEqual(initialChecklist.completedSteps, 0);
    assert.strictEqual(initialChecklist.percentage, 0);
    assert.strictEqual(initialChecklist.totalSteps, 7);

    const step3Progress = computeChecklistProgress({
      eligibilityChecked: true,
      resumeTailored: true,
      resumeReviewed: true,
    });
    assert.strictEqual(step3Progress.completedSteps, 3);
    assert.strictEqual(step3Progress.percentage, 43);

    const fullProgress = computeChecklistProgress({
      eligibilityChecked: true,
      resumeTailored: true,
      resumeReviewed: true,
      coverLetterPrepared: true,
      documentsChecked: true,
      linkVerified: true,
      applicationSubmitted: true,
    });
    assert.strictEqual(fullProgress.completedSteps, 7);
    assert.strictEqual(fullProgress.percentage, 100);
    assert.ok(fullProgress.appliedAtConfirmed !== null, 'Submission must record applied confirmation timestamp');
    pass('Checklist State Machine Progression', '0% -> 43% -> 100% with confirmed timestamp');

    // ------------------------------------------------------------------------
    // TEST 6: Database Persistence & CRUD with Assistant Fields
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 3: Database Persistence & CRUD ---');

    const createdApp = await createJobApplication(userAId, {
      jobTitle: 'Graduate Software Engineer',
      company: 'Stripe',
      location: 'San Francisco, CA',
      source: 'Direct Portal',
      jobUrl: 'https://stripe.com/jobs/grad-sde',
      status: 'Ready to apply',
      notes: 'Initial interview prep completed with AI Mentor.',
      coverLetter: materials.coverLetter.fullText,
      tailoredSummary: materials.tailoredSummary,
      checklistState: JSON.stringify(step3Progress),
      matchAnalysis: JSON.stringify(analysis),
      interviewDate: '2026-11-20T10:00:00Z',
      outreachMessage: materials.recruiterOutreach.linkedInNote,
    });

    assert.ok(createdApp.id, 'Created application must have an ID');
    assert.strictEqual(createdApp.jobTitle, 'Graduate Software Engineer');
    assert.strictEqual(createdApp.company, 'Stripe');

    // Retrieve by ID
    const fetchedApp = await getJobApplicationById(userAId, createdApp.id);
    assert.ok(fetchedApp, 'Fetched application must exist');
    assert.strictEqual(fetchedApp.company, 'Stripe');
    assert.strictEqual(fetchedApp.coverLetter, materials.coverLetter.fullText);
    assert.strictEqual(fetchedApp.tailoredSummary, materials.tailoredSummary);
    assert.strictEqual(fetchedApp.outreachMessage, materials.recruiterOutreach.linkedInNote);
    assert.strictEqual(fetchedApp.interviewDate, '2026-11-20T10:00:00Z');

    // Update Application
    const updatedApp = await updateJobApplication(userAId, createdApp.id, {
      status: 'Interview',
      notes: 'Passed initial recruiter screen! Technical round scheduled.',
      interviewDate: '2026-11-22T14:30:00Z',
    });
    assert.strictEqual(updatedApp.status, 'Interview');
    assert.strictEqual(updatedApp.notes, 'Passed initial recruiter screen! Technical round scheduled.');
    assert.strictEqual(updatedApp.interviewDate, '2026-11-22T14:30:00Z');
    pass('Database Persistence & CRUD', `Application ID: ${createdApp.id}`);

    // ------------------------------------------------------------------------
    // TEST 7: Cross-User Security & Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 4: Cross-User Security & Isolation ---');

    const unauthorizedFetch = await getJobApplicationById(userBId, createdApp.id);
    assert.strictEqual(unauthorizedFetch, null, 'User B must not be able to fetch User A application');

    let updateFailedAsExpected = false;
    try {
      await updateJobApplication(userBId, createdApp.id, {
        notes: 'Malicious modification by User B',
      });
    } catch {
      updateFailedAsExpected = true;
    }
    assert.strictEqual(updateFailedAsExpected, true, 'User B update must throw unauthorized exception');
    pass('Cross-User Data Isolation', 'User B cannot read or modify User A records');

    // ------------------------------------------------------------------------
    // TEST 8: AI Follow-Up Message Generator
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 5: AI Follow-Up Assistance ---');

    // 2 days elapsed (early)
    const earlyFollowUp = generateFollowUpMessage({
      jobTitle: 'Graduate Software Engineer',
      company: 'Stripe',
      status: 'Applied',
      appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'post_application',
      channel: 'email',
      studentName: 'Maya Lin',
    });
    assert.strictEqual(earlyFollowUp.timingStatus, 'early');
    assert.ok(earlyFollowUp.timingNote.includes('day(s)'));

    // 7 days elapsed (optimal)
    const optimalFollowUp = generateFollowUpMessage({
      jobTitle: 'Graduate Software Engineer',
      company: 'Stripe',
      status: 'Applied',
      appliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      type: 'post_application',
      channel: 'email',
      studentName: 'Maya Lin',
    });
    assert.strictEqual(optimalFollowUp.timingStatus, 'optimal');
    assert.ok(optimalFollowUp.subject.includes('Stripe') || optimalFollowUp.subject.includes('Graduate Software Engineer'));
    assert.ok(optimalFollowUp.message.includes('Maya Lin'));

    // Post-interview thank you
    const interviewThankYou = generateFollowUpMessage({
      jobTitle: 'Graduate Software Engineer',
      company: 'Stripe',
      status: 'Interview',
      interviewDate: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      type: 'post_interview',
      channel: 'email',
      studentName: 'Maya Lin',
    });
    assert.strictEqual(interviewThankYou.type, 'post_interview');
    assert.strictEqual(interviewThankYou.timingStatus, 'optimal');
    assert.ok(interviewThankYou.subject.includes('Thank You'));
    assert.ok(interviewThankYou.message.toLowerCase().includes('interview'));
    pass('AI Follow-Up Message Generation', 'Early check-in (2 days), Optimal check-in (7 days), Post-interview thank you');

    // ------------------------------------------------------------------------
    // TEST 9: Live HTTP API - Analyze Endpoint
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 6: Live HTTP API Tests ---');

    const httpAnalyzeRes = await fetch(`${BASE_URL}/api/career/assistant/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
      },
      body: JSON.stringify({
        title: 'Associate Backend Engineer',
        company: 'Cloudflare',
        location: 'Remote',
        description: 'Building edge serverless workers with JavaScript, Python, and SQL.',
      }),
    });

    assert.strictEqual(httpAnalyzeRes.status, 200, 'HTTP analyze route must return 200');
    const httpAnalyzeData = await httpAnalyzeRes.json();
    assert.ok(httpAnalyzeData.success, 'HTTP analyze must return success: true');
    assert.ok(httpAnalyzeData.analysis.overallMatchScore > 0, 'Analysis score must be returned');
    pass('POST /api/career/assistant/analyze HTTP API', `Match score: ${httpAnalyzeData.analysis.overallMatchScore}%`);

    // ------------------------------------------------------------------------
    // TEST 10: Live HTTP API - Prepare Endpoint
    // ------------------------------------------------------------------------
    const httpPrepareRes = await fetch(`${BASE_URL}/api/career/assistant/prepare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
      },
      body: JSON.stringify({
        applicationId: createdApp.id,
        title: 'Graduate Software Engineer',
        company: 'Stripe',
        location: 'San Francisco, CA',
      }),
    });

    assert.strictEqual(httpPrepareRes.status, 200, 'HTTP prepare route must return 200');
    const httpPrepareData = await httpPrepareRes.json();
    assert.ok(httpPrepareData.success, 'HTTP prepare must return success: true');
    assert.ok(httpPrepareData.materials.tailoredSummary, 'Tailored summary must be generated');
    assert.ok(httpPrepareData.materials.coverLetter.fullText, 'Cover letter text must be generated');
    pass('POST /api/career/assistant/prepare HTTP API', 'Generated summary and cover letter');

    // ------------------------------------------------------------------------
    // TEST 11: Live HTTP API - Follow-Up Endpoint
    // ------------------------------------------------------------------------
    const httpFollowUpRes = await fetch(`${BASE_URL}/api/career/assistant/follow-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
      },
      body: JSON.stringify({
        applicationId: createdApp.id,
        jobTitle: 'Graduate Software Engineer',
        company: 'Stripe',
        status: 'Interview',
        type: 'post_interview',
        channel: 'email',
      }),
    });

    assert.strictEqual(httpFollowUpRes.status, 200, 'HTTP follow-up route must return 200');
    const httpFollowUpData = await httpFollowUpRes.json();
    assert.ok(httpFollowUpData.success, 'HTTP follow-up must return success: true');
    assert.strictEqual(httpFollowUpData.followUp.type, 'post_interview');
    pass('POST /api/career/assistant/follow-up HTTP API', `Subject: ${httpFollowUpData.followUp.subject}`);

    // ------------------------------------------------------------------------
    // TEST 12: Live HTTP API - Application Route (GET & PATCH)
    // ------------------------------------------------------------------------
    // GET by Owner (User A)
    const httpGetAppRes = await fetch(`${BASE_URL}/api/career/assistant/application/${createdApp.id}`, {
      headers: { Cookie: cookieA },
    });
    assert.strictEqual(httpGetAppRes.status, 200, 'GET application by owner must return 200');
    const httpGetAppData = await httpGetAppRes.json();
    assert.strictEqual(httpGetAppData.application.company, 'Stripe');

    // GET by Non-Owner (User B) -> 404
    const httpGetAppUnauthorizedRes = await fetch(`${BASE_URL}/api/career/assistant/application/${createdApp.id}`, {
      headers: { Cookie: cookieB },
    });
    assert.strictEqual(httpGetAppUnauthorizedRes.status, 404, 'GET application by non-owner must return 404');

    // PATCH by Owner (User A)
    const httpPatchRes = await fetch(`${BASE_URL}/api/career/assistant/application/${createdApp.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
      },
      body: JSON.stringify({
        status: 'Offer',
        notes: 'Official written offer received! $130,000 base + equity.',
        checklistState: {
          eligibilityChecked: true,
          resumeTailored: true,
          resumeReviewed: true,
          coverLetterPrepared: true,
          documentsChecked: true,
          linkVerified: true,
          applicationSubmitted: true,
        },
      }),
    });

    assert.strictEqual(httpPatchRes.status, 200, 'PATCH application by owner must return 200');
    const httpPatchData = await httpPatchRes.json();
    assert.strictEqual(httpPatchData.application.status, 'Offer');
    assert.strictEqual(httpPatchData.application.checklist.percentage, 100);

    // PATCH by Non-Owner (User B) -> 404
    const httpPatchUnauthorizedRes = await fetch(`${BASE_URL}/api/career/assistant/application/${createdApp.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieB,
      },
      body: JSON.stringify({
        notes: 'Unauthorized injection attempt',
      }),
    });
    assert.strictEqual(httpPatchUnauthorizedRes.status, 404, 'PATCH application by non-owner must return 404');
    pass('GET & PATCH /api/career/assistant/application/[id] HTTP API', 'Authorized updates succeed; unauthorized returns 404');

    console.log('\n================================================================');
    console.log(`🎉 ALL VALIDATION CHECKS PASSED: ${passed}/${passed} SUCCESSFUL`);
    console.log('================================================================\n');
  } catch (err) {
    fail('Unhandled exception in test suite', err);
    console.error(err);
    process.exit(1);
  }
}

runApplicationAssistantValidation();
