import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const { getDb, registerUser } = await import('../src/server/db/index.js');
const { getUnifiedStudentContext } = await import('../src/server/services/unifiedStudentContext.js');
const { generateProactiveCareerActions } = await import('../src/server/services/careerActionEngine.js');
const { performAdvancedResumeAudit } = await import('../src/server/services/resumeIntelligence.js');
const { generateInterviewQuestions, evaluateInterviewAnswer } = await import('../src/server/services/careerIntelligence.js');

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

async function runNextGenIntelligenceTests() {
  console.log('================================================================');
  console.log('🧠 SMART RESUME AI: NEXT-GENERATION INTELLIGENCE TEST SUITE');
  console.log('================================================================\n');

  const db = getDb();
  const testEmail = `nextgen.student.${Date.now()}@university.edu`;

  // 1. Create Test User
  console.log('--- Test 1: User Account & Authoritative Data Seeding ---');
  const regResult = await registerUser({
    name: 'Priya Sharma',
    email: testEmail,
    password: 'SecurePassword123!',
    role: 'USER',
  });
  const user = regResult.user;
  assert(Boolean(user && user.id), `Registered student Priya Sharma (ID: ${user.id})`);

  // Seed Student Profile
  const profileId = `sp_${Date.now()}`;
  db.prepare(`
    INSERT INTO student_profiles (
      id, user_id, institution, degree, field_of_study, graduation_year,
      graduation_month, current_semester, cgpa, target_role, target_work_type,
      coursework, projects_data, preferred_locations, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    profileId,
    user.id,
    'Georgia Institute of Technology',
    'B.S. in Computer Science',
    'Computer Science',
    2026,
    'May',
    'Semester 6',
    '3.85',
    'Junior Full Stack Developer',
    'internship',
    JSON.stringify(['Data Structures', 'Algorithms', 'Computer Systems and Networks', 'Database Systems']),
    JSON.stringify([
      {
        id: 'p1',
        title: 'Microservices E-Commerce API',
        description: 'Engineered high-throughput checkout service handling 5,000 req/sec with Redis caching.',
        techStack: ['Node.js', 'PostgreSQL', 'Redis', 'Docker'],
        repoUrl: 'https://github.com/priyasharma/ecommerce-api',
      },
    ]),
    JSON.stringify(['San Francisco, CA', 'Remote']),
    new Date().toISOString(),
    new Date().toISOString()
  );
  assert(true, 'Seeded authentic student academic profile with degree, coursework, and projects');

  // Seed Claimed Skill
  const skillId = `usk_${Date.now()}`;
  db.prepare(`
    INSERT INTO user_skills (id, user_id, skill_name, category, status, claimed_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    skillId,
    user.id,
    'React',
    'Frontend',
    'claimed',
    new Date().toISOString(),
    new Date().toISOString(),
    new Date().toISOString()
  );
  assert(true, 'Seeded claimed skill: React');

  // 2. Test Unified Student Context
  console.log('\n--- Test 2: Unified Student Context Engine ---');
  const context = await getUnifiedStudentContext(user.id);

  assert(context.userId === user.id, 'Context correctly maps authenticated userId');
  assert(context.name === 'Priya Sharma', 'Context captures authentic candidate name');
  assert(context.careerGoal.targetRole === 'Junior Full Stack Developer', 'Context resolves active target role');
  assert(context.academic?.institution === 'Georgia Institute of Technology', 'Context synthesizes academic institution');
  assert(context.academic?.graduationYear === 2026, 'Context reflects graduation year 2026');
  assert(context.skills.claimed.some((c) => c.name === 'React'), 'Context includes claimed skill React');
  assert(context.skills.inferred.some((i) => i.name.toLowerCase() === 'redis'), 'Context infers Redis from student projects');
  assert(context.skills.needingAssessment.includes('React'), 'Context flags React as needing assessment');
  assert(context.readiness.overallScore > 0, `Computed explainable readiness score: ${context.readiness.overallScore}/100`);

  // 3. Test Proactive Career Action Engine
  console.log('\n--- Test 3: Proactive Career Action Engine ---');
  const actionPlan = generateProactiveCareerActions(context);

  assert(actionPlan.totalActionsCount > 0, `Generated ${actionPlan.totalActionsCount} proactive actions`);
  assert(actionPlan.highPriorityCount > 0, `Identified ${actionPlan.highPriorityCount} high-priority recommendations`);

  // Verify all 5 mandatory action properties
  for (const act of actionPlan.actions) {
    const hasWhy = typeof act.why === 'string' && act.why.length > 10;
    const hasEvidence = typeof act.evidence === 'string' && act.evidence.length > 5;
    const hasBenefit = typeof act.expectedBenefit === 'string' && act.expectedBenefit.length > 5;
    const hasAction = typeof act.concreteNextAction === 'string' && act.concreteNextAction.length > 5;
    const hasHref = typeof act.href === 'string' && act.href.startsWith('/');

    assert(
      hasWhy && hasEvidence && hasBenefit && hasAction && hasHref,
      `Action "${act.title}" (${act.category}) fulfills why, evidence, benefit, nextAction, and href`
    );
  }

  // 4. Test Advanced Resume Intelligence & Section Audit
  console.log('\n--- Test 4: Advanced Resume Intelligence (Section Scoring & Evidence Check) ---');
  const sampleResume = `
Priya Sharma
Atlanta, GA | priya.sharma@gatech.edu | (404) 555-0199 | linkedin.com/in/priyasharma | github.com/priyasharma

Professional Summary
Computer Science junior at Georgia Tech with strong full-stack skills in React and Node.js. Seeking Software Engineering Internship.

Education
Bachelor of Science in Computer Science | Georgia Institute of Technology | Expected May 2026

Technical Skills
Languages & Tools: JavaScript, TypeScript, React, Python, Docker, Kubernetes, GraphQL

Projects
Microservices E-Commerce API
• Engineered a distributed checkout service handling 5,000 req/sec, reducing p99 latency by 32%.
• Integrated Redis caching to eliminate 45% of redundant database queries.
• Deployed Docker containers with GitHub Actions automated CI/CD pipeline.
  `;

  const resumeAudit = performAdvancedResumeAudit(sampleResume, 'We need a Junior Full Stack Developer with React and Node.js skills.');

  assert(resumeAudit.overallAtsScore >= 70, `Overall ATS score evaluated: ${resumeAudit.overallAtsScore}/100`);
  assert(resumeAudit.sectionScores.header.score >= 80, `Header section scored: ${resumeAudit.sectionScores.header.score}/100`);
  assert(resumeAudit.sectionScores.experience.status !== undefined, 'Experience section status evaluated');
  assert(resumeAudit.sectionScores.projects.score >= 80, `Projects section scored: ${resumeAudit.sectionScores.projects.score}/100`);

  // Evidence check: Kubernetes & GraphQL are in Skills, but NOT in Projects
  const unbacked = resumeAudit.evidenceConsistency.unbackedSkills;
  assert(
    unbacked.some((u) => u.skill.toLowerCase() === 'kubernetes') ||
    unbacked.some((u) => u.skill.toLowerCase() === 'graphql'),
    'Evidence checker correctly detects skills claimed without project evidence (Kubernetes/GraphQL)'
  );

  // Readability & Metric Density
  assert(resumeAudit.readability.metricDensityPercentage > 0, `Metric density detected: ${resumeAudit.readability.metricDensityPercentage}%`);

  // 5. Test Adaptive Interview Coach
  console.log('\n--- Test 5: Adaptive Interview Coach ---');
  const questions = await generateInterviewQuestions('Junior Full Stack Developer');
  assert(questions.length >= 3, `Generated ${questions.length} structured interview questions`);

  const mockAnswer = 'In my e-commerce project, I used Redis as a caching layer in front of PostgreSQL. For frequently accessed product catalog pages, requests hit Redis first, which dropped our p99 response times from 180ms down to 24ms under 5,000 concurrent simulated users.';
  const evaluation = await evaluateInterviewAnswer(questions[0], mockAnswer, 'Junior Full Stack Developer');

  assert(typeof evaluation.score === 'number' && evaluation.score >= 60, `Answer scored: ${evaluation.score}/100`);
  assert(typeof evaluation.technicalAccuracyScore === 'number', `Technical accuracy: ${evaluation.technicalAccuracyScore}/100`);
  assert(typeof evaluation.communicationScore === 'number', `Communication score: ${evaluation.communicationScore}/100`);
  assert(
    typeof evaluation.disclaimer === 'string' && evaluation.disclaimer.includes('educational'),
    'Educational practice disclaimer present on evaluation'
  );

  // Cleanup
  db.prepare('DELETE FROM student_profiles WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM user_skills WHERE user_id = ?').run(user.id);
  db.prepare('DELETE FROM users WHERE id = ?').run(user.id);

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runNextGenIntelligenceTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
