import assert from 'node:assert/strict';
import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

console.log('================================================================');
console.log('🤖 SMART RESUME AI: AI ASSISTANT GROUNDING & FALLBACK REGRESSION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function it(desc, fn) {
  try {
    fn();
    passed++;
    console.log(`✓ PASS [${passed}]: ${desc}`);
  } catch (err) {
    failed++;
    console.error(`✗ FAIL [${passed + failed}]: ${desc}`);
    console.error(err);
  }
}

async function run() {
  const { getDeterministicCareerChatResponse } = await import('../src/server/services/careerIntelligence.ts');

  // Test 1: Identity inquiries identify as official name "AI Assistant" without human names
  it('Identity question "Who are you?" identifies as "AI Assistant"', () => {
    const reply = getDeterministicCareerChatResponse('Who are you?');
    assert.ok(reply.includes("I'm your AI Assistant"), 'Must state "I\'m your AI Assistant"');
    assert.ok(!reply.includes('Alex'), 'Must never adopt human name Alex');
  });

  it('Identity question "What is your name?" identifies as "AI Assistant"', () => {
    const reply = getDeterministicCareerChatResponse('What is your name?');
    assert.ok(reply.includes("I'm your AI Assistant"), 'Must state "I\'m your AI Assistant"');
  });

  it('Identity question "Are you Alex?" politely declines human name and identifies as AI Assistant', () => {
    const reply = getDeterministicCareerChatResponse('Are you Alex?');
    assert.ok(reply.includes("I'm your AI Assistant"), 'Must state "I\'m your AI Assistant"');
    assert.ok(!reply.includes('My name is Alex'), 'Must not claim to be Alex');
  });

  // Test 2: Profile-Grounded Response with complete profile
  const mockProfile = {
    userId: 'usr_test_grounding_01',
    name: 'Alex Chen',
    email: 'alex.chen@stanford.edu',
    targetRole: 'Junior Backend Engineer',
    experienceLevel: 'Fresher / Entry Level',
    metrics: {
      readinessScore: 88,
      savedResumesCount: 2,
      activeApplicationsCount: 3,
    },
    skills: {
      verified: [{ name: 'TypeScript', score: 92 }, { name: 'Node.js', score: 85 }],
      claimed: [{ name: 'PostgreSQL' }],
      inferred: [{ name: 'Docker', source: 'resume_project' }],
      needingAssessment: ['PostgreSQL'],
    },
    skillGaps: {
      missingCriticalSkills: ['Redis', 'Docker'],
      missingRecommendedSkills: ['Kubernetes'],
    },
    latestAtsAnalysis: {
      atsScore: 84,
      keywordScore: 80,
      formattingScore: 90,
      missingKeywords: ['Redis', 'Microservices'],
      detectedKeywords: ['TypeScript', 'Node.js'],
    },
    studentProfile: {
      institution: 'Stanford University',
      degree: 'B.S.',
      fieldOfStudy: 'Computer Science',
      graduationYear: 2026,
      currentSemester: 'Semester 6',
      cgpa: '3.88',
      coursework: ['Data Structures & Algorithms', 'Operating Systems', 'Database Systems'],
      projects: [
        {
          id: 'proj_vec_01',
          title: 'Distributed Vector Cache Engine',
          description: 'In-memory vector cache with LRU eviction',
          role: 'Sole Architect',
          techStack: ['TypeScript', 'Node.js', 'Redis'],
          repoUrl: 'https://github.com/alexchen/vector-cache',
          liveUrl: 'https://vector-cache.alexchen.dev',
          highlights: ['Decreased latency by 42%'],
        },
      ],
      achievements: ['Dean\'s List'],
    },
    recentApplications: [
      { id: 'app_1', company: 'Stripe', jobTitle: 'Software Engineer', status: 'Applied' },
    ],
  };

  it('Project inquiry strictly references student university, degree, and projects', () => {
    const reply = getDeterministicCareerChatResponse(
      'What capstone projects or college coursework from my profile should I highlight for junior engineering jobs?',
      mockProfile
    );
    assert.ok(reply.includes('Stanford University'), 'Must ground in Stanford University');
    assert.ok(reply.includes('B.S.'), 'Must ground in B.S. degree');
    assert.ok(reply.includes('Distributed Vector Cache Engine'), 'Must reference specific project title');
    assert.ok(reply.includes('Data Structures & Algorithms'), 'Must reference student coursework');
  });

  // Test 3: Missing profile information handled gracefully without hallucination
  it('Handles missing profile information gracefully without hardcoded fake data', () => {
    const emptyProfile = {
      userId: 'usr_sparse_02',
      name: 'Jordan',
      email: 'jordan@example.com',
      targetRole: 'Data Analyst',
      skills: { verified: [], claimed: [], inferred: [], needingAssessment: [] },
      metrics: { readinessScore: 50, savedResumesCount: 0, activeApplicationsCount: 0 },
    };

    const reply = getDeterministicCareerChatResponse('What projects should I build?', emptyProfile);
    assert.ok(reply.includes('Data Analyst'), 'Must adapt to candidate target role');
    assert.ok(!reply.includes('undefined'), 'Must not output undefined strings');
    assert.ok(!reply.includes('Stanford'), 'Must not invent fake Stanford institution');
    assert.ok(!reply.includes('MIT'), 'Must not invent fake MIT institution');
    assert.ok(reply.includes('You do not have any verified portfolio projects documented yet'), 'Must inform user cleanly about missing projects');
  });

  // Test 4: Unified Student Context fallback propagation
  it('Extracts academic and project grounding from UnifiedStudentContext when profile.studentProfile is null', () => {
    const profileWithoutStudent = {
      userId: 'usr_unified_03',
      name: 'Priya Patel',
      targetRole: 'Full Stack Developer',
      metrics: { readinessScore: 78, savedResumesCount: 1, activeApplicationsCount: 1 },
      skills: { verified: [], claimed: [], inferred: [], needingAssessment: [] },
    };

    const mockUnifiedContext = {
      userId: 'usr_unified_03',
      updatedAt: new Date().toISOString(),
      academic: {
        institution: 'University of Washington',
        degree: 'B.S.',
        fieldOfStudy: 'Informatics',
        graduationYear: 2025,
        graduationMonth: 'June',
        currentSemester: 'Senior Year',
        cgpa: '3.75',
        targetWorkType: 'full_time',
        coursework: ['Web Development', 'Cloud Architecture'],
        documentedProjects: [
          {
            title: 'Real-time Telemetry Dashboard',
            techStack: ['Next.js', 'TypeScript', 'PostgreSQL'],
          },
        ],
      },
      careerGoal: { targetRole: 'Full Stack Developer', targetIndustry: null, experienceLevel: 'fresher', preferredLocations: [], targetSalary: null, skillsSummary: null },
      skills: { verified: [], claimed: [], inferred: [], needingAssessment: [], missingCritical: ['Docker', 'AWS'], missingRecommended: [], matchingCritical: [] },
      resume: { hasResume: true, resumesCount: 1, activeResumeId: 'res_1', latestAtsScore: 82, keywordScore: 80, formattingScore: 85, sectionScore: 80, wordCount: 400, readabilityScore: 80, missingKeywords: ['Docker'], detectedKeywords: ['Next.js'], analyzedAt: null },
      projects: { totalCount: 0, inProgressCount: 0, completedCount: 0, exportedCount: 0, projects: [] },
      applications: { totalCount: 0, activeCount: 0, interviewingCount: 0, recentApplications: [] },
      interviews: { totalSessions: 0, completedSessions: 0, averageScore: null, topStrengths: [], recurringWeaknesses: [], recentSessions: [] },
      readiness: { overallScore: 78 },
    };

    const reply = getDeterministicCareerChatResponse(
      'Which capstone projects from my profile should I highlight?',
      profileWithoutStudent,
      mockUnifiedContext
    );

    assert.ok(reply.includes('University of Washington'), 'Must extract institution from UnifiedStudentContext');
    assert.ok(reply.includes('B.S.'), 'Must extract degree from UnifiedStudentContext');
    assert.ok(reply.includes('Real-time Telemetry Dashboard'), 'Must extract project from UnifiedStudentContext');
    assert.ok(reply.includes('Web Development'), 'Must extract coursework from UnifiedStudentContext');
  });

  console.log('\n================================================================');
  console.log(`TOTAL AI ASSISTANT GROUNDING TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
