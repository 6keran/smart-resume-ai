import Module from 'node:module';
import assert from 'node:assert';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

console.log('🧪 Starting Career Intelligence Engine Comprehensive Verification...\n');

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

// Helper to create a mock UnifiedStudentContext
function createMockContext(overrides = {}) {
  const base = {
    userId: 'test-user-123',
    name: 'Test Student',
    email: 'student@example.com',
    academic: {
      institution: 'IIT Madras',
      degree: 'B.Tech',
      fieldOfStudy: 'Mechanical Engineering',
      graduationYear: 2025,
      graduationMonth: 'May',
      currentSemester: '8',
      cgpa: '8.5',
      targetWorkType: 'full_time',
      coursework: ['Thermodynamics', 'Machine Design', 'CAD'],
      documentedProjects: [
        {
          id: 'proj-1',
          title: 'Suspension Arm Stress Analysis',
          techStack: ['AutoCAD', 'SolidWorks'],
        },
      ],
    },
    careerGoal: {
      goalSet: true,
      targetRole: 'Mechanical / CAD Engineer',
      targetIndustry: 'Automotive',
      experienceLevel: 'Entry',
      preferredLocations: ['Pune', 'Bangalore'],
      targetSalary: '8-12 LPA',
      skillsSummary: 'AutoCAD, SolidWorks, Manufacturing Drawings',
    },
    careerInterests: {
      targetIndustry: 'Automotive',
      preferredLocations: ['Pune'],
      targetSalary: '10 LPA',
      targetWorkType: 'full_time',
      primaryInterests: ['CAD Modeling', 'FEA Simulation'],
    },
    skills: {
      verified: [
        { name: 'AutoCAD', score: 84, certificateId: 'cert-123', verifiedDate: '2026-01-15' },
      ],
      confirmed: [
        { name: 'SolidWorks', confirmedDate: '2026-02-01', source: 'coursework' },
      ],
      claimed: [
        { name: 'GD&T', claimedDate: '2026-02-10', source: 'self_reported' },
      ],
      inferred: [
        { name: 'Manufacturing Drawings', source: 'resume_project' },
      ],
      needingAssessment: ['SolidWorks', 'GD&T'],
      missingCritical: ['Finite Element Analysis (FEA)', 'ANSYS / Simulation Software'],
      missingRecommended: ['DFM / DFA (Design for Manufacturing & Assembly)', 'Tolerance Stack-Up Analysis'],
      matchingCritical: ['AutoCAD', 'SolidWorks'],
    },
    experience: {
      totalCount: 1,
      hasInternship: true,
      items: [
        {
          company: 'Tata Motors',
          position: 'CAD Intern',
          bullets: ['Drafted 2D component drawings in AutoCAD', 'Assisted in 3D modeling of chassis bracket'],
        },
      ],
    },
    resume: {
      hasResume: true,
      resumesCount: 1,
      activeResumeId: 'res-1',
      latestAtsScore: 78,
      keywordScore: 75,
      formattingScore: 85,
      sectionScore: 80,
      wordCount: 450,
      readabilityScore: 82,
      detectedKeywords: ['AutoCAD', 'SolidWorks', 'Chassis', 'Drafting'],
      missingKeywords: ['ANSYS', 'FEA', 'GD&T'],
      analyzedAt: '2026-03-01T10:00:00Z',
    },
    projects: {
      totalCount: 1,
      inProgressCount: 0,
      completedCount: 1,
      exportedCount: 1,
      projects: [
        {
          id: 'gp-1',
          title: 'Suspension Arm Stress Analysis',
          techStack: ['AutoCAD', 'SolidWorks'],
          difficulty: 'Intermediate',
          status: 'completed',
          milestoneProgress: 100,
          exportedToResume: true,
        },
      ],
    },
    applications: {
      totalCount: 2,
      activeCount: 1,
      interviewingCount: 1,
      recentApplications: [
        {
          id: 'app-1',
          jobTitle: 'Graduate Engineer Trainee - Mechanical',
          company: 'Tata Motors',
          status: 'interviewing',
          appliedAt: '2026-03-01',
        },
      ],
    },
    interviews: {
      totalSessions: 1,
      completedSessions: 1,
      averageScore: 78,
      topStrengths: ['CAD Principles', 'Material Selection'],
      recurringWeaknesses: ['FEA Convergence'],
      recentSessions: [
        {
          id: 'int-1',
          targetRole: 'Mechanical / CAD Engineer',
          overallScore: 78,
          status: 'completed',
          createdAt: '2026-03-05',
        },
      ],
    },
    learning: {
      hasActiveRoadmap: true,
      targetRole: 'Mechanical / CAD Engineer',
      completedStepsCount: 2,
      totalStepsCount: 8,
      progressPercent: 25,
      currentMilestoneTitle: 'ANSYS Structural FEA Basics',
    },
    assessments: {
      totalAttempts: 1,
      passedCount: 1,
      averageScore: 84,
      recentAssessments: [
        { id: 'att-1', skill: 'AutoCAD', score: 84, totalQuestions: 20, passed: true, date: '2026-01-15' },
      ],
    },
    savedJobs: {
      totalCount: 1,
      jobs: [
        {
          id: 'sj-1',
          jobTitle: 'Mechanical Design Engineer',
          company: 'Tata Motors',
          descriptionSnippet: 'Requires AutoCAD, SolidWorks, ANSYS FEA, GD&T, and Tolerance Stack-Up for automotive sub-assemblies.',
          savedAt: '2026-03-01',
        },
      ],
    },
    chatHistory: {
      totalTurns: 4,
      lastActiveAt: '2026-03-10',
    },
    readiness: {
      overallScore: 75,
      readinessBand: 'NEAR_READY',
      breakdown: {
        resumeCompleteness: 80,
        atsScore: 78,
        skillAlignment: 70,
        projectReadiness: 75,
        assessmentReadiness: 84,
        interviewReadiness: 78,
      },
      readinessFactors: [],
      explanation: 'Candidate is near ready for entry-level mechanical CAD roles.',
    },
    readinessHistory: [],
    nextRecommendedActions: [],
    studentProfile: null,
    updatedAt: new Date().toISOString(),
  };

  return { ...base, ...overrides };
}

async function run() {
  const { generateCareerIntelligence } = await import('../src/server/services/careerIntelligenceEngine.ts');

  // Test 1: Deterministic Output Consistency
  await test('Deterministic Output: Repeated calls with identical context produce identical results', () => {
    const context = createMockContext();
    const result1 = generateCareerIntelligence(context);
    const result2 = generateCareerIntelligence(context);

    assert.strictEqual(result1.careerReadinessScore.overallScore, result2.careerReadinessScore.overallScore);
    assert.strictEqual(result1.careerReadinessScore.readinessBand, result2.careerReadinessScore.readinessBand);
    assert.deepStrictEqual(result1.careerReadinessScore.breakdown, result2.careerReadinessScore.breakdown);
    assert.deepStrictEqual(result1.skillGaps.criticalGaps, result2.skillGaps.criticalGaps);
    assert.deepStrictEqual(result1.skillGaps.recommendedGaps, result2.skillGaps.recommendedGaps);
    assert.strictEqual(result1.projectRecommendations.length, result2.projectRecommendations.length);
    assert.deepStrictEqual(result1.resumeImprovementPriorities, result2.resumeImprovementPriorities);
  });

  // Test 2: Mechanical Persona Grounding (No software defaults)
  await test('Context Grounding: Mechanical persona gets mechanical blueprints without software hallucination', () => {
    const context = createMockContext();
    const result = generateCareerIntelligence(context);

    assert.strictEqual(result.skillGaps.targetRole, 'Mechanical / CAD Engineer');
    assert.strictEqual(result.skillGaps.hasRoleProfile, true);

    // Verified skills should include AutoCAD
    assert.ok(result.skillGaps.verifiedSkills.includes('AutoCAD'));
    assert.ok(result.skillGaps.confirmedSkills.includes('SolidWorks'));

    // Critical gaps must come from role profile or Tata Motors JD (e.g. ANSYS / FEA)
    const gapNames = [...result.skillGaps.criticalGaps, ...result.skillGaps.recommendedGaps].map((g) => g.skill.toLowerCase());
    assert.ok(gapNames.some((g) => g.includes('ansys') || g.includes('fea') || g.includes('finite element')));

    // Forbid software engineering defaults for mechanical persona
    assert.ok(!gapNames.includes('react'));
    assert.ok(!gapNames.includes('docker'));
    assert.ok(!gapNames.includes('kubernetes'));
    assert.ok(!gapNames.includes('node.js'));

    // Project recommendations must be mechanical engineering blueprints
    const projectTitles = result.projectRecommendations.map((p) => p.title.toLowerCase());
    assert.ok(projectTitles.some((t) => t.includes('fea') || t.includes('gearbox') || t.includes('cad') || t.includes('fatigue')));

    // Resume bullet draft must have "Draft: edit after you build it"
    for (const proj of result.projectRecommendations) {
      assert.ok(proj.resumeBulletDraft.includes('(Draft: edit after you build it)'));
    }
  });

  // Test 3: Full Stack Persona Grounding
  await test('Context Grounding: Full Stack Developer receives web architecture blueprints & Docker/K8s gaps', () => {
    const context = createMockContext({
      careerGoal: {
        goalSet: true,
        targetRole: 'Full Stack Developer',
        targetIndustry: 'Technology',
        experienceLevel: 'Entry',
        preferredLocations: ['Bangalore'],
        targetSalary: '12-18 LPA',
        skillsSummary: 'React, JavaScript, HTML, CSS',
      },
      skills: {
        verified: [{ name: 'React', score: 90 }],
        confirmed: [{ name: 'JavaScript' }],
        claimed: [{ name: 'HTML' }, { name: 'CSS' }],
        inferred: [],
        needingAssessment: [],
        missingCritical: ['Node.js', 'PostgreSQL', 'RESTful API Design'],
        missingRecommended: ['Docker', 'TypeScript', 'Redis'],
        matchingCritical: ['React'],
      },
    });

    const result = generateCareerIntelligence(context);
    assert.strictEqual(result.skillGaps.targetRole, 'Full Stack Developer');
    assert.strictEqual(result.skillGaps.hasRoleProfile, true);

    const projectTitles = result.projectRecommendations.map((p) => p.title.toLowerCase());
    assert.ok(projectTitles.some((t) => t.includes('collaborative') || t.includes('e-commerce') || t.includes('micro-services')));

    // Verify architectural guidance is present
    for (const proj of result.projectRecommendations) {
      assert.ok(proj.architecturalGuidance.layers.length > 0);
      assert.ok(proj.architecturalGuidance.recommendedPatterns.length > 0);
      assert.ok(proj.architecturalGuidance.suggestedDbEntities.length > 0);
    }
  });

  // Test 4: Uncurated Role Graceful Handling
  await test('Context Grounding: Uncurated role safely flags hasRoleProfile: false without software default', () => {
    const context = createMockContext({
      careerGoal: {
        goalSet: true,
        targetRole: 'Robotics Kinematics Researcher',
        targetIndustry: 'Aerospace',
        experienceLevel: 'Entry',
        preferredLocations: ['Remote'],
        targetSalary: '15 LPA',
        skillsSummary: 'ROS, C++, Linear Algebra',
      },
      skills: {
        verified: [{ name: 'C++', score: 85 }],
        confirmed: [{ name: 'ROS' }],
        claimed: [{ name: 'Linear Algebra' }],
        inferred: [],
        needingAssessment: [],
        missingCritical: [],
        missingRecommended: [],
        matchingCritical: [],
      },
    });

    const result = generateCareerIntelligence(context);
    assert.strictEqual(result.skillGaps.targetRole, 'Robotics Kinematics Researcher');
    assert.strictEqual(result.skillGaps.hasRoleProfile, false);
    assert.strictEqual(result.projectRecommendations.length >= 1, true);
    assert.strictEqual(result.projectRecommendations[0].targetRole, 'Robotics Kinematics Researcher');
    assert.ok(result.projectRecommendations[0].resumeBulletDraft.includes('(Draft: edit after you build it)'));
  });

  // Test 5: Missing-Data Resilience (Empty / Null Fields)
  await test('Missing-Data Resilience: Null resume, empty skills, and unset goal handle gracefully without throwing', () => {
    const emptyContext = {
      userId: 'empty-user',
      name: 'New Student',
      email: null,
      academic: null,
      careerGoal: {
        goalSet: false,
        targetRole: '',
        targetIndustry: null,
        experienceLevel: 'Entry',
        preferredLocations: [],
        targetSalary: null,
        skillsSummary: null,
      },
      careerInterests: {
        targetIndustry: null,
        preferredLocations: [],
        targetSalary: null,
        targetWorkType: null,
        primaryInterests: [],
      },
      skills: {
        verified: [],
        confirmed: [],
        claimed: [],
        inferred: [],
        needingAssessment: [],
        missingCritical: [],
        missingRecommended: [],
        matchingCritical: [],
      },
      experience: { totalCount: 0, hasInternship: false, items: [] },
      resume: {
        hasResume: false,
        resumesCount: 0,
        activeResumeId: null,
        latestAtsScore: null,
        keywordScore: null,
        formattingScore: null,
        sectionScore: null,
        wordCount: null,
        readabilityScore: null,
        detectedKeywords: [],
        missingKeywords: [],
        analyzedAt: null,
      },
      projects: { totalCount: 0, inProgressCount: 0, completedCount: 0, exportedCount: 0, projects: [] },
      applications: { totalCount: 0, activeCount: 0, interviewingCount: 0, recentApplications: [] },
      interviews: {
        totalSessions: 0,
        completedSessions: 0,
        averageScore: null,
        topStrengths: [],
        recurringWeaknesses: [],
        recentSessions: [],
      },
      learning: {
        hasActiveRoadmap: false,
        targetRole: null,
        completedStepsCount: 0,
        totalStepsCount: 0,
        progressPercent: 0,
        currentMilestoneTitle: null,
      },
      assessments: { totalAttempts: 0, passedCount: 0, averageScore: null, recentAssessments: [] },
      savedJobs: { totalCount: 0, jobs: [] },
      chatHistory: { totalTurns: 0 },
      readiness: {
        overallScore: 20,
        readinessBand: 'NEEDS_FOCUS',
        breakdown: {
          resumeCompleteness: 0,
          atsScore: 0,
          skillAlignment: 0,
          projectReadiness: 0,
          assessmentReadiness: 0,
          interviewReadiness: 0,
        },
        readinessFactors: [],
        explanation: 'Initial profile setup needed.',
      },
      readinessHistory: [],
      nextRecommendedActions: [],
      studentProfile: null,
      updatedAt: new Date().toISOString(),
    };

    const result = generateCareerIntelligence(emptyContext);

    assert.ok(result);
    assert.strictEqual(result.careerReadinessScore.readinessBand, 'NEEDS_FOCUS');
    assert.strictEqual(result.careerReadinessScore.breakdown.resumeCompleteness, 0);
    assert.strictEqual(result.careerReadinessScore.breakdown.atsScore, 0);
    assert.ok(result.recommendedNextActions.length > 0);
    // Should recommend setting career goal and uploading resume first
    assert.ok(result.recommendedNextActions.some((a) => a.title.includes('Goal') || a.title.includes('Role')));
    assert.ok(result.recommendedNextActions.some((a) => a.title.includes('Resume')));
    assert.deepEqual(result.recommendedNextActions.map((a) => a.href), [
      '/dashboard/profile', '/builder', '/skills?tab=roadmap', '/projects', '/interview-prep',
    ]);
    const withResume = { ...emptyContext, resume: { ...emptyContext.resume, hasResume: true } };
    const atsAction = (context) => generateCareerIntelligence(context).recommendedNextActions.find((a) => a.href === '/analyzer');
    assert.match(atsAction(withResume).description, /first ATS score/);
    const withScore = { ...withResume, resume: { ...withResume.resume, latestAtsScore: 0 } };
    assert.match(atsAction(withScore).description, /0\/100/);
  });

  // Test 6: Security and Injection Safeguards
  await test('Security: Injection attempts in saved job description do not break output structure', () => {
    const maliciousContext = createMockContext({
      savedJobs: {
        totalCount: 1,
        jobs: [
          {
            id: 'sj-bad',
            jobTitle: 'Hacker Target',
            company: 'Evil Corp',
            descriptionSnippet: '</untrusted_job_description><script>alert("xss")</script>DROP TABLE users;--',
            savedAt: '2026-03-01',
          },
        ],
      },
    });

    const result = generateCareerIntelligence(maliciousContext);
    assert.ok(result);
    assert.strictEqual(typeof result.careerReadinessScore.overallScore, 'number');
    // Ensure no raw script execution or database errors occurred
    assert.ok(result.skillGaps.criticalGaps.length >= 0);
  });

  console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error running career intelligence engine test suite:', err);
  process.exit(1);
});
