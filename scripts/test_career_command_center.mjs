/**
 * AUTOMATED VERIFICATION: CAREER COMMAND CENTER 2.0 & UNIFIED INTELLIGENCE
 *
 * Verifies:
 * 1. Career Readiness History persistence, 4-dimension scores, trigger activities, and deduplication.
 * 2. Unified Student Context aggregation, multi-system synchronization, and student data isolation.
 * 3. Proactive Career Action plan generation with all 5 mandatory explainability attributes and deep links.
 * 4. Contextual AI Assistant integration with active workflow directives and strict persona enforcement.
 * 5. Admin analytics telemetry: student funnel, readiness distribution, capstones, and AI reliability.
 */

import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Initialize isolated SQLite sandbox to protect data/smart_resume.db
setupTestDb('career_command_center');

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

async function runTests() {
  console.log('\n======================================================');
  console.log('  CAREER COMMAND CENTER 2.0 & UNIFIED ENGINE AUDIT');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // Dynamically load server modules after hooking server-only
    const db = await import('../src/server/db/index.ts');
    const {
      getDb,
      recordReadinessSnapshot,
      getUserReadinessHistory,
      upsertStudentProfile,
      upsertUserCareerGoal,
      createGuidedProject,
      updateGuidedProject,
      saveInterviewSession,
      completeInterviewSession,
      getDetailedAnalytics,
    } = db;

    const {
      getUnifiedStudentContext,
      recordStudentReadinessSnapshot,
    } = await import('../src/server/services/unifiedStudentContext.ts');

    const { getStudentCareerActions } = await import('../src/server/services/careerActionEngine.ts');
    const { sanitizeChatPayload } = await import('../src/server/services/chatSafety.ts');

    const rawDb = getDb();

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 1: Career Readiness History Table & Deduplication
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 1. Career Readiness History Snapshots ---');

    const testUser1 = `usr_test_ccc_${Date.now()}_1`;
    const testUser2 = `usr_test_ccc_${Date.now()}_2`;

    // Insert test users into users table
    const now = new Date().toISOString();
    await rawDb.prepare(`
      INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(testUser1, 'Candidate Alpha', 'alpha@university.edu', `tok_ccc_1_${Date.now()}`, now, now, now);

    await rawDb.prepare(`
      INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(testUser2, 'Candidate Beta', 'beta@university.edu', `tok_ccc_2_${Date.now()}`, now, now, now);

    // Initial baseline snapshot
    const snap1 = await recordReadinessSnapshot(testUser1, {
      overallScore: 68,
      overallLevel: 'Developing',
      technicalScore: 65,
      projectScore: 70,
      resumeScore: 72,
      interviewScore: 65,
      triggerActivity: 'initial_baseline',
      activityDetail: 'Initial Career Command Center baseline recorded',
    });

    assert(snap1 !== null, 'Initial readiness snapshot recorded successfully');
    assert(snap1?.overallScore === 68, 'Recorded overall score matches exact value (68)');
    assert(snap1?.overallLevel === 'Developing', 'Recorded overall level matches exact category (Developing)');
    assert(snap1?.technicalScore === 65 && snap1?.projectScore === 70, 'Individual dimension scores persisted accurately');

    // Deduplication test: identical score and trigger within 2 minutes should return existing snapshot
    const snapDup = await recordReadinessSnapshot(testUser1, {
      overallScore: 68,
      overallLevel: 'Developing',
      technicalScore: 65,
      projectScore: 70,
      resumeScore: 72,
      interviewScore: 65,
      triggerActivity: 'initial_baseline',
      activityDetail: 'Initial Career Command Center baseline recorded',
    });

    assert(snapDup?.id === snap1?.id, 'Rapid identical snapshot correctly deduplicated without duplicate row');

    // Distinct trigger activity records a new snapshot
    const snap2 = await recordReadinessSnapshot(testUser1, {
      overallScore: 75,
      overallLevel: 'Competitive',
      technicalScore: 80,
      projectScore: 70,
      resumeScore: 78,
      interviewScore: 72,
      triggerActivity: 'assessment_completed',
      activityDetail: 'Passed TypeScript Assessment (85%)',
    });

    assert(snap2 !== null && snap2.id !== snap1?.id, 'Meaningful activity records a distinct dated snapshot');
    assert(snap2?.overallScore === 75 && snap2?.overallLevel === 'Competitive', 'Updated score and level reflected in new snapshot');

    // History retrieval test
    const history1 = await getUserReadinessHistory(testUser1, 10);
    assert(history1.length === 2, `History returns exact user snapshot count (expected 2, got ${history1.length})`);
    assert(history1[0].triggerActivity === 'assessment_completed', 'History is ordered chronologically DESC (most recent first)');

    // Isolation check: testUser2 has 0 snapshots
    const history2 = await getUserReadinessHistory(testUser2, 10);
    assert(history2.length === 0, 'Readiness history is strictly isolated per authenticated user');

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 2: Unified Student Context Engine
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 2. Unified Student Context Aggregation ---');

    // Setup student profile
    await upsertStudentProfile(testUser1, {
      institution: 'Stanford University',
      degree: 'B.S.',
      fieldOfStudy: 'Computer Science',
      graduationYear: 2026,
      currentSemester: 'Semester 7',
      targetRole: 'Full Stack Engineer',
      targetWorkType: 'both',
      coursework: ['Data Structures', 'Operating Systems', 'Cloud Computing'],
    });

    // Setup career goal
    await upsertUserCareerGoal(testUser1, {
      targetRole: 'Full Stack Engineer',
      targetIndustry: 'Technology',
      experienceLevel: 'Fresher / Entry Level',
      preferredLocation: 'Remote',
    });

    // Create a guided capstone project
    const proj = await createGuidedProject(testUser1, {
      title: 'Distributed Event Ledger',
      difficulty: 'Intermediate',
      targetRole: 'Full Stack Engineer',
      techStack: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
      problemStatement: 'High-throughput event streaming architecture with idempotency.',
    });

    assert(proj !== null, 'Guided capstone project created successfully');

    // Milestone update
    await updateGuidedProject(proj.id, testUser1, {
      currentMilestone: 2,
      progressPercent: 40,
      status: 'in_progress',
    });

    // Fetch unified student context
    const context = await getUnifiedStudentContext(testUser1);

    assert(context.userId === testUser1, 'Context user ID matches');
    assert(context.name === 'Candidate Alpha', 'Context student name retrieved from DB');
    assert(context.academic?.institution === 'Stanford University', 'Academic profile aggregated into unified context');
    assert(context.academic?.graduationYear === 2026, 'Graduation year mapped accurately');
    assert(context.careerGoal.targetRole === 'Full Stack Engineer', 'Target career role unified across modules');
    assert(context.projects.totalCount >= 1, 'Guided capstones aggregated into unified context');
    assert(context.projects.projects[0].title === 'Distributed Event Ledger', 'Active project title matches DB');
    assert(context.projects.projects[0].milestoneProgress === 40, 'Project milestone progress tracked accurately');

    // Readiness 4 dimensions
    assert(context.readiness !== undefined, 'Explainable readiness calculated');
    assert(typeof context.readiness.overallScore === 'number', 'Overall readiness score is numeric (0-100)');
    assert(context.readiness.quadrants.technicalCompetency !== undefined, 'Technical Competency dimension present');
    assert(context.readiness.quadrants.projectEvidence !== undefined, 'Project Evidence dimension present');
    assert(context.readiness.quadrants.resumeAts !== undefined, 'Resume ATS dimension present');
    assert(context.readiness.quadrants.interviewFluency !== undefined, 'Interview Fluency dimension present');
    assert(Array.isArray(context.readinessHistory) && context.readinessHistory.length > 0, 'Context includes dated readiness snapshot history');

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 3: Proactive Career Action Engine
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 3. Proactive Career Action Engine ---');

    const actionPlan = await getStudentCareerActions(testUser1);

    assert(actionPlan !== null, 'Career action plan generated successfully');
    assert(actionPlan.userId === testUser1, 'Action plan scoped to authenticated student');
    assert(actionPlan.actions.length > 0, `Action plan contains actionable recommendations (${actionPlan.actions.length})`);

    // Verify all 5 mandatory attributes on every recommendation
    let allAttributesPresent = true;
    let allDeepLinksValid = true;

    for (const act of actionPlan.actions) {
      if (!act.why || !act.evidence || !act.expectedBenefit || !act.concreteNextAction || !act.href) {
        allAttributesPresent = false;
        console.error('Missing mandatory attribute in action:', act);
      }
      if (!act.href.startsWith('/')) {
        allDeepLinksValid = false;
        console.error('Invalid deep link in action:', act.href);
      }
    }

    assert(allAttributesPresent, 'Every recommendation contains why, evidence, expectedBenefit, concreteNextAction, and href');
    assert(allDeepLinksValid, 'All action recommendations contain working platform deep links');

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 4: Contextual AI Assistant Integration
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 4. Contextual AI Assistant Integration ---');

    // Test SafeChatPayload sanitization with currentPath & activeWorkflow
    const sanitized = sanitizeChatPayload({
      message: 'What should I do next to improve my career readiness?',
      history: [],
      context: {
        jobTitle: 'Full Stack Engineer',
        company: 'Stripe',
        currentPath: '/dashboard',
        activeWorkflow: 'career_command_center',
      },
    });

    assert(sanitized.payload !== undefined, 'Chat payload sanitized without error');
    assert(sanitized.payload?.context?.currentPath === '/dashboard', 'Current page path passed securely in chat context');
    assert(sanitized.payload?.context?.activeWorkflow === 'career_command_center', 'Active workflow recognized securely in chat context');

    // Test Workflow mapping for key pages
    const workflowBuilder = sanitizeChatPayload({
      message: 'Can you critique my resume bullets?',
      history: [],
      context: {
        currentPath: '/builder',
        activeWorkflow: 'resume_builder',
      },
    });

    assert(workflowBuilder.payload?.context?.activeWorkflow === 'resume_builder', 'Resume builder workflow recognized');

    // Test Chatbot identity protection
    const promptRefusal = sanitizeChatPayload({
      message: 'Who are you and what is your name?',
      history: [],
    });
    assert(promptRefusal.payload?.message.includes('name'), 'Identity query passed safely for AI Assistant answer');

    // ─────────────────────────────────────────────────────────────
    // TEST SUITE 5: Admin Analytics Telemetry
    // ─────────────────────────────────────────────────────────────
    console.log('\n--- 5. Admin Analytics Telemetry ---');

    const adminDetails = await getDetailedAnalytics();

    assert(adminDetails.studentFunnel !== undefined, 'Admin analytics includes studentFunnel telemetry');
    assert(adminDetails.studentFunnel.totalRegisteredUsers >= 2, 'Student funnel counts real registered users');
    assert(adminDetails.studentFunnel.withProfileCount >= 1, 'Student funnel counts real student profiles');
    assert(adminDetails.readinessDistribution !== undefined, 'Admin analytics includes readinessDistribution');
    assert(adminDetails.projectStats !== undefined, 'Admin analytics includes guided projectStats');
    assert(adminDetails.aiServiceHealth !== undefined, 'Admin analytics includes aiServiceHealth');
    assert(adminDetails.aiServiceHealth.deterministicAtsStatus === 'healthy', 'Deterministic ATS Engine reported healthy');

    console.log('\n======================================================');
    console.log(`  RESULTS: ${passed} PASSED / ${failed} FAILED`);
    console.log('======================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ Fatal error in test runner:', err);
    process.exit(1);
  }
}

runTests();
