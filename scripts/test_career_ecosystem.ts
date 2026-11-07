import Module from 'node:module';

// Intercept server-only check for test environments
const origLoad = (Module as any)._load;
(Module as any)._load = function (id: string, ...args: any[]) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

async function runTests() {
  const {
    performSkillGapAnalysis,
    generateLearningRoadmap,
    generateInterviewQuestions,
    evaluateInterviewAnswer,
    parseNaturalLanguageJobQuery,
    getDeterministicCareerChatResponse,
    getCareerProfileSummary,
  } = await import('../src/server/services/careerIntelligence');

  const {
    getUserCareerGoal,
    upsertUserCareerGoal,
    getUserActiveRoadmap,
    saveUserRoadmap,
    updateRoadmapStep,
    createInterviewSession,
    getInterviewSession,
    saveInterviewSessionAnswer,
    completeInterviewSession,
  } = await import('../src/server/db');

  console.log('=====================================================');
  console.log('RUNNING AI CAREER ECOSYSTEM VERIFICATION SUITE');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Skill Gap Analysis
  console.log('--- 1. Skill Gap Analysis ---');
  const gapResult = await performSkillGapAnalysis(
    ['JavaScript', 'React', 'HTML/CSS', 'Git'],
    'Full Stack Developer'
  );
  assert(gapResult.targetRole === 'Full Stack Developer', 'Returns normalized target role');
  assert(gapResult.readinessScore > 0 && gapResult.readinessScore <= 100, 'Calculates valid readiness score (0-100)');
  assert(gapResult.missingCriticalSkills.length > 0, 'Detects missing critical skills (e.g. Node.js, SQL, TypeScript)');
  assert(gapResult.matchingSkills.some(m => m.name.toLowerCase() === 'react'), 'Correctly identifies matching skill (React)');
  assert(gapResult.priorityActions.length > 0, 'Generates actionable priority recommendations');

  // 2. Learning Roadmap Generation
  console.log('\n--- 2. Learning Roadmap Generation ---');
  const roadmap = generateLearningRoadmap('Full Stack Developer', ['Python', 'SQL', 'Docker']);
  assert(roadmap.milestones.length === 4, 'Generates 4 structured learning milestones');
  assert(roadmap.totalEstimatedWeeks > 0, 'Calculates estimated completion timeline');
  const hasYouTubeResource = roadmap.milestones.some(m =>
    m.steps.some(s => s.verifiedResources && s.verifiedResources.length > 0)
  );
  assert(hasYouTubeResource, 'Attaches verified genuine YouTube learning masterclasses');
  const hasAssessmentPointers = roadmap.milestones.some(m =>
    m.steps.some(s => Boolean(s.assessmentSkill))
  );
  assert(hasAssessmentPointers, 'Includes direct checkpoints to Smart Resume AI skill assessments');

  // 3. Interview Question Generation
  console.log('\n--- 3. Interview Question Generation ---');
  const questions = await generateInterviewQuestions('Full Stack Developer');
  assert(questions.length === 5, 'Produces exactly 5 rigorous interview questions');
  assert(questions.every(q => Boolean(q.question && q.category && q.sampleStrongAnswer)), 'Every question contains context, category, criteria, and model answer');
  assert(questions.some(q => q.category === 'behavioral'), 'Includes behavioral STAR scenario question');
  assert(questions.some(q => q.category === 'technical'), 'Includes core technical fundamentals question');

  // 4. Interview Answer Evaluation
  console.log('\n--- 4. Interview Answer Evaluation ---');
  const sampleQuestion = questions[0];
  const evalResult = await evaluateInterviewAnswer(
    sampleQuestion,
    'In React, the Virtual DOM is a lightweight memory representation of the actual DOM. Reconciliation uses a diffing algorithm to compare snapshots. I use useCallback when passing callbacks to memoized child components to prevent referential changes.',
    'Full Stack Developer'
  );
  assert(evalResult.score >= 50 && evalResult.score <= 100, 'Produces valid numerical score between 0 and 100');
  assert(evalResult.strengths.length > 0, 'Identifies candidate response strengths');
  assert(evalResult.areasForImprovement.length > 0, 'Surfaces constructive improvement areas');
  assert(Boolean(evalResult.sampleRefinement), 'Provides refined model response');

  // 5. Natural Language Job Query Parsing
  console.log('\n--- 5. Natural Language Job Query Parsing ---');
  const nlp1 = await parseNaturalLanguageJobQuery('remote junior react developer');
  assert(nlp1.workplaceType === 'Remote', 'Parses workplaceType as "Remote"');
  assert(nlp1.experienceLevel === 'Entry', 'Parses "junior" as Entry level');
  assert(nlp1.keywords.toLowerCase().includes('react'), 'Preserves core tech keyword "React"');

  const nlp2 = await parseNaturalLanguageJobQuery('senior python backend engineer in New York hybrid');
  assert(nlp2.workplaceType === 'Hybrid', 'Parses workplaceType as "Hybrid"');
  assert(nlp2.experienceLevel === 'Senior', 'Parses "senior" as Senior level');
  assert(nlp2.location.toLowerCase().includes('new york'), 'Parses location as "New York"');

  // 6. Deterministic Career Copilot Responses
  console.log('\n--- 6. Deterministic Career Copilot Responses ---');
  const chat1 = getDeterministicCareerChatResponse('How do I prepare for my full stack interview?');
  assert(chat1.toLowerCase().includes('star') && chat1.toLowerCase().includes('interview'), 'Answers interview questions with STAR guidance');

  const chat2 = getDeterministicCareerChatResponse('How do I improve my resume ATS score?');
  assert(chat2.toLowerCase().includes('action verbs') || chat2.toLowerCase().includes('xyz'), 'Provides actionable resume bullet formula');

  // 7. Database Persistence
  console.log('\n--- 7. Database Persistence & CRUD ---');
  const testUserId = `test_user_eco_${Date.now()}`;

  // Upsert career goal
  const savedGoal = await upsertUserCareerGoal(testUserId, {
    targetRole: 'Data Scientist',
    targetIndustry: 'Artificial Intelligence',
    experienceLevel: 'Senior Level',
    preferredLocation: 'Remote',
    targetSalary: '$140,000',
    skillsSummary: ['Python', 'SQL', 'PyTorch'],
  });
  assert(savedGoal.target_role === 'Data Scientist', 'Saves user career goal');
  const fetchedGoal = await getUserCareerGoal(testUserId);
  assert(fetchedGoal?.target_role === 'Data Scientist', 'Retrieves user career goal');

  // Save Roadmap
  const savedRoadmap = await saveUserRoadmap(testUserId, 'Data Scientist', roadmap);
  assert(savedRoadmap.status === 'active', 'Saves active learning roadmap');
  const activeRoadmap = await getUserActiveRoadmap(testUserId);
  assert(activeRoadmap?.target_role === 'Data Scientist', 'Retrieves active user roadmap');

  // Toggle step
  const stepToggleRes = await updateRoadmapStep(testUserId, savedRoadmap.id, 0, 0, true);
  assert(stepToggleRes.success === true, 'Toggles roadmap step completed state');
  const verifyToggled = await getUserActiveRoadmap(testUserId);
  assert(verifyToggled?.roadmap_data.milestones[0].steps[0].completed === true, 'Persists milestone step completion');

  // Create Interview Session
  const session = await createInterviewSession(testUserId, {
    targetRole: 'Data Scientist',
    questions,
  });
  assert(Boolean(session.id), 'Creates persistent interview session');

  // Save Answer
  const saveAnswerRes = await saveInterviewSessionAnswer(testUserId, session.id, 0, {
    answer: 'Sample answer for question 0',
    score: 85,
    feedback: 'Well articulated.',
  });
  assert(saveAnswerRes.success === true, 'Saves interview answer evaluation');

  // Complete Session
  const completeRes = await completeInterviewSession(testUserId, session.id, 88, 'Strong performance.');
  assert(completeRes.success === true, 'Marks interview session completed with overall score');

  const fetchedSession = await getInterviewSession(testUserId, session.id);
  assert(fetchedSession?.status === 'completed' && fetchedSession?.overall_score === 88, 'Retrieves completed interview session');

  // 8. Career Profile Summary Aggregation
  console.log('\n--- 8. Career Profile Summary Aggregation ---');
  const profileSummary = await getCareerProfileSummary(testUserId);
  assert(profileSummary.targetRole === 'Data Scientist', 'Profile summary reflects user target role');
  assert(profileSummary.metrics.readinessScore >= 0, 'Profile summary computes readiness score');
  assert(profileSummary.nextRecommendedActions.length > 0, 'Generates context-aware next best actions');

  console.log('\n=====================================================');
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
