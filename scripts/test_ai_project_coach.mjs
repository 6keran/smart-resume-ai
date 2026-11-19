import Module from 'node:module';
import assert from 'node:assert';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

console.log('🧪 Starting AI Project Coach Verification Suite...\n');

let passCount = 0;
let failCount = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

async function run() {
  const {
    getRecommendedProjects,
    getProjectRecommendations,
    generateProjectSpecification,
    getAiCodingMentorResponse,
    buildStandardProjectMilestones,
    generateProjectResumeBullets,
    determineStudentSkillLevel,
    generateProjectFolderStructure,
    generateProjectArchitectureGuidance,
    generateCoachResumeBullets,
    generatePortfolioGuidance,
    generateProjectInterviewPrep,
  } = await import('../src/server/services/projectMentor.ts');

  // Test 1: Backward Compatibility - Verify all original functions are preserved
  await test('Backward Compatibility: All legacy Project Mentor functions and aliases exist and run', () => {
    assert.strictEqual(typeof getProjectRecommendations, 'function');
    assert.strictEqual(typeof getRecommendedProjects, 'function');
    assert.strictEqual(typeof generateProjectSpecification, 'function');
    assert.strictEqual(typeof getAiCodingMentorResponse, 'function');
    assert.strictEqual(typeof buildStandardProjectMilestones, 'function');
    assert.strictEqual(typeof generateProjectResumeBullets, 'function');

    // Test milestones builder
    const milestones = buildStandardProjectMilestones('Collaborative App', ['Next.js', 'PostgreSQL']);
    assert.ok(Array.isArray(milestones));
    assert.strictEqual(milestones.length, 8);
    assert.strictEqual(milestones[0].id, 1);

    // Test legacy resume bullet builder
    const mockProj = {
      id: 'p1',
      userId: 'u1',
      title: 'E-Commerce Platform',
      targetRole: 'Full Stack Engineer',
      techStack: ['React', 'Node.js', 'PostgreSQL', 'Docker'],
      difficulty: 'Intermediate',
      status: 'completed',
      milestoneProgress: 100,
      milestones: [{ id: 1, isCompleted: true }],
    };
    const bullets = generateProjectResumeBullets(mockProj);
    assert.ok(bullets && Array.isArray(bullets.bullets));
    assert.ok(bullets.bullets.length >= 3);
  });

  // Test 2: Skill Level Determination & Overengineering Guard
  await test('Level Determination: Correctly assigns Beginner vs Advanced and avoids overengineering', () => {
    // Beginner: 0 projects, 0 verified skills, low readiness
    const beginnerContext = {
      projects: { completedCount: 0, inProgressCount: 0 },
      academic: { documentedProjects: [] },
      readiness: { overallScore: 35 },
      skills: { verified: [] },
    };
    assert.strictEqual(determineStudentSkillLevel(beginnerContext), 'Beginner');

    // Intermediate: 1 completed project
    const interContext = {
      projects: { completedCount: 1, inProgressCount: 0 },
      academic: { documentedProjects: [] },
      readiness: { overallScore: 55 },
      skills: { verified: [{ name: 'React' }] },
    };
    assert.strictEqual(determineStudentSkillLevel(interContext), 'Intermediate');

    // Advanced: 3+ projects, high readiness, multiple verified skills
    const advContext = {
      projects: { completedCount: 3, inProgressCount: 1 },
      academic: { documentedProjects: [{ title: 'P1' }] },
      readiness: { overallScore: 82 },
      skills: { verified: [{ name: 'React' }, { name: 'Node.js' }] },
    };
    assert.strictEqual(determineStudentSkillLevel(advContext), 'Advanced');
  });

  // Test 3: Resume Bullet Rules - "DRAFT - EDIT AFTER BUILDING" & Anti-Fabrication
  await test('Resume Bullet Rules: Strictly labeled DRAFT - EDIT AFTER BUILDING with zero fabricated metrics', () => {
    const draft = generateCoachResumeBullets('Real-Time App', 'Full Stack Engineer', ['Next.js', 'TypeScript', 'PostgreSQL'], 'Intermediate');

    assert.strictEqual(draft.label, 'DRAFT - EDIT AFTER BUILDING');
    assert.ok(Array.isArray(draft.bullets));
    assert.ok(draft.bullets.length >= 3);
    assert.ok(draft.disclaimer.includes('Google XYZ format'));

    for (const bullet of draft.bullets) {
      assert.ok(bullet.startsWith('DRAFT - EDIT AFTER BUILDING:'));
      // Verify no fabricated percentages or metrics
      assert.ok(!bullet.includes('%'), 'Must not contain synthetic percentages');
      assert.ok(!bullet.includes('$'), 'Must not contain synthetic dollar amounts');
      assert.ok(!bullet.includes('reduced latency by'), 'Must not claim unmeasured latency drops');
      assert.ok(!bullet.includes('10k users'), 'Must not fabricate user counts');
    }
  });

  // Test 4: Architecture Guidance & Folder Structure - Mechanical vs Software
  await test('Architecture Guidance: Provides realistic folder structures, components, DB, and deployment for roles', () => {
    // Software guidance
    const swArch = generateProjectArchitectureGuidance('SaaS Platform', ['Next.js', 'PostgreSQL', 'Redis'], 'Full Stack Engineer');
    assert.ok(swArch.folderStructure.includes('src/'));
    assert.ok(swArch.folderStructure.includes('components/'));
    assert.ok(swArch.folderStructure.includes('server/'));
    assert.ok(swArch.componentArchitecture.clientLayers.some((l) => l.includes('Next.js')));
    assert.ok(swArch.databaseDesign.entities.length >= 3);
    assert.ok(swArch.testingStrategy.unitTests.length > 0);
    assert.ok(swArch.deploymentStrategy.steps.length > 0);

    // Mechanical / CAD guidance
    const cadArch = generateProjectArchitectureGuidance('Chassis Bracket', ['SolidWorks', 'ANSYS', 'AutoCAD'], 'Mechanical / CAD Engineer');
    assert.ok(cadArch.folderStructure.includes('cad/'));
    assert.ok(cadArch.folderStructure.includes('models/'));
    assert.ok(cadArch.folderStructure.includes('simulations/'));
    assert.ok(cadArch.componentArchitecture.clientLayers.some((l) => l.includes('SolidWorks') || l.includes('CAD')));
    assert.ok(cadArch.databaseDesign.entities.some((e) => e.name.includes('materials') || e.name.includes('load_case')));
    assert.ok(cadArch.testingStrategy.unitTests.some((t) => t.includes('FEA') || t.includes('hand-calculation')));
  });

  // Test 5: Interview Coaching - Technical, Architecture, Trade-off, Scalability, STAR
  await test('Interview Coaching: generateProjectInterviewPrep produces 5 comprehensive question archetypes with STAR guidance', () => {
    const questions = generateProjectInterviewPrep(
      'Distributed Cache Engine',
      ['TypeScript', 'Redis', 'Docker', 'Jest'],
      'Software Engineer'
    );

    assert.ok(Array.isArray(questions));
    assert.strictEqual(questions.length, 5);

    const types = questions.map((q) => q.type);
    assert.ok(types.includes('technical'));
    assert.ok(types.includes('architecture'));
    assert.ok(types.includes('tradeoff'));
    assert.ok(types.includes('scalability'));
    assert.ok(types.includes('star_behavioral'));

    for (const q of questions) {
      assert.ok(q.question.length > 20);
      assert.ok(Array.isArray(q.keyConcepts) && q.keyConcepts.length > 0);
      assert.ok(q.starDiscussionGuidance.situation.length > 0);
      assert.ok(q.starDiscussionGuidance.task.length > 0);
      assert.ok(q.starDiscussionGuidance.action.length > 0);
      assert.ok(q.starDiscussionGuidance.result.length > 0);
    }
  });

  // Test 6: Portfolio Presentation Guidance
  await test('Portfolio Guidance: Produces README structure, demo video tips, and GitHub presentation tips', () => {
    const portfolio = generatePortfolioGuidance('Collaborative Canvas', ['React', 'WebSocket']);
    assert.ok(portfolio.readmeStructure.length >= 4);
    assert.ok(portfolio.demoVideoPointers.length >= 3);
    assert.ok(portfolio.githubPresentationTips.length >= 3);
    assert.ok(portfolio.readmeStructure.some((s) => s.includes('Architecture Diagram')));
    assert.ok(portfolio.demoVideoPointers.some((p) => p.includes('2 minutes')));
  });

  console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error running AI Project Coach test suite:', err);
  process.exit(1);
});
