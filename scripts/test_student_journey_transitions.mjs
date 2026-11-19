import assert from 'node:assert';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Setup isolated database sandbox to protect data/smart_resume.db
setupTestDb('student_journey_transitions');

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

console.log('================================================================');
console.log('🔄 SMART RESUME AI: PHASE 5B STUDENT JOURNEY TRANSITIONS AUDIT');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] Step ${passed}: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}:`, error);
}

async function runTransitionsAudit() {
  const {
    registerUser,
    upsertStudentProfile,
    getStudentProfile,
    getUserCareerGoal,
    getUserCareerDataSnapshot,
    saveUserResume,
    getUserResumes,
    recordResumeAnalysis,
    createGuidedProject,
    getGuidedProjectById,
    updateGuidedProject,
    importGuidedProjectToProfileAndResume,
    createInterviewSession,
    completeInterviewSession,
    getUserReadinessHistory,
    saveUserRoadmap,
    updateRoadmapStep,
    addUserSkill,
  } = await import('../src/server/db/index.ts');

  const {
    buildUnifiedStudentContext,
    mapUnifiedToCareerProfileSummary,
    clearStudentContextCache,
  } = await import('../src/server/services/unifiedStudentContext.ts');

  const { calculateDeterministicAtsScore } = await import('../src/server/services/deterministicAtsEngine.ts');
  const {
    performSkillGapAnalysis,
    generateLearningRoadmap,
    generateInterviewQuestions,
    evaluateInterviewAnswer,
    calculateExplainableReadiness,
  } = await import('../src/server/services/careerIntelligence.ts');

  const {
    getAiProjectCoachRecommendations,
    getAiCodingMentorResponse,
    generateProjectResumeBullets,
  } = await import('../src/server/services/projectMentor.ts');

  const timestamp = Date.now();
  const testEmail = `journey.student.${timestamp}@stanford.edu`;
  const regResult = await registerUser({
    name: 'Jordan Lee',
    email: testEmail,
    password: 'SecureStudentPass2026!',
  });
  const userId = regResult.user.id;

  console.log(`Created test candidate: Jordan Lee (${userId})\n`);

  // =========================================================================
  // TRANSITION 1: Profile Creation & Unified Context Sync
  // =========================================================================
  console.log('--- Transition 1: Student Profile -> Unified Context Sync ---');
  try {
    await upsertStudentProfile(userId, {
      institution: 'Stanford University',
      degree: 'B.S. in Computer Science',
      fieldOfStudy: 'Distributed Systems',
      graduationYear: 2026,
      graduationMonth: 'June',
      currentSemester: 'Semester 7',
      cgpa: '3.92',
      studentType: 'college_student',
      targetRole: 'Full Stack Developer',
      targetWorkType: 'both',
      preferredLocations: ['San Francisco, CA', 'Remote'],
      coursework: ['Distributed Systems', 'Algorithms', 'Databases', 'Cloud Computing'],
      achievements: ['Dean\'s Honor List 2025', 'Hackathon 1st Place'],
      projects: [
        {
          id: 'proj_cache_01',
          title: 'High-Throughput Redis Cache Engine',
          description: 'Distributed memory caching microservice with pipelined reads.',
          role: 'Sole Architect',
          techStack: ['TypeScript', 'Node.js', 'Redis', 'Docker'],
          repoUrl: 'https://github.com/jordanlee/redis-cache',
          liveUrl: 'https://cache.jordanlee.dev',
          highlights: ['Slashed retrieval latency by 45%', 'Handled 5,000 req/sec benchmark'],
        },
      ],
    });

    await addUserSkill(userId, 'TypeScript', 'Programming', true, { confirmedAt: new Date().toISOString() });
    await addUserSkill(userId, 'React', 'Frontend', true, { confirmedAt: new Date().toISOString() });
    await addUserSkill(userId, 'Node.js', 'Backend', true, { confirmedAt: new Date().toISOString() });
    await addUserSkill(userId, 'PostgreSQL', 'Database', true, { confirmedAt: new Date().toISOString() });

    clearStudentContextCache(userId);
    const profile = await getStudentProfile(userId);
    assert.strictEqual(profile?.institution, 'Stanford University', 'Institution preserved in DB');

    const goal = await getUserCareerGoal(userId);
    assert.strictEqual(goal?.target_role, 'Full Stack Developer', 'Goal target role synchronized');

    const unified = await buildUnifiedStudentContext(userId);
    assert.strictEqual(unified.academic.institution, 'Stanford University');
    assert.strictEqual(unified.academic.documentedProjects.length, 1);
    assert.strictEqual(unified.careerGoal.targetRole, 'Full Stack Developer');
    assert.strictEqual(unified.skills.verified.length + unified.skills.confirmed.length + unified.skills.claimed.length >= 4, true);

    pass('Profile Creation & Context Sync', 'Profile fields & career goals synchronized in UnifiedStudentContext');
  } catch (err) {
    fail('Transition 1: Profile Creation & Context Sync', err);
    throw err;
  }

  // =========================================================================
  // TRANSITION 2: Profile -> Resume Builder Data Synthesis
  // =========================================================================
  console.log('\n--- Transition 2: Profile -> Resume Builder Import & Synthesis ---');
  let savedResumeId = '';
  try {
    const snapshot = await getUserCareerDataSnapshot(userId);
    assert.ok(snapshot.profile, 'Profile data present in snapshot');
    assert.ok(snapshot.skills.length >= 4, 'Skills present in snapshot');

    // Synthesize structured resume data from profile snapshot
    const resumePayload = {
      title: 'Jordan Lee - Software Engineer Resume',
      candidateType: 'fresher',
      personalInfo: {
        fullName: snapshot.account?.name || 'Jordan Lee',
        email: snapshot.account?.email || testEmail,
        phone: '+1 (555) 234-5678',
        location: 'San Francisco, CA',
        headline: snapshot.targetRole || 'Full Stack Developer',
      },
      summary: `Stanford University Computer Science student specializing in distributed systems and full-stack development with TypeScript, React, and Node.js.`,
      education: [
        {
          id: `edu_${Date.now()}`,
          degree: snapshot.profile?.degree || 'B.S. in Computer Science',
          institution: snapshot.profile?.institution || 'Stanford University',
          graduationYear: String(snapshot.profile?.graduationYear || '2026'),
          gpa: snapshot.profile?.cgpa || '3.92',
        },
      ],
      experience: [],
      projects: (snapshot.profile?.projects || []).map((p, idx) => ({
        id: `proj_${Date.now()}_${idx}`,
        title: p.title,
        description: p.description,
        technologies: p.techStack,
        link: p.repoUrl,
        bullets: p.highlights,
      })),
      skills: {
        technical: snapshot.skills.map((s) => s.name),
        soft: ['Problem Solving', 'System Design', 'Collaboration'],
        tools: ['Git', 'Docker', 'Linux', 'VS Code'],
      },
      certifications: [],
    };

    const saved = await saveUserResume(userId, {
      title: resumePayload.title,
      resumeData: resumePayload,
    });
    assert.ok(saved?.id, 'Resume saved to DB');
    savedResumeId = saved.id;

    const resumes = await getUserResumes(userId);
    assert.ok(resumes.some((r) => r.id === savedResumeId), 'Saved resume listed for user');

    pass('Profile -> Resume Builder Import', `Imported education & project from profile into resume ID: ${savedResumeId}`);
  } catch (err) {
    fail('Transition 2: Profile -> Resume Builder Import', err);
    throw err;
  }

  // =========================================================================
  // TRANSITION 3: Resume -> ATS Evaluation
  // =========================================================================
  console.log('\n--- Transition 3: Resume -> ATS Evaluation ---');
  let atsScoreResult = 0;
  try {
    const resumeContent = `Jordan Lee | Stanford University | Class of 2026 | GPA: 3.92
Email: ${testEmail} | San Francisco, CA | Full Stack Developer
Education: Bachelor of Science in Computer Science, Stanford University.
Summary: Full Stack Developer with experience in TypeScript, React, Node.js, PostgreSQL, Docker, Redis.
Projects:
High-Throughput Redis Cache Engine: Engineered distributed caching service with TypeScript and Redis pipelining.
Skills: TypeScript, React, Node.js, PostgreSQL, Docker, Redis, REST APIs, Git, Linux.`;

    const targetJobDesc = `We are looking for a Junior Full Stack Developer proficient in TypeScript, React, Node.js, and relational databases like PostgreSQL. Docker and Redis experience is a plus.`;

    const atsResult = calculateDeterministicAtsScore(
      resumeContent,
      targetJobDesc,
      'Full Stack Developer'
    );

    assert.ok(typeof atsResult.overallAtsScore === 'number' && atsResult.overallAtsScore > 0, 'ATS overall score computed');
    atsScoreResult = atsResult.overallAtsScore;
    assert.ok(atsResult.detectedKeywords.length >= 4, 'Keywords extracted from resume');

    // Save ATS analysis record to DB
    await recordResumeAnalysis({
      userId,
      resumeId: savedResumeId,
      fileType: 'raw-text',
      atsScore: atsResult.overallAtsScore,
      keywordScore: atsResult.keywordMatchScore,
      formattingScore: atsResult.formattingScore,
      sectionScore: atsResult.sectionScore,
      analysisStatus: 'COMPLETED',
      detectedKeywords: atsResult.detectedKeywords,
      missingKeywords: atsResult.missingKeywords,
      recommendations: (atsResult.recommendations || []).map((r) => r.feedback),
    });

    clearStudentContextCache(userId);
    const updatedUnified = await buildUnifiedStudentContext(userId);
    assert.strictEqual(updatedUnified.resume.hasResume, true);
    assert.strictEqual(updatedUnified.resume.latestAtsScore, atsResult.overallAtsScore);

    pass('Resume -> ATS Evaluation', `ATS Score: ${atsResult.overallAtsScore}/100, Detected: ${atsResult.detectedKeywords.length} keywords`);
  } catch (err) {
    fail('Transition 3: Resume -> ATS Evaluation', err);
    throw err;
  }

  // =========================================================================
  // TRANSITION 4: ATS -> Skill Gap Analysis
  // =========================================================================
  console.log('\n--- Transition 4: ATS -> Skill Gap Analysis ---');
  try {
    clearStudentContextCache(userId);
    const summary = await mapUnifiedToCareerProfileSummary(await buildUnifiedStudentContext(userId));
    const currentSkills = [
      ...summary.skills.verified.map((v) => v.name),
      ...summary.skills.claimed.map((c) => c.name),
      ...summary.skills.inferred.map((i) => i.name),
    ];

    const gapResult = await performSkillGapAnalysis(currentSkills, 'Full Stack Developer');
    assert.ok(gapResult.matchingSkills.length >= 3, 'Matching skills identified against role spec');
    assert.ok(Array.isArray(gapResult.missingCriticalSkills), 'Missing critical skills array returned');
    assert.ok(typeof gapResult.readinessScore === 'number', 'Readiness score calculated');

    pass('ATS -> Skill Gap Analysis', `${gapResult.matchingSkills.length} matches, ${gapResult.missingCriticalSkills.length} critical gaps identified`);
  } catch (err) {
    fail('Transition 4: ATS -> Skill Gap Analysis', err);
    throw err;
  }

  // =========================================================================
  // TRANSITION 5: Skill Gap Analysis -> Learning Roadmap
  // =========================================================================
  console.log('\n--- Transition 5: Skill Gap Analysis -> Learning Roadmap ---');
  let recommendedBlueprints = [];
  try {
    const roadmap = await generateLearningRoadmap('Full Stack Developer');
    assert.ok(Array.isArray(roadmap.milestones) && roadmap.milestones.length >= 3, 'Milestones generated');
    assert.ok(Array.isArray(roadmap.portfolioProjects) && roadmap.portfolioProjects.length >= 2, 'Portfolio projects included');
    recommendedBlueprints = roadmap.portfolioProjects;

    // Persist active roadmap
    const savedRoadmap = await saveUserRoadmap(userId, 'Full Stack Developer', roadmap);
    assert.ok(savedRoadmap?.id, 'Roadmap persisted');

    await updateRoadmapStep(userId, savedRoadmap.id, 0, 0, true);

    clearStudentContextCache(userId);
    const updatedUnified = await buildUnifiedStudentContext(userId);
    assert.strictEqual(updatedUnified.learning.hasActiveRoadmap, true);
    assert.strictEqual(updatedUnified.learning.targetRole, 'Full Stack Developer');

    pass('Skill Gap -> Learning Roadmap', `Active 4-phase curriculum & ${recommendedBlueprints.length} project blueprints persisted`);
  } catch (err) {
    fail('Transition 5: Skill Gap -> Learning Roadmap', err);
    throw err;
  }

  // =========================================================================
  // TRANSITION 6: Learning Roadmap -> Project Coach & Resume Export
  // =========================================================================
  console.log('\n--- Transition 6: Learning Roadmap -> Project Coach & Resume Export ---');
  let guidedProjId = '';
  try {
    const blueprint = recommendedBlueprints[0] || {
      title: 'Real-Time Collaborative Document Studio',
      difficulty: 'Intermediate',
      techStack: ['TypeScript', 'Next.js', 'PostgreSQL', 'WebSockets'],
      problemStatement: 'Engineered collaborative editor supporting operational transformation.',
      realWorldUseCase: 'Enterprise documentation platform.',
      architectureHighlights: 'Microservices with Redis pub/sub.',
      suggestedResumeBullets: ['Architected real-time WebSocket protocol supporting 100+ concurrent editors.'],
    };

    const newProject = await createGuidedProject(userId, {
      title: blueprint.title,
      difficulty: blueprint.difficulty || 'Intermediate',
      targetRole: 'Full Stack Developer',
      techStack: blueprint.techStack || ['TypeScript', 'Next.js', 'PostgreSQL'],
      problemStatement: blueprint.problemStatement || 'Real-time collaborative editing',
      realWorldUseCase: blueprint.realWorldUseCase || 'Team knowledge base',
      architectureOverview: blueprint.architectureHighlights || 'Next.js client with PostgreSQL backend',
      milestones: [
        { id: 'm-1', title: 'Data Architecture & Schema', status: 'completed' },
        { id: 'm-2', title: 'WebSocket Transport Layer', status: 'completed' },
        { id: 'm-3', title: 'Operational Transformation Engine', status: 'in_progress' },
      ],
      currentMilestone: 3,
      progressPercent: 75,
      status: 'in_progress',
    });

    assert.ok(newProject?.id, 'Guided project created in DB');
    guidedProjId = newProject.id;

    // AI Project Coach Recommendations
    const coachRecs = await getAiProjectCoachRecommendations(userId);
    assert.ok(coachRecs.recommendations.length > 0, 'AI Project Coach recommendations produced');
    const rec1 = coachRecs.recommendations[0];
    assert.ok(Array.isArray(rec1.techStack) && rec1.techStack.length > 0, 'Tech stack guidance provided');
    assert.ok(rec1.architectureGuidance?.testingStrategy, 'Testing strategy provided');
    assert.ok(rec1.architectureGuidance?.folderStructure && rec1.architectureGuidance.folderStructure.length > 10, 'Folder structure provided');
    assert.ok(rec1.resumeBulletDrafts?.bullets && rec1.resumeBulletDrafts.bullets.length > 0, 'Prospective bullets provided');

    // AI Coding Mentor Consultation
    const mentorReply = await getAiCodingMentorResponse({
      projectId: guidedProjId,
      userMessage: 'How should I structure the WebSocket reconnection logic with exponential backoff?',
      userId,
    });
    assert.ok(mentorReply.reply && mentorReply.reply.length > 20, 'AI Coding Mentor replied with actionable guidance');

    // Complete project and export to resume
    await updateGuidedProject(guidedProjId, userId, {
      currentMilestone: 3,
      progressPercent: 100,
      status: 'completed',
    });

    const currentProfile = await getStudentProfile(userId);
    const bulletGen = generateProjectResumeBullets(newProject, currentProfile);
    assert.ok(bulletGen.bullets.length > 0, 'Generated verified Google XYZ resume bullets');

    const exportResult = await importGuidedProjectToProfileAndResume(userId, guidedProjId);
    assert.strictEqual(exportResult.studentProfileUpdated, true, 'Student profile portfolio updated with project');
    assert.strictEqual(exportResult.resumeUpdated, true, 'Resume builder document updated with project');

    pass('Roadmap -> Project Coach & Export', `Built "${blueprint.title}" (100%), exported to profile & resume`);
  } catch (err) {
    fail('Transition 6: Roadmap -> Project Coach & Export', err);
    throw err;
  }

  // =========================================================================
  // TRANSITION 7: Project Coach -> Interview Preparation
  // =========================================================================
  console.log('\n--- Transition 7: Project Coach -> Interview Preparation ---');
  let interviewSessionId = '';
  try {
    const project = await getGuidedProjectById(guidedProjId, userId);
    assert.ok(project, 'Loaded guided project for interview prep');

    const questions = await generateInterviewQuestions(
      'Full Stack Developer',
      undefined,
      `Project Under Focus: ${project.title} (${project.techStack.join(', ')}). Architecture: ${project.architectureOverview}`
    );
    assert.ok(Array.isArray(questions) && questions.length >= 3, 'Generated interview questions');

    const session = await createInterviewSession(userId, {
      targetRole: 'Full Stack Developer',
      jobTitle: 'Junior Full Stack Engineer',
      company: 'TechCorp',
      questions,
    });
    assert.ok(session?.id, 'Interview session created in DB');
    interviewSessionId = session.id;

    // Evaluate response for Question 1
    const q1 = questions[0];
    const candidateAnswer = `In my project "${project.title}", I built the data synchronization layer using PostgreSQL and Redis. To guarantee consistency during concurrent edits, I used Redis atomic operations and database transactions, reducing collision rates by 90%.`;

    const evalResult = await evaluateInterviewAnswer(q1, candidateAnswer, 'Full Stack Developer');
    assert.ok(typeof evalResult.score === 'number' && evalResult.score >= 0, 'Answer evaluation score computed');
    assert.ok(evalResult.strengths.length > 0, 'Strengths surfaced');

    // Complete interview session
    await completeInterviewSession(
      userId,
      interviewSessionId,
      evalResult.score,
      'Solid technical breakdown referencing concrete project design choices.'
    );

    clearStudentContextCache(userId);
    const updatedUnified = await buildUnifiedStudentContext(userId);
    assert.strictEqual(updatedUnified.interviews.completedSessions >= 1, true, 'Completed interview session counted');
    assert.strictEqual(typeof updatedUnified.interviews.averageScore === 'number', true, 'Average interview score tracked');

    pass('Project Coach -> Interview Prep', `Conducted mock interview session: Score ${evalResult.score}/100 grounded in capstone project`);
  } catch (err) {
    fail('Transition 7: Project Coach -> Interview Prep', err);
    throw err;
  }

  // =========================================================================
  // TRANSITION 8: Interview Preparation -> Job Readiness Synthesis
  // =========================================================================
  console.log('\n--- Transition 8: Interview Preparation -> Job Readiness Synthesis ---');
  try {
    clearStudentContextCache(userId);
    const finalUnified = await buildUnifiedStudentContext(userId);
    const readiness = finalUnified.readiness;

    assert.ok(typeof readiness.overallScore === 'number' && readiness.overallScore >= 0 && readiness.overallScore <= 100, 'Overall readiness score valid');
    assert.ok(readiness.quadrants.technicalCompetency.score >= 50, 'Technical Competency quadrant populated');
    assert.ok(readiness.quadrants.projectEvidence.score >= 60, 'Project Evidence quadrant populated from capstones');
    assert.ok(readiness.quadrants.resumeAts.score >= 50, 'Resume ATS quadrant populated from analysis');
    assert.ok(readiness.quadrants.interviewFluency.score >= 50, 'Interview Fluency quadrant populated from mock session');

    // Verify historical snapshots
    const history = await getUserReadinessHistory(userId);
    assert.ok(Array.isArray(history) && history.length >= 3, 'Historical readiness snapshots recorded');
    const snapshotTriggers = history.map((h) => h.triggerActivity);
    console.log(`    Readiness snapshots recorded: [${snapshotTriggers.join(', ')}]`);

    pass('Interview Prep -> Job Readiness', `Overall Score: ${readiness.overallScore}/100, Level: "${readiness.overallLevel}", ${history.length} audit snapshots`);
  } catch (err) {
    fail('Transition 8: Interview Prep -> Job Readiness', err);
    throw err;
  }

  console.log('\n================================================================');
  console.log(`TOTAL STUDENT JOURNEY TRANSITION TESTS: 8 | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTransitionsAudit().catch((err) => {
  console.error('Fatal test error in student journey transitions audit:', err);
  process.exit(1);
});
