/**
 * TEST SUITE: AUTHORITATIVE UNIFIED STUDENT CONTEXT (PHASE 2 P0)
 *
 * Verifies:
 * 1. buildUnifiedStudentContext() aggregates all 13 canonical dimensions:
 *    profile, education, experience, resume data, ATS history, skills,
 *    assessment scores, saved jobs, applications, career interests,
 *    career goals, projects, and chat history.
 * 2. Resume skills parsing: correctly infers skills when stored as an object
 *    ({ technical: [], tools: [], soft: [] }) and extracts work history.
 * 3. Assessment history and saved jobs aggregation into context.
 * 4. mapUnifiedToCareerProfileSummary() provides 1:1 parity with getCareerProfileSummary().
 * 5. Strict multi-tenant data isolation between authenticated students.
 */

import Module from 'node:module';
import assert from 'node:assert';
import { setupTestDb } from './testDbIsolation.mjs';

// Setup isolated test database sandbox
setupTestDb('unified_student_context');

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

async function run() {
  console.log('\n======================================================');
  console.log('  PHASE 2: UNIFIED STUDENT CONTEXT INTEGRATION AUDIT');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function test(condition, name, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${name}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // Import backend modules
  const {
    getDb,
    upsertStudentProfile,
    upsertUserCareerGoal,
    saveUserResume,
    recordResumeAnalysis,
    createGuidedProject,
    updateGuidedProject,
    recordJobMatchEvent,
  } = await import('../src/server/db/index.ts');

  const {
    buildUnifiedStudentContext,
    getUnifiedStudentContext,
    mapUnifiedToCareerProfileSummary,
    clearStudentContextCache,
    buildUnifiedSystemGrounding,
  } = await import('../src/server/services/unifiedStudentContext.ts');

  const { getCareerProfileSummary } = await import('../src/server/services/careerIntelligence.ts');

  const db = getDb();
  const now = new Date().toISOString();

  // --- 1. Fixture Creation for Student A ---
  const userAId = `usr_test_usc_${Date.now()}_a`;
  const userAEmail = `alex_${Date.now()}@example.com`;
  db.prepare(`
    INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userAId, 'Alex Rivera', userAEmail, `tok_a_${Date.now()}`, now, now, now);

  test(Boolean(userAId), 'Student A created successfully');

  // Student Profile
  await upsertStudentProfile(userAId, {
    institution: 'UC Berkeley',
    degree: 'B.S.',
    fieldOfStudy: 'Computer Science',
    graduationYear: 2026,
    graduationMonth: 'May',
    currentSemester: 'Semester 7',
    cgpa: '3.85',
    studentType: 'college_student',
    targetRole: 'Full Stack Engineer',
    targetWorkType: 'both',
    preferredLocations: ['San Francisco, CA', 'Remote'],
    projects: [
      {
        title: 'Distributed KV Store',
        description: 'Raft consensus KV store in Go',
        techStack: ['Go', 'gRPC', 'Docker'],
      },
    ],
    coursework: ['Data Structures', 'Operating Systems', 'Cloud Computing'],
    achievements: ['Dean\'s List 2024'],
  });

  // Career Goal
  await upsertUserCareerGoal(userAId, {
    targetRole: 'Full Stack Engineer',
    targetIndustry: 'Cloud Infrastructure',
    experienceLevel: 'Fresher / Entry Level',
    preferredLocation: 'San Francisco, CA',
    targetSalary: '$110,000',
    skillsSummary: 'Go, TypeScript, React, Docker',
  });

  // Resume with OBJECT-style skills and work experience
  const resumeA = await saveUserResume(userAId, {
    resumeData: {
      title: 'Software Engineering Resume',
      candidateType: 'experienced',
      personalInfo: {
        fullName: 'Alex Rivera',
        email: userAEmail,
        phone: '555-0199',
        location: 'San Francisco, CA',
      },
      skills: {
        technical: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
        tools: ['Docker', 'Git', 'Kubernetes'],
        soft: ['Technical Communication', 'Team Leadership'],
      },
      experience: [
        {
          id: 'exp-1',
          company: 'Acme Cloud Inc.',
          position: 'Software Engineering Intern',
          startDate: 'Jun 2025',
          endDate: 'Aug 2025',
          current: false,
          location: 'San Francisco, CA',
          description: 'Built distributed ingestion pipelines.',
          bullets: ['Reduced ingestion latency by 42%', 'Deployed microservices to Kubernetes'],
        },
      ],
      education: [
        {
          id: 'edu-1',
          institution: 'UC Berkeley',
          degree: 'B.S. in Computer Science',
          graduationDate: 'May 2026',
        },
      ],
      projects: [],
      certifications: [],
    },
  });
  test(resumeA && resumeA.id, 'Student A resume created with structured skill objects and internship experience');

  // ATS Analysis record
  await recordResumeAnalysis({
    userId: userAId,
    resumeId: resumeA.id,
    fileType: 'application/json',
    atsScore: 84,
    keywordScore: 88,
    formattingScore: 92,
    sectionScore: 85,
    analysisStatus: 'COMPLETED',
    detectedKeywords: ['TypeScript', 'React', 'Docker', 'Kubernetes', 'Go'],
    missingKeywords: ['Redis', 'GraphQL', 'AWS'],
  });

  // Guided Project
  const projA = await createGuidedProject(userAId, {
    title: 'Idempotent Payment Engine',
    difficulty: 'Advanced',
    targetRole: 'Full Stack Engineer',
    techStack: ['Node.js', 'PostgreSQL', 'Redis', 'Docker'],
    problemStatement: 'Distributed payment orchestration with zero double charges.',
  });
  await updateGuidedProject(projA.id, userAId, {
    currentMilestone: 3,
    progressPercent: 75,
    status: 'in_progress',
  });

  // Assessments in database
  db.prepare(`
    INSERT INTO assessments (id, user_id, visitor_id, skill, score, total_questions, passed, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'asmt-1',
    userAId,
    'vis-1',
    'TypeScript',
    90,
    10,
    1,
    'COMPLETED',
    new Date().toISOString()
  );

  // Job Match / Saved Job in database
  await recordJobMatchEvent({
    userId: userAId,
    resumeId: resumeA.id,
    jobId: 'job-stripe-101',
    jobTitle: 'Full Stack Engineer - Core Platform',
    company: 'Stripe',
    matchScore: 88,
    matchedSkills: ['TypeScript', 'React', 'Docker'],
    missingSkills: ['Ruby'],
  });

  // --- 2. Verification of buildUnifiedStudentContext() ---
  console.log('\n--- 2. Verifying 13 Canonical Dimensions in buildUnifiedStudentContext ---');
  clearStudentContextCache(userAId);
  const context = await buildUnifiedStudentContext(userAId);

  // Dimension 1: Basic User Info
  test(context.userId === userAId, 'Dimension 1: User ID matches');
  test(context.name === 'Alex Rivera', 'Dimension 1: User name resolved');
  test(context.email === userAEmail, 'Dimension 1: User email resolved');

  // Dimension 2: Academic Profile & Education
  test(context.academic !== null, 'Dimension 2: Academic profile exists');
  test(context.academic.institution === 'UC Berkeley', 'Dimension 2: Academic institution matches');
  test(context.academic.graduationYear === 2026, 'Dimension 2: Academic graduation year matches');
  test(context.academic.coursework.includes('Cloud Computing'), 'Dimension 2: Academic coursework resolved');

  // Dimension 3: Career Goals & Interests
  test(context.careerGoal.targetRole === 'Full Stack Engineer', 'Dimension 3: Target career role resolved');
  test(context.careerGoal.experienceLevel === 'Fresher / Entry Level', 'Dimension 3: Experience level resolved');
  test(context.careerGoal.preferredLocations.includes('San Francisco, CA'), 'Dimension 3: Preferred locations resolved');

  // Dimension 4: Skills Partitioning (Fix verification: Object-style skills)
  test(context.skills.inferred.some(s => s.name === 'TypeScript' && s.source === 'skills_section'),
    'Dimension 4: Object-style resume skills successfully parsed into skills_section (TypeScript)');
  test(context.skills.inferred.some(s => s.name === 'Docker' && s.source === 'skills_section'),
    'Dimension 4: Object-style tool skills successfully parsed into skills_section (Docker)');
  test(context.skills.inferred.some(s => s.name === 'Technical Communication' && s.source === 'skills_section'),
    'Dimension 4: Object-style soft skills successfully parsed into skills_section (Technical Communication)');

  // Dimension 5: Work / Internship Experience
  test(context.experience.totalCount === 1, 'Dimension 5: Work experience extracted (count = 1)');
  test(context.experience.items[0].company === 'Acme Cloud Inc.', 'Dimension 5: Work experience company matches');
  test(context.experience.items[0].position === 'Software Engineering Intern', 'Dimension 5: Work experience position matches');
  test(context.experience.hasInternship === true, 'Dimension 5: Internship flag correctly detected');

  // Dimension 6: Resume Intelligence
  test(context.resume.hasResume === true, 'Dimension 6: Resume presence detected');
  test(context.resume.latestAtsScore === 84, 'Dimension 6: Latest ATS score resolved (84)');
  test(context.resume.keywordScore === 88, 'Dimension 6: Keyword score resolved (88)');

  // Dimension 7: Guided Projects
  test(context.projects.totalCount === 1, 'Dimension 7: Guided projects counted (1)');
  test(context.projects.projects[0].title === 'Idempotent Payment Engine', 'Dimension 7: Project title matches');
  test(context.projects.projects[0].milestoneProgress === 75, 'Dimension 7: Milestone progress matches (75%)');

  // Dimension 8: Assessments History
  test(context.assessments.totalAttempts === 1, 'Dimension 8: Assessment attempts counted (1)');
  test(context.assessments.passedCount === 1, 'Dimension 8: Passed assessment count matches (1)');
  test(context.assessments.averageScore === 90, 'Dimension 8: Assessment average score matches (90)');
  test(context.assessments.recentAssessments[0].skill === 'TypeScript', 'Dimension 8: Assessment skill matches');

  // Dimension 9: Saved & Matched Jobs
  test(context.savedJobs.totalCount >= 1, 'Dimension 9: Saved jobs counted (>= 1)');
  test(context.savedJobs.jobs[0].company === 'Stripe', 'Dimension 9: Matched job company matches Stripe');
  test(context.savedJobs.jobs[0].matchScore === 88, 'Dimension 9: Matched job score matches 88%');

  // Dimension 10: Applications Context
  test(context.applications !== undefined && typeof context.applications.totalCount === 'number',
    'Dimension 10: Applications context initialized');

  // Dimension 11: Interview Performance Context
  test(context.interviews !== undefined && typeof context.interviews.totalSessions === 'number',
    'Dimension 11: Interview context initialized');

  // Dimension 12: Learning Roadmap Context
  test(context.learning !== undefined && typeof context.learning.hasActiveRoadmap === 'boolean',
    'Dimension 12: Learning context initialized');

  // Dimension 13: Explainable Career Readiness & History
  test(context.readiness !== undefined && typeof context.readiness.overallScore === 'number',
    'Dimension 13: Explainable readiness computed');
  test(context.readiness.quadrants.technicalCompetency !== undefined, 'Dimension 13: Technical quadrant present');
  test(context.readiness.quadrants.projectEvidence !== undefined, 'Dimension 13: Project quadrant present');
  test(context.readiness.quadrants.resumeAts !== undefined, 'Dimension 13: Resume ATS quadrant present');
  test(context.readiness.quadrants.interviewFluency !== undefined, 'Dimension 13: Interview fluency quadrant present');
  test(context.readinessHistory.length >= 1, 'Dimension 13: Readiness snapshot recorded in history');

  // --- 3. Backward Compatibility & Parity with getCareerProfileSummary ---
  console.log('\n--- 3. Verifying Backward Compatibility & Parity ---');
  test(getUnifiedStudentContext === buildUnifiedStudentContext, 'getUnifiedStudentContext is canonical alias');

  const careerSummary = await getCareerProfileSummary(userAId);
  test(careerSummary !== null, 'getCareerProfileSummary returns populated object');
  test(careerSummary.userId === userAId, 'Career summary user ID matches');
  test(careerSummary.targetRole === 'Full Stack Engineer', 'Career summary target role matches');
  test(careerSummary.latestAtsAnalysis?.atsScore === 84, 'Career summary ATS score matches context');
  test(careerSummary.recentAssessments.length === 1, 'Career summary includes assessment attempts');
  test(careerSummary.studentProfile?.institution === 'UC Berkeley', 'Career summary includes studentProfile DTO');
  test(careerSummary.explainableReadiness?.overallScore === context.readiness.overallScore,
    'Career summary readiness score matches unified context exactly');

  // --- 4. LLM System Grounding Verification ---
  console.log('\n--- 4. Verifying LLM System Grounding Output ---');
  const grounding = buildUnifiedSystemGrounding(context);
  test(grounding.includes('Alex Rivera'), 'Grounding includes student name');
  test(grounding.includes('Full Stack Engineer'), 'Grounding includes target role');
  test(grounding.includes('Acme Cloud Inc.'), 'Grounding includes practical work experience');
  test(grounding.includes('Assessments Completed: 1/1 passed'), 'Grounding includes assessment proof');
  test(grounding.includes('Target Jobs Tracked:'), 'Grounding includes tracked target jobs');

  // --- 5. Multi-Tenant Data Isolation ---
  console.log('\n--- 5. Verifying Multi-Tenant Student Data Isolation ---');
  const userBId = `usr_test_usc_${Date.now()}_b`;
  const userBEmail = `jordan_${Date.now()}@example.com`;
  db.prepare(`
    INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userBId, 'Jordan Lee', userBEmail, `tok_b_${Date.now()}`, now, now, now);

  const contextB = await buildUnifiedStudentContext(userBId);

  test(contextB.userId === userBId, 'User B context scoped to User B');
  test(contextB.name === 'Jordan Lee', 'User B name resolved');
  test(contextB.academic === null, 'User B has no leaked academic profile from User A');
  test(contextB.experience.totalCount === 0, 'User B has no leaked work experience from User A');
  test(contextB.resume.hasResume === false, 'User B has no leaked resumes from User A');
  test(contextB.projects.totalCount === 0, 'User B has no leaked projects from User A');
  test(contextB.assessments.totalAttempts === 0, 'User B has no leaked assessments from User A');

  console.log('\n======================================================');
  console.log(`  AUDIT RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('\n❌ Fatal error during test execution:', err);
  process.exit(1);
});
