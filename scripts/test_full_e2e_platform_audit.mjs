import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import Module from 'node:module';

// Intercept server-only for standalone Node execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

import {
  verifySessionToken,
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
console.log('SMART RESUME AI: FULL END-TO-END AUDIT & CONSISTENCY SUITE');
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

async function runSuite() {
  const {
    getDb,
    createSessionToken,
    registerUser,
    loginUser,
    getUserBySession,
    logoutUser,
    saveResumeVersion,
    getResumeVersions,
    getResumeVersion,
    restoreResumeVersion,
    createJobApplication,
    updateJobApplication,
    getUserJobApplications,
    deleteJobApplication,
    getAdminUserDetail,
    getAdminJobApplications,
    getRealAdminStats,
    verifyAdminToken,
    recordAdminLogin,
    revokeAdminSession,
  } = await import('../src/server/db/index.ts');

  const { analyzeResume, matchResumeToJob } = await import('../src/server/services/gemini.ts');
  const { validateResumeDocument } = await import('../src/server/services/resumeValidator.ts');

  const baseUrl = 'http://localhost:3000';
  const db = getDb();
  const testRunId = Date.now().toString(36);

  const testUserAEmail = `e2e_usera_${testRunId}@example.com`;
  const testUserAPassword = 'SecurePassword123!';
  const testUserBEmail = `e2e_userb_${testRunId}@example.com`;
  const testUserBPassword = 'SecurePassword456!';

  let userAData;
  let userBData;
  let userAResumeId;
  let userAApplicationId;

  const sampleResumeData = {
    personalInfo: {
      fullName: 'Alex Vance',
      email: testUserAEmail,
      phone: '+1 (555) 987-6543',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/alexvance',
      github: 'https://github.com/alexvance',
      summary: 'Experienced Senior Frontend Engineer with 6+ years specializing in React, TypeScript, Next.js, and web performance optimization. Led frontend architecture for high-traffic SaaS applications serving over 2M active users.',
    },
    experience: [
      {
        id: 'exp_1',
        title: 'Senior Frontend Engineer',
        company: 'CloudTech Solutions',
        location: 'San Francisco, CA',
        startDate: '2021-03',
        endDate: 'Present',
        current: true,
        highlights: [
          'Architected and implemented responsive Next.js and TypeScript frontend application, improving initial page load time by 42%.',
          'Spearheaded state management migration and optimized React rendering pipelines, reducing re-render cycles by 35%.',
          'Mentored team of 5 junior engineers and established robust CI/CD automated linting and test coverage protocols.',
        ],
      },
      {
        id: 'exp_2',
        title: 'Frontend Developer',
        company: 'InnoApp Labs',
        location: 'Austin, TX',
        startDate: '2018-06',
        endDate: '2021-02',
        current: false,
        highlights: [
          'Engineered reusable component libraries using React, Tailwind CSS, and Storybook.',
          'Integrated RESTful and GraphQL APIs with optimistic UI caching, ensuring zero perceptible latency.',
        ],
      },
    ],
    education: [
      {
        id: 'edu_1',
        degree: 'Bachelor of Science in Computer Science',
        institution: 'University of Texas at Austin',
        location: 'Austin, TX',
        startDate: '2014-08',
        endDate: '2018-05',
        current: false,
      },
    ],
    skills: [
      'React',
      'TypeScript',
      'JavaScript',
      'Next.js',
      'Node.js',
      'HTML5',
      'CSS3',
      'Tailwind CSS',
      'REST APIs',
      'GraphQL',
      'Git',
      'Jest',
      'CI/CD',
    ],
    projects: [
      {
        id: 'proj_1',
        name: 'OpenSource Dashboard UI',
        description: 'Modern glassmorphic analytics dashboard built with React 19, TypeScript, and Tailwind CSS.',
        url: 'https://github.com/alexvance/dashboard',
        highlights: [
          'Implemented real-time WebSocket data visualization charts with 60fps rendering performance.',
        ],
      },
    ],
  };

  try {
    // -------------------------------------------------------------
    // PHASE 1: USER REGISTRATION, AUTHENTICATION & SESSION PERSISTENCE
    // -------------------------------------------------------------
    console.log('--- PHASE 1.1: REGISTRATION & AUTHENTICATION ---');

    await test('User A can register and receives valid session token', async () => {
      userAData = await registerUser({
        name: 'Alex Vance',
        email: testUserAEmail,
        password: testUserAPassword,
      });
      assert.ok(userAData.user.id);
      assert.equal(userAData.user.email, testUserAEmail.toLowerCase());
      assert.equal(userAData.user.role, 'USER');
      assert.ok(userAData.sessionToken);
    });

    await test('User B can register for cross-user isolation tests', async () => {
      userBData = await registerUser({
        name: 'Morgan Blake',
        email: testUserBEmail,
        password: testUserBPassword,
      });
      assert.ok(userBData.user.id);
      assert.equal(userBData.user.email, testUserBEmail.toLowerCase());
    });

    let activeUserASessionToken;
    await test('User can log in via loginUser and session persists in database', async () => {
      const loginRes = await loginUser({
        email: testUserAEmail,
        password: testUserAPassword,
      });
      assert.ok(loginRes.sessionToken);
      assert.equal(loginRes.user.email, testUserAEmail.toLowerCase());
      activeUserASessionToken = loginRes.sessionToken;

      // Verify getUserBySession reflects active session
      const sessionUser = await getUserBySession(loginRes.sessionToken);
      assert.ok(sessionUser);
      assert.equal(sessionUser.id, userAData.user.id);
    });

    await test('HTTP GET /api/auth/me validates user session cookie', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Cookie: `sra_user_session=${activeUserASessionToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.authenticated, true);
      assert.equal(json.user?.email, testUserAEmail.toLowerCase());
      assert.equal(json.user?.role, 'USER');
    });

    // -------------------------------------------------------------
    // PHASE 1.2: RESUME BUILDER & REQUIRED-FIELD VALIDATION
    // -------------------------------------------------------------
    console.log('\n--- PHASE 1.2: RESUME BUILDER & DOCUMENT VALIDATION ---');

    await test('Document validator detects and rejects empty or invalid resume content', () => {
      const emptyCheck = validateResumeDocument('');
      assert.equal(emptyCheck.isValid, false);
      assert.equal(emptyCheck.reasonCode, 'EMPTY_OR_CORRUPT');

      const nonResumeCheck = validateResumeDocument('Grocery shopping list: apples, milk, bread, butter, eggs.');
      assert.equal(nonResumeCheck.isValid, false);
    });

    await test('Document validator accepts authentic comprehensive resume', () => {
      const resumePlainText = `
        Alex Vance
        alex@example.com | +1 (555) 987-6543 | San Francisco, CA
        Summary: Senior Frontend Engineer with 6+ years experience in React, TypeScript, and Next.js.
        Experience:
        Senior Frontend Engineer at CloudTech Solutions (2021 - Present)
        - Architected Next.js frontend application improving load time by 42%.
        - Led state management migration reducing re-render cycles by 35%.
        Education:
        B.S. in Computer Science, University of Texas at Austin (2018)
        Skills: React, TypeScript, Next.js, Node.js, GraphQL, Git, Tailwind CSS.
      `;
      const validCheck = validateResumeDocument(resumePlainText);
      assert.equal(validCheck.isValid, true);
      assert.ok(validCheck.confidence >= 0.7);
    });

    // -------------------------------------------------------------
    // PHASE 1.3: RESUME PERSISTENCE, VERSIONING & RESTORATION
    // -------------------------------------------------------------
    console.log('\n--- PHASE 1.3: RESUME PERSISTENCE & VERSIONING ---');

    let v1Record;
    await test('Save resume in database and create version 1', async () => {
      const v1 = await saveResumeVersion(userAData.user.id, null, sampleResumeData, 'Initial Resume Version');
      v1Record = v1;
      userAResumeId = v1.resumeId;
      assert.ok(userAResumeId);
      assert.equal(v1.version_number, 1);
    });

    await test('Modify resume summary and save version 2', async () => {
      const modifiedResumeData = {
        ...sampleResumeData,
        personalInfo: {
          ...sampleResumeData.personalInfo,
          summary: 'Staff Frontend Engineer & System Architect with 7+ years building enterprise React & Next.js platforms.',
        },
      };

      const v2 = await saveResumeVersion(userAData.user.id, userAResumeId, modifiedResumeData, 'Promoted to Staff Frontend Engineer');
      assert.equal(v2.version_number, 2);

      const versions = await getResumeVersions(userAData.user.id, userAResumeId);
      assert.equal(versions.length, 2);
      // Verify strict newest-first ordering
      assert.equal(versions[0].version_number, 2);
      assert.equal(versions[1].version_number, 1);
    });

    await test('Restore version 1 preserves history checkpoint and restores original summary', async () => {
      const restored = await restoreResumeVersion(userAData.user.id, v1Record.id);
      assert.ok(restored);
      const restoredSummary = restored.resumeData?.personalInfo?.summary ?? restored.personalInfo?.summary;
      assert.equal(restoredSummary, sampleResumeData.personalInfo.summary);

      // Verify that restoration recorded checkpoint version 3
      const versionsAfter = await getResumeVersions(userAData.user.id, userAResumeId);
      assert.ok(versionsAfter.length >= 3);
    });

    // -------------------------------------------------------------
    // PHASE 1.4: ATS RESUME ANALYSIS & SCORING
    // -------------------------------------------------------------
    console.log('\n--- PHASE 1.4: ATS RESUME ANALYSIS ---');

    let analysisResult;
    await test('analyzeResume produces defensible deterministic ATS metrics', async () => {
      const resumeText = `
        Alex Vance - Senior Frontend Engineer
        Email: ${testUserAEmail} | Phone: +1 555-987-6543 | Location: San Francisco, CA
        Summary: High-impact Senior Frontend Developer with 6+ years experience in React, TypeScript, Next.js, Node.js, and web performance optimization.
        Experience:
        Senior Frontend Engineer, CloudTech Solutions (2021 - Present)
        - Designed and deployed Next.js applications serving 2M monthly visitors.
        - Improved core web vitals and reduced bundle payload by 35%.
        Education:
        B.S. in Computer Science, University of Texas at Austin (2018)
        Skills: React, TypeScript, JavaScript, Next.js, Node.js, Tailwind CSS, Jest, GraphQL, REST APIs.
      `;

      analysisResult = await analyzeResume(resumeText);
      assert.ok(typeof analysisResult.overallAtsScore === 'number');
      assert.ok(analysisResult.overallAtsScore >= 0 && analysisResult.overallAtsScore <= 100);
      assert.ok(typeof analysisResult.keywordMatchScore === 'number');
      assert.ok(typeof analysisResult.formattingScore === 'number');
      assert.ok(typeof analysisResult.sectionScore === 'number');
      assert.ok(Array.isArray(analysisResult.detectedKeywords));
      assert.ok(analysisResult.detectedKeywords.length > 0);
    });

    // -------------------------------------------------------------
    // PHASE 1.5: JOB SEARCH & RESUME-TO-JOB MATCHING
    // -------------------------------------------------------------
    console.log('\n--- PHASE 1.5: JOB SEARCH & MATCHING ---');

    const targetJob = {
      id: 'job_target_e2e_1',
      title: 'Senior React Developer',
      company: 'TechCorp International',
      location: 'Remote',
      url: 'https://example.com/jobs/senior-react-dev',
      source: 'InternalPlatform',
      description: 'Seeking a Senior React Developer with deep expertise in React, TypeScript, Next.js, REST APIs, and Tailwind CSS. Bonus: GraphQL and Docker.',
    };

    await test('Resume-to-Job matcher calculates genuine skill match scores without hallucinations', async () => {
      const resumePlainText = `
        Alex Vance - Senior Frontend Engineer
        Skills: React, TypeScript, Next.js, Node.js, GraphQL, Git, Tailwind CSS, Jest, REST APIs.
        Experience: Senior Frontend Engineer at CloudTech Solutions building React and Next.js applications.
      `;
      const match = await matchResumeToJob(resumePlainText, targetJob.title, targetJob.company, targetJob.description);
      const score = match.overallMatchScore ?? match.matchScore;
      assert.ok(typeof score === 'number');
      assert.ok(score >= 40 && score <= 100);

      const matchedNames = match.matchedSkills.map((s) => {
        if (typeof s === 'string') return s.toLowerCase();
        return (s.skill || s.name || '').toLowerCase();
      });
      assert.ok(matchedNames.includes('react'));
      assert.ok(matchedNames.includes('typescript'));

      assert.equal(matchedNames.includes('problem solving'), false);
      assert.equal(matchedNames.includes('system architecture'), false);
    });

    // -------------------------------------------------------------
    // PHASE 1.6: JOB SAVING & APPLICATION TRACKING
    // -------------------------------------------------------------
    console.log('\n--- PHASE 1.6: APPLICATION TRACKING & STATUS PROGRESSION ---');

    await test('Candidate can save job and retrieve under saved jobs', async () => {
      const app = await createJobApplication(userAData.user.id, {
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        company: targetJob.company,
        location: targetJob.location,
        jobUrl: targetJob.url,
        status: 'Saved',
        salary: '$140,000 - $170,000',
        descriptionSnippet: targetJob.description.slice(0, 100),
      });

      userAApplicationId = app.id;
      assert.ok(userAApplicationId);
      assert.equal(app.status, 'Saved');

      const userApps = await getUserJobApplications(userAData.user.id);
      assert.equal(userApps.length, 1);
      assert.equal(userApps[0].job_id, targetJob.id);
    });

    await test('Application status transitions from Saved -> Applied -> Interview', async () => {
      const nowIso = new Date().toISOString();
      await updateJobApplication(userAData.user.id, userAApplicationId, {
        status: 'Applied',
        appliedConfirmedAt: nowIso,
      });

      let updatedApps = await getUserJobApplications(userAData.user.id);
      assert.equal(updatedApps[0].status, 'Applied');
      assert.equal(updatedApps[0].applied_confirmed_at, nowIso);

      // Advance to Interview
      await updateJobApplication(userAData.user.id, userAApplicationId, {
        status: 'Interview',
      });

      updatedApps = await getUserJobApplications(userAData.user.id);
      assert.equal(updatedApps[0].status, 'Interview');
    });

    await test('Application status is protected from invalid downgrade to Ready to apply', async () => {
      const attemptDowngrade = await createJobApplication(userAData.user.id, {
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        company: targetJob.company,
        location: targetJob.location,
        jobUrl: targetJob.url,
        status: 'Ready to apply',
      });

      // Status must remain 'Interview' rather than being downgraded
      assert.equal(attemptDowngrade.status, 'Interview');
    });

    // -------------------------------------------------------------
    // PHASE 2: CROSS-FEATURE CONSISTENCY & ISOLATION
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: CROSS-FEATURE ISOLATION & INTEGRITY ---');

    await test('User B cannot view or retrieve User A job applications', async () => {
      const userBApps = await getUserJobApplications(userBData.user.id);
      assert.equal(userBApps.length, 0);
    });

    await test('User B cannot delete User A job application', async () => {
      const deleted = await deleteJobApplication(userBData.user.id, userAApplicationId);
      assert.equal(deleted, false);

      // Verify record still exists
      const userAApps = await getUserJobApplications(userAData.user.id);
      assert.equal(userAApps.length, 1);
    });

    await test('User B cannot retrieve or restore User A resume versions', async () => {
      await assert.rejects(
        async () => {
          await getResumeVersions(userBData.user.id, userAResumeId);
        },
        /not found|forbidden/i
      );

      await assert.rejects(
        async () => {
          await restoreResumeVersion(userBData.user.id, v1Record.id);
        },
        /not found|forbidden/i
      );
    });

    // -------------------------------------------------------------
    // PHASE 3: ADMIN WORKFLOW & AUDIT INTEGRITY
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: ADMIN WORKFLOW & STATS ACCURACY ---');

    const adminTestId = `adm_e2e_${testRunId}`;
    const adminTestEmail = `admin_e2e_${testRunId}@smartresume.ai`;
    const nowIso = new Date().toISOString();

    await db.prepare(`
      INSERT INTO admin_users (id, email, password_hash, role, created_at, updated_at, is_active)
      VALUES (?, ?, ?, 'ADMIN', ?, ?, 1)
    `).run(adminTestId, adminTestEmail, 'salt:fakehash', nowIso, nowIso);

    const adminSessionToken = createSessionToken({
      id: adminTestId,
      email: adminTestEmail,
      role: 'ADMIN',
    });
    await recordAdminLogin(adminTestId, adminSessionToken);

    await test('Admin auth/me validates administrator credentials', async () => {
      const res = await fetch(`${baseUrl}/api/admin/auth/me`, {
        headers: { Cookie: `sra_admin_session=${adminSessionToken}` },
      });
      assert.equal(res.status, 200);
      const json = await res.json();
      assert.equal(json.admin?.role, 'ADMIN');
      assert.equal(json.admin?.email, adminTestEmail);
    });

    await test('getAdminUserDetail displays candidate details with resumes and job applications', async () => {
      const detail = await getAdminUserDetail(userAData.user.id);
      assert.ok(detail);
      assert.equal(detail.user?.id, userAData.user.id);
      assert.equal(detail.user?.password_hash, undefined);
      assert.ok(Array.isArray(detail.resumes));
      assert.ok(Array.isArray(detail.jobApplications));
      assert.equal(detail.jobApplications.length, 1);
      assert.equal(detail.jobApplications[0].job_title, targetJob.title);
    });

    await test('getAdminJobApplications includes candidate email and omits session tokens', async () => {
      const apps = await getAdminJobApplications(20);
      assert.ok(Array.isArray(apps));
      const targetApp = apps.find((a) => a.id === userAApplicationId);
      assert.ok(targetApp);
      assert.equal(targetApp.user_email, testUserAEmail.toLowerCase());
      assert.equal(targetApp.session_token, undefined);
      assert.equal(targetApp.password_hash, undefined);
    });

    await test('Admin logout revokes session server-side in admin_users', async () => {
      await revokeAdminSession(adminTestId);
      assert.equal(verifyAdminToken(adminSessionToken), null);

      const res = await fetch(`${baseUrl}/api/admin/auth/me`, {
        headers: { Cookie: `sra_admin_session=${adminSessionToken}` },
      });
      assert.equal(res.status, 401);
    });

    // -------------------------------------------------------------
    // PHASE 4: PRODUCT QUALITY, ROUTE STATUSES & LEGAL COMPLIANCE
    // -------------------------------------------------------------
    console.log('\n--- PHASE 4: PRODUCT QUALITY, ROUTE ACCESSIBILITY & LEGAL ---');

    const routesToCheck = [
      { path: '/', expectedStatus: 200, name: 'Landing Page' },
      { path: '/privacy', expectedStatus: 200, name: 'Privacy Policy' },
      { path: '/terms', expectedStatus: 200, name: 'Terms of Service' },
      { path: '/analyzer', expectedStatus: 200, name: 'Public ATS Analyzer' },
      { path: '/ats-score', expectedStatus: 200, name: 'Dedicated ATS Score' },
      { path: '/login', expectedStatus: 200, name: 'User Login' },
      { path: '/register', expectedStatus: 200, name: 'User Register' },
      { path: '/admin/login', expectedStatus: 200, name: 'Admin Login' },
    ];

    for (const r of routesToCheck) {
      await test(`Public route ${r.name} (${r.path}) returns HTTP ${r.expectedStatus}`, async () => {
        const res = await fetch(`${baseUrl}${r.path}`);
        assert.equal(res.status, r.expectedStatus);
      });
    }

    const protectedUserRoutes = ['/builder', '/dashboard', '/job-match', '/jobs'];
    for (const p of protectedUserRoutes) {
      await test(`Unauthenticated access to ${p} redirects to /login`, async () => {
        const res = await fetch(`${baseUrl}${p}`, { redirect: 'manual' });
        assert.equal(res.status, 307);
        const loc = res.headers.get('location');
        assert.ok(loc?.includes('/login'));
      });
    }

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n--- CLEANING UP TEST ARTIFACTS ---');
    try {
      await db.prepare('DELETE FROM job_applications WHERE id = ?').run(userAApplicationId);
      await db.prepare('DELETE FROM resume_versions WHERE resume_id = ?').run(userAResumeId);
      await db.prepare('DELETE FROM resumes WHERE id = ?').run(userAResumeId);
      await db.prepare('DELETE FROM admin_users WHERE id = ?').run(adminTestId);
      await db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(userAData.user.id, userBData.user.id);
      console.log('✓ Cleaned up all test user and admin records.');
    } catch (cleanErr) {
      console.warn('Cleanup warning:', cleanErr);
    }

    console.log('\n================================================================');
    console.log(`TOTAL E2E TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: ${totalTests - passedTests}`);
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
