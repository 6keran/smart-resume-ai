/**
 * SMART RESUME AI: DAY 1 STUDENT CAREER PROFILE & READINESS TEST SUITE
 *
 * Verifies:
 * 1. Database table existence & schema definition.
 * 2. Student profile CRUD persistence (education, projects, coursework).
 * 3. User isolation (user A cannot see or mutate user B's profile).
 * 4. Automatic synchronization between student profile and user_career_goals.
 * 5. Integration with careerIntelligence getCareerProfileSummary (project skill inference).
 * 6. Explainable 4-quadrant readiness scoring (bounds, weights, levels, actions).
 * 7. Input validation (grad year bounds, required fields).
 */

import assert from 'node:assert';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Initialize isolated SQLite sandbox to protect data/smart_resume.db
setupTestDb('student_profile_day1');

// Intercept server-only check for test environment
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

const {
  getDb,
  registerUser,
  getStudentProfile,
  upsertStudentProfile,
  getUserCareerGoal,
} = await import('../src/server/db/index.ts');

const {
  getCareerProfileSummary,
  calculateExplainableReadiness,
  findRoleSpecification,
} = await import('../src/server/services/careerIntelligence.ts');

const { GET: studentProfileGet, PUT: studentProfilePut } = await import('../src/app/api/student/profile/route.ts');
const { GET: studentReadinessGet } = await import('../src/app/api/student/readiness/route.ts');

let passed = 0;
let failed = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('  RUNNING DAY 1 STUDENT CAREER PROFILE TEST SUITE');
  console.log('======================================================\n');

  const db = getDb();

  // Test 1: Verify student_profiles table exists
  await runTest('student_profiles table exists with proper indexes', async () => {
    const tableInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='student_profiles'").get();
    assert.ok(tableInfo, 'student_profiles table must exist');

    const indexInfo = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_sp_user'").get();
    assert.ok(indexInfo, 'idx_sp_user index must exist');
  });

  // Create isolated test users
  const emailSuffix = Date.now();
  const regA = await registerUser({
    name: 'Alex Rivera',
    email: `day1_student_a_${emailSuffix}@campus.edu`,
    password: 'Password123!',
  });
  const userA = regA.user;

  const regB = await registerUser({
    name: 'Beth Chen',
    email: `day1_student_b_${emailSuffix}@campus.edu`,
    password: 'Password123!',
  });
  const userB = regB.user;

  // Test 2: Initially getStudentProfile returns null for new user
  await runTest('getStudentProfile returns null for fresh user', async () => {
    const profile = await getStudentProfile(userA.id);
    assert.strictEqual(profile, null, 'Fresh user should not have a student profile');
  });

  // Test 3: Upsert complete student career profile
  await runTest('upsertStudentProfile saves full student career details', async () => {
    const saved = await upsertStudentProfile(userA.id, {
      institution: 'State Institute of Technology',
      degree: 'Bachelor of Technology (B.Tech)',
      fieldOfStudy: 'Computer Science & Engineering',
      graduationYear: 2026,
      graduationMonth: 'May',
      currentSemester: '6th Semester',
      cgpa: '3.8 / 4.0',
      studentType: 'college_student',
      targetRole: 'Graduate Software Engineer',
      targetWorkType: 'both',
      preferredLocations: ['Bangalore', 'Remote', 'Hyderabad'],
      projects: [
        {
          id: 'proj_ecommerce_api',
          title: 'Distributed E-Commerce Microservices',
          description: 'High-throughput inventory and payment processing backend using Node.js, PostgreSQL, and Redis caching.',
          role: 'Lead Backend Developer',
          techStack: ['Node.js', 'PostgreSQL', 'Redis', 'Docker', 'Git'],
          repoUrl: 'https://github.com/alexrivera/ecommerce-microservices',
          liveUrl: 'https://ecommerce-api-demo.dev',
          highlights: ['Handled 1,200 req/sec in benchmark testing', 'Implemented JWT refresh token rotation'],
        },
        {
          id: 'proj_ai_notes',
          title: 'AI Smart Study Notes',
          description: 'Next.js application that summarizes lecture transcripts using Google Gemini API.',
          techStack: ['React', 'Next.js', 'TypeScript', 'Tailwind CSS', 'Python'],
          repoUrl: 'https://github.com/alexrivera/ai-notes',
        },
      ],
      coursework: ['Data Structures & Algorithms', 'Database Management Systems', 'Operating Systems', 'Computer Networks'],
      achievements: ['Hackathon Finalist 2025 (Top 5 of 120 teams)', "Dean's List 4 Consecutive Semesters"],
    });

    assert.ok(saved.id, 'Profile must have generated ID');
    assert.strictEqual(saved.userId, userA.id);
    assert.strictEqual(saved.institution, 'State Institute of Technology');
    assert.strictEqual(saved.graduationYear, 2026);
    assert.strictEqual(saved.projects.length, 2);
    assert.strictEqual(saved.projects[0].techStack.length, 5);
    assert.strictEqual(saved.coursework.length, 4);
  });

  // Test 4: Retrieve saved student profile
  await runTest('getStudentProfile returns exact persisted profile with deserialized arrays', async () => {
    const loaded = await getStudentProfile(userA.id);
    assert.ok(loaded);
    assert.strictEqual(loaded.institution, 'State Institute of Technology');
    assert.strictEqual(loaded.targetRole, 'Graduate Software Engineer');
    assert.strictEqual(loaded.preferredLocations[0], 'Bangalore');
    assert.strictEqual(loaded.projects[0].title, 'Distributed E-Commerce Microservices');
    assert.strictEqual(loaded.projects[0].repoUrl, 'https://github.com/alexrivera/ecommerce-microservices');
  });

  // Test 5: Verify user data isolation
  await runTest('User B cannot see User A profile', async () => {
    const profileB = await getStudentProfile(userB.id);
    assert.strictEqual(profileB, null, 'User B must not see User A data');

    // Create profile for User B
    const savedB = await upsertStudentProfile(userB.id, {
      institution: 'City Engineering College',
      degree: 'B.Sc Computer Science',
      fieldOfStudy: 'Data Science',
      graduationYear: 2025,
      targetRole: 'Junior Data Analyst',
    });
    assert.strictEqual(savedB.institution, 'City Engineering College');

    // Verify User A remained unchanged
    const reloadedA = await getStudentProfile(userA.id);
    assert.strictEqual(reloadedA.institution, 'State Institute of Technology');
  });

  // Test 6: Verify synchronized user_career_goals record
  await runTest('upsertStudentProfile synchronizes with user_career_goals', async () => {
    const goalA = await getUserCareerGoal(userA.id);
    assert.ok(goalA, 'Career goal must be automatically synced');
    assert.strictEqual(goalA.target_role, 'Graduate Software Engineer');
    assert.strictEqual(goalA.experience_level, 'Fresher / Entry Level');
    assert.strictEqual(goalA.preferred_location, 'Bangalore');
  });

  // Test 7: Verify integration with getCareerProfileSummary
  await runTest('getCareerProfileSummary incorporates student projects and role specifications', async () => {
    const summary = await getCareerProfileSummary(userA.id);
    assert.strictEqual(summary.userId, userA.id);
    assert.strictEqual(summary.targetRole, 'Graduate Software Engineer');
    assert.strictEqual(summary.experienceLevel, 'Fresher / Entry Level');
    assert.ok(summary.studentProfile, 'Summary must include studentProfile');
    assert.strictEqual(summary.studentProfile.institution, 'State Institute of Technology');

    // Technologies from student projects should be inferred as resume_project
    const projectInferred = summary.skills.inferred.filter((i) => i.source === 'resume_project');
    assert.ok(projectInferred.length > 0, 'Project skills should be inferred');
    const projectSkillNames = projectInferred.map((p) => p.name.toLowerCase());
    assert.ok(projectSkillNames.includes('redis') || projectSkillNames.includes('postgresql'));
  });

  // Test 8: Verify explainable readiness scoring
  await runTest('calculateExplainableReadiness produces 4 quadrants within valid 0-100 bounds', async () => {
    const summary = await getCareerProfileSummary(userA.id);
    assert.ok(summary.explainableReadiness, 'explainableReadiness must be computed');
    const r = summary.explainableReadiness;

    assert.ok(r.overallScore >= 0 && r.overallScore <= 100, `Score must be 0-100, got ${r.overallScore}`);
    assert.ok(['Novice', 'Developing', 'Competitive', 'Career Ready'].includes(r.overallLevel));

    // Verify 4 quadrants
    const { technicalCompetency, projectEvidence, resumeAts, interviewFluency } = r.quadrants;
    assert.strictEqual(technicalCompetency.weight, 25);
    assert.strictEqual(projectEvidence.weight, 25);
    assert.strictEqual(resumeAts.weight, 25);
    assert.strictEqual(interviewFluency.weight, 25);

    // Because User A has 2 documented projects with repo & live URL:
    assert.ok(projectEvidence.score >= 70, `Project evidence should be >= 70, got ${projectEvidence.score}`);
    assert.ok(projectEvidence.strengths.length > 0);

    // Verify priority actions
    assert.ok(Array.isArray(r.priorityActions));
    assert.ok(r.priorityActions.length > 0);
    assert.ok(r.priorityActions[0].title && r.priorityActions[0].href);
  });

  // Test 9: Verify fresher role taxonomy lookup
  await runTest('findRoleSpecification matches new graduate and entry-level titles', async () => {
    const spec1 = findRoleSpecification('graduate software engineer');
    assert.strictEqual(spec1.title, 'Graduate Software Engineer (SDE-1)');
    assert.ok(spec1.criticalSkills.includes('Data Structures'));

    const spec2 = findRoleSpecification('junior data analyst');
    assert.strictEqual(spec2.title, 'Junior Data Analyst');
    assert.ok(spec2.criticalSkills.includes('Python'));

    const spec3 = findRoleSpecification('cloud & devops intern');
    assert.strictEqual(spec3.title, 'Cloud & DevOps Intern');
    assert.ok(spec3.criticalSkills.includes('Linux'));
  });

  // Test 10: Input validation edge cases
  await runTest('upsertStudentProfile gracefully handles partial updates', async () => {
    const updated = await upsertStudentProfile(userA.id, {
      cgpa: '3.9 / 4.0',
      currentSemester: '7th Semester',
    });
    assert.strictEqual(updated.cgpa, '3.9 / 4.0');
    assert.strictEqual(updated.currentSemester, '7th Semester');
    // Ensure previous fields were preserved
    assert.strictEqual(updated.institution, 'State Institute of Technology');
    assert.strictEqual(updated.projects.length, 2);
  });

  // Test 11: HTTP Route - Unauthenticated requests return 401
  await runTest('Route /api/student/profile and /api/student/readiness reject unauthenticated requests', async () => {
    const unauthReq = new Request('http://localhost:3000/api/student/profile', { method: 'GET' });
    const res = await studentProfileGet(unauthReq);
    assert.strictEqual(res.status, 401);

    const unauthReadinessReq = new Request('http://localhost:3000/api/student/readiness', { method: 'GET' });
    const resReadiness = await studentReadinessGet(unauthReadinessReq);
    assert.strictEqual(resReadiness.status, 401);
  });

  // Test 12: HTTP Route - Authenticated GET returns profile
  await runTest('Route GET /api/student/profile returns student profile for authenticated user', async () => {
    const authReq = new Request('http://localhost:3000/api/student/profile', {
      method: 'GET',
      headers: { Cookie: `sra_user_session=${regA.sessionToken}` },
    });
    const res = await studentProfileGet(authReq);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    assert.strictEqual(data.profile.institution, 'State Institute of Technology');
    assert.strictEqual(data.isConfigured, true);
  });

  // Test 13: HTTP Route - Authenticated PUT validates required fields
  await runTest('Route PUT /api/student/profile enforces input validation rules', async () => {
    // Missing institution
    const invalidReq1 = new Request('http://localhost:3000/api/student/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sra_user_session=${regA.sessionToken}`,
      },
      body: JSON.stringify({ institution: '', degree: 'B.Tech', fieldOfStudy: 'CS', graduationYear: 2026 }),
    });
    const res1 = await studentProfilePut(invalidReq1);
    assert.strictEqual(res1.status, 400);

    // Invalid graduation year (e.g. 1980 or 2060)
    const invalidReq2 = new Request('http://localhost:3000/api/student/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sra_user_session=${regA.sessionToken}`,
      },
      body: JSON.stringify({ institution: 'IIT', degree: 'B.Tech', fieldOfStudy: 'CS', graduationYear: 2085 }),
    });
    const res2 = await studentProfilePut(invalidReq2);
    assert.strictEqual(res2.status, 400);
  });

  // Test 14: HTTP Route - Authenticated PUT updates student profile
  await runTest('Route PUT /api/student/profile persists valid student profile and returns refreshed summary', async () => {
    const validPutReq = new Request('http://localhost:3000/api/student/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sra_user_session=${regA.sessionToken}`,
      },
      body: JSON.stringify({
        institution: 'National University of Technology',
        degree: 'Master of Science (M.S.)',
        fieldOfStudy: 'Software Engineering',
        graduationYear: 2026,
        graduationMonth: 'December',
        studentType: 'college_student',
        targetRole: 'Graduate Software Engineer',
        targetWorkType: 'both',
        projects: [
          {
            title: 'High-Concurrency Chat Gateway',
            description: 'WebSocket microservice handling 10k connections with Redis pub/sub.',
            techStack: ['Node.js', 'TypeScript', 'Redis', 'WebSockets'],
            repoUrl: 'https://github.com/alexrivera/chat-gateway',
          },
        ],
      }),
    });
    const putRes = await studentProfilePut(validPutReq);
    assert.strictEqual(putRes.status, 200);
    const putData = await putRes.json();
    assert.strictEqual(putData.success, true);
    assert.strictEqual(putData.profile.institution, 'National University of Technology');
    assert.strictEqual(putData.profile.degree, 'Master of Science (M.S.)');
    assert.ok(putData.summary, 'Must return refreshed career summary');
  });

  // Test 15: HTTP Route - GET /api/student/readiness returns explainable evaluation
  await runTest('Route GET /api/student/readiness returns explainable readiness analysis', async () => {
    const readinessReq = new Request('http://localhost:3000/api/student/readiness', {
      method: 'GET',
      headers: { Cookie: `sra_user_session=${regA.sessionToken}` },
    });
    const readinessRes = await studentReadinessGet(readinessReq);
    assert.strictEqual(readinessRes.status, 200);
    const readinessData = await readinessRes.json();
    assert.strictEqual(readinessData.success, true);
    assert.ok(readinessData.readiness);
    assert.ok(readinessData.readiness.quadrants.technicalCompetency);
    assert.ok(readinessData.readiness.quadrants.projectEvidence);
    assert.ok(readinessData.readiness.quadrants.resumeAts);
    assert.ok(readinessData.readiness.quadrants.interviewFluency);
    assert.strictEqual(readinessData.targetRole, 'Graduate Software Engineer');
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
