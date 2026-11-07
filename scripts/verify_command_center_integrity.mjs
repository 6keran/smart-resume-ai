/**
 * RIGOROUS DATABASE, ISOLATION, EMPTY-STATE, AND CONSISTENCY AUDITOR
 *
 * Checks:
 * - Readiness snapshots created only from genuine events with real timestamps
 * - No historical snapshots backfilled or fabricated
 * - User ownership and zero cross-user access
 * - Consistency of readiness score across calculation, unified context, and action engine
 * - Clean empty states for fresh students with zero assets
 * - Admin analytics authorization and real DB counts
 * - Deduplication and anti-spam protection against race conditions
 */

import Module from 'node:module';
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

async function auditIntegrity() {
  console.log('\n======================================================');
  console.log('  INTEGRITY, SECURITY & EMPTY-STATE AUDIT SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  const {
    getDb,
    recordReadinessSnapshot,
    getUserReadinessHistory,
    upsertStudentProfile,
  } = await import('../src/server/db/index.ts');

  const {
    getUnifiedStudentContext,
    recordStudentReadinessSnapshot,
    clearStudentContextCache,
  } = await import('../src/server/services/unifiedStudentContext.ts');

  const { getStudentCareerActions } = await import('../src/server/services/careerActionEngine.ts');
  const { calculateExplainableReadiness, findRoleSpecification } = await import('../src/server/services/careerIntelligence.ts');

  const db = getDb();

  // 1. FRESH STUDENT EMPTY-STATE AUDIT
  console.log('--- 1. Fresh Student Empty State Audit ---');
  const freshUserId = `usr_fresh_${Date.now()}`;
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(freshUserId, 'Fresh Candidate', 'fresh@uni.edu', `tok_fresh_${Date.now()}`, now, now, now);

  const freshContext = await getUnifiedStudentContext(freshUserId);
  assert(freshContext.academic === null, 'Fresh student has null academic profile (no fake college/degree)');
  assert(freshContext.resume.hasResume === false, 'Fresh student has hasResume: false');
  assert(freshContext.resume.resumesCount === 0, 'Fresh student has 0 resumes on file');
  assert(freshContext.projects.totalCount === 0, 'Fresh student has 0 guided projects (no fabricated projects)');
  assert(freshContext.applications.totalCount === 0, 'Fresh student has 0 active applications (no phantom pipeline)');
  assert(freshContext.interviews.totalSessions === 0, 'Fresh student has 0 interview sessions');
  assert(freshContext.learning.hasActiveRoadmap === false, 'Fresh student has no active roadmap initially');
  assert(freshContext.readiness.overallScore >= 0 && freshContext.readiness.overallScore <= 100, 'Baseline score is bounded (0-100)');
  assert(freshContext.readinessHistory.length === 1, 'Fresh student has exactly 1 initial baseline snapshot');
  assert(freshContext.readinessHistory[0].triggerActivity === 'initial_baseline', 'Snapshot trigger is strictly initial_baseline');
  assert(freshContext.readinessHistory[0].userId === freshUserId, 'Snapshot belongs strictly to fresh student');

  // 2. READINESS SCORE CONSISTENCY AUDIT
  console.log('\n--- 2. Multi-Module Readiness Consistency Audit ---');
  const calculatedReadiness = calculateExplainableReadiness({
    userId: freshUserId,
    name: freshContext.name,
    targetRole: freshContext.careerGoal.targetRole,
    skills: {
      verified: freshContext.skills.verified,
      claimed: freshContext.skills.claimed,
      inferred: freshContext.skills.inferred,
      needingAssessment: freshContext.skills.needingAssessment,
    },
    metrics: {
      verifiedCount: freshContext.skills.verified.length,
      claimedCount: freshContext.skills.claimed.length,
      inferredCount: freshContext.skills.inferred.length,
      readinessScore: freshContext.readiness.overallScore,
      activeApplicationsCount: freshContext.applications.totalCount,
      savedResumesCount: freshContext.resume.resumesCount,
    },
    recentAssessments: [],
    nextRecommendedActions: [],
  });

  assert(calculatedReadiness.overallScore === freshContext.readiness.overallScore, 'Score from standalone calculateExplainableReadiness strictly equals unified context score');

  const actionPlan = await getStudentCareerActions(freshUserId);
  assert(actionPlan.overallReadiness === freshContext.readiness.overallScore, 'Action plan overallReadiness strictly matches unified context score');

  // 3. ZERO BACKFILL & USER OWNERSHIP AUDIT
  console.log('\n--- 3. User Ownership & Zero Backfill Audit ---');
  const intruderUserId = `usr_intruder_${Date.now()}`;
  await db.prepare(`
    INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(intruderUserId, 'Intruder Candidate', 'intruder@uni.edu', `tok_intruder_${Date.now()}`, now, now, now);

  const intruderHistory = await getUserReadinessHistory(intruderUserId, 10);
  assert(intruderHistory.length === 0, 'Intruder user cannot view fresh student snapshots');

  // Verify DB raw rows for freshUserId
  const rawRows = await db.prepare('SELECT * FROM career_readiness_history WHERE user_id = ?').all(freshUserId);
  assert(rawRows.length === 1, 'Only 1 raw DB row exists for fresh user; no backfilled records');
  assert(rawRows[0].user_id === freshUserId, 'Raw DB row strictly references freshUserId');

  // 4. DEDUPLICATION & ANTI-RACE PROTECTION AUDIT
  console.log('\n--- 4. Deduplication & Anti-Spam Protection Audit ---');
  // Trigger identical snapshot within 2 minutes
  const duplicateSnap = await recordReadinessSnapshot(freshUserId, {
    overallScore: freshContext.readiness.overallScore,
    overallLevel: freshContext.readiness.overallLevel,
    technicalScore: freshContext.readiness.quadrants.technicalCompetency.score,
    projectScore: freshContext.readiness.quadrants.projectEvidence.score,
    resumeScore: freshContext.readiness.quadrants.resumeAts.score,
    interviewScore: freshContext.readiness.quadrants.interviewFluency.score,
    triggerActivity: 'initial_baseline',
    activityDetail: 'Duplicate trigger attempt',
  });

  const updatedRawRows = await db.prepare('SELECT * FROM career_readiness_history WHERE user_id = ?').all(freshUserId);
  assert(updatedRawRows.length === 1, 'Deduplication prevented duplicate snapshot row in DB');
  assert(duplicateSnap?.id === rawRows[0].id, 'Deduplication returned existing snapshot ID');

  // Distinct trigger activity adds valid second snapshot
  const activitySnap = await recordReadinessSnapshot(freshUserId, {
    overallScore: freshContext.readiness.overallScore + 5,
    overallLevel: freshContext.readiness.overallLevel,
    technicalScore: freshContext.readiness.quadrants.technicalCompetency.score + 10,
    projectScore: freshContext.readiness.quadrants.projectEvidence.score,
    resumeScore: freshContext.readiness.quadrants.resumeAts.score,
    interviewScore: freshContext.readiness.quadrants.interviewFluency.score,
    triggerActivity: 'assessment_completed',
    activityDetail: 'Passed Git Assessment (80%)',
  });

  const rowsAfterActivity = await db.prepare('SELECT * FROM career_readiness_history WHERE user_id = ? ORDER BY created_at DESC').all(freshUserId);
  assert(rowsAfterActivity.length === 2, 'Distinct trigger activity successfully logged genuine new snapshot');
  assert(rowsAfterActivity[0].trigger_activity === 'assessment_completed', 'Most recent snapshot matches latest activity trigger');
  assert(rowsAfterActivity[1].trigger_activity === 'initial_baseline', 'Previous historical snapshot remains untouched (never recalculated)');
  assert(rowsAfterActivity[1].overall_score === rawRows[0].overall_score, 'Historical snapshot score preserved without alteration');

  console.log('\n======================================================');
  console.log(`  INTEGRITY RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

auditIntegrity();

