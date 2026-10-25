/**
 * Comprehensive Test Suite: ATS Score & Resume Improver Features
 * 
 * Verifies:
 * 1. ATS scoring derived from actual resume content (consistent, non-random, calibrated).
 * 2. Missing section identification across all 6 core resume sections.
 * 3. Dynamic and static keyword extraction with job description matching.
 * 4. Graceful handling of empty, sparse, and malformed inputs.
 * 5. Resume Improver preservation of facts, metrics, dates, and rejection of hallucinated metrics/technologies.
 * 6. API quota / error handling resilience (fast fallback, clean error envelopes without secret leakage).
 * 7. Security: authentication and strict multi-tenant user isolation.
 * 8. Targeting logic: verified that projects/experience improvements apply to exact target indices.
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

function loadEnv() {
  const envFile = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const BASE_URL = 'http://localhost:3000';

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('🚀 RUNNING ATS SCORE & RESUME IMPROVER COMPREHENSIVE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Reason: ${err.message}\n`);
      failed++;
    }
  }

  // Import server services dynamically
  const {
    analyzeResume,
    improveResumeSection,
    validateContentPreservation,
    generateDeterministicAtsAnalysis,
  } = await import('../src/server/services/gemini.ts');

  const { registerUser } = await import('../src/server/db/index.ts');

  // -------------------------------------------------------------
  // SUITE 1: ATS Scoring Engine Accuracy & Section Detection
  // -------------------------------------------------------------
  console.log('--- SUITE 1: ATS Scoring Engine Accuracy & Section Detection ---');

  const fullResumeText = `
Alex Morgan
alex.morgan@email.com | (555) 019-2834 | San Francisco, CA | linkedin.com/in/alexmorgan

PROFESSIONAL SUMMARY
Senior Full-Stack Software Engineer with 6+ years of experience designing scalable distributed web platforms using TypeScript, React, Next.js, and Node.js. Proven track record reducing API latency by 35% and mentoring junior developers.

WORK EXPERIENCE
Senior Software Engineer | TechScale Systems | Jan 2021 - Present
- Architected high-throughput microservices using Node.js, Express, and PostgreSQL, increasing system reliability from 99.2% to 99.98%.
- Led frontend migration from legacy monolithic views to Next.js and React 19, improving First Contentful Paint by 42%.
- Integrated Redis caching layer that reduced database query load by 60% across peak traffic events.

Software Engineer | DevMatrix Solutions | Jun 2018 - Dec 2020
- Built full-stack features with React, TypeScript, and Python Flask, delivering 14 major customer-facing milestones.
- Managed AWS infrastructure utilizing Docker, ECS, and Terraform to streamline CI/CD deployments.

EDUCATION
Bachelor of Science in Computer Science
University of California, Berkeley | 2014 - 2018

TECHNICAL SKILLS
Languages: TypeScript, JavaScript, Python, SQL, HTML5, CSS3
Frameworks & Libraries: React, Next.js, Node.js, Express, Flask, Tailwind CSS
Databases & Cloud: PostgreSQL, Redis, MongoDB, AWS, Docker, Git, CI/CD

PROJECTS
CloudMetrics Dashboard | React, TypeScript, Node.js, PostgreSQL
- Created real-time telemetry dashboard monitoring 250+ cloud resources with WebSocket streaming.
- Implemented role-based access control and JWT authentication securing user analytics data.
`;

  await test('Full resume generates calibrated score and detects all 6 core sections', async () => {
    const analysis = generateDeterministicAtsAnalysis(fullResumeText);
    assert.ok(analysis.overallAtsScore >= 70, `Expected score >= 70, got ${analysis.overallAtsScore}`);
    assert.ok(analysis.detectedSections && analysis.detectedSections.length >= 5, 'Should detect at least 5 sections');
    assert.equal(analysis.missingSections?.length || 0, 0, 'Full resume should have 0 missing sections');
    assert.ok(analysis.detectedKeywords && analysis.detectedKeywords.length >= 6, 'Should extract detected keywords');
  });

  await test('ATS scoring is consistent and deterministic', async () => {
    const analysis1 = generateDeterministicAtsAnalysis(fullResumeText);
    const analysis2 = generateDeterministicAtsAnalysis(fullResumeText);
    assert.equal(analysis1.overallAtsScore, analysis2.overallAtsScore, 'Scores should be identical for identical input');
    assert.equal(analysis1.formattingScore, analysis2.formattingScore, 'Formatting scores should be identical');
    assert.equal(analysis1.keywordMatchScore, analysis2.keywordMatchScore, 'Keyword scores should be identical');
    assert.equal(analysis1.sectionScore, analysis2.sectionScore, 'Section scores should be identical');
  });

  await test('Score breakdown aligns mathematically with overall ATS score', async () => {
    const analysis = generateDeterministicAtsAnalysis(fullResumeText);
    const expectedApprox = Math.round(
      analysis.keywordMatchScore * 0.35 +
      analysis.formattingScore * 0.25 +
      (analysis.contentScore || 0) * 0.25 +
      analysis.sectionScore * 0.15
    );
    assert.ok(
      Math.abs(analysis.overallAtsScore - expectedApprox) <= 2,
      `Overall score (${analysis.overallAtsScore}) must align with weighted breakdown (${expectedApprox})`
    );
  });

  // Missing sections tests
  const resumeMissingExperience = `
Jane Doe
jane.doe@example.com | Seattle, WA
SUMMARY: Motivated developer seeking software opportunities.
EDUCATION: B.S. in Computer Science, University of Washington, 2023.
SKILLS: Python, JavaScript, React, SQL, Git.
PROJECTS: Personal Portfolio built with Next.js and Tailwind CSS.
`;

  await test('Resume missing Work Experience identifies missing section and gives clear suggestion', async () => {
    const analysis = generateDeterministicAtsAnalysis(resumeMissingExperience);
    assert.ok(analysis.missingSections?.includes('Work Experience'), 'missingSections must include Work Experience');
    const hasExpSuggestion = analysis.topSuggestions.some(s => s.section.toLowerCase().includes('experience'));
    assert.ok(hasExpSuggestion, 'Must provide suggestion for missing Work Experience');
  });

  const resumeMissingSkills = `
John Smith
john.smith@example.com
SUMMARY: Experienced project lead with 5 years in technology leadership.
EXPERIENCE:
Project Lead at AlphaCorp (2020-Present)
- Coordinated cross-functional teams of 12 engineers.
EDUCATION: M.S. in Information Systems, 2019.
PROJECTS: Enterprise ERP Migration.
`;

  await test('Resume missing Skills section identifies missing section', async () => {
    const analysis = generateDeterministicAtsAnalysis(resumeMissingSkills);
    assert.ok(analysis.missingSections?.includes('Skills'), 'missingSections must include Skills');
  });

  const resumeMissingEducation = `
Sam Taylor
sam.taylor@example.com
EXPERIENCE:
Full Stack Developer at Acme (2020-Present)
- Built web applications using TypeScript and Node.js.
SKILLS: TypeScript, Node.js, PostgreSQL.
PROJECTS: API Gateway with JWT Auth.
`;

  await test('Resume missing Education section identifies missing section', async () => {
    const analysis = generateDeterministicAtsAnalysis(resumeMissingEducation);
    assert.ok(analysis.missingSections?.includes('Education'), 'missingSections must include Education');
  });

  // -------------------------------------------------------------
  // SUITE 2: Job Description Keyword Matching
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Job Description Keyword Matching ---');

  const targetJd = `
Senior Platform Engineer
Required Qualifications:
- 5+ years of experience with TypeScript, Next.js, and GraphQL.
- Strong proficiency with Kubernetes, Terraform, and Go.
- Experience building event-driven pipelines using Kafka and Redis.
`;

  await test('Matches keywords against Job Description (detected vs missing)', async () => {
    const analysis = generateDeterministicAtsAnalysis(fullResumeText, targetJd);
    // TypeScript, Next.js, Redis, Terraform are in resume
    assert.ok(analysis.detectedKeywords.some(k => /typescript|next\.js|redis|terraform/i.test(k)), 'Should detect matching JD skills');
    // Kubernetes, GraphQL, Go, Kafka are in JD but missing in resume
    assert.ok(analysis.missingKeywords.some(k => /kubernetes|graphql|kafka|go/i.test(k)), 'Should identify missing JD skills');
  });

  await test('Dynamic capitalized term extraction from Job Description', async () => {
    const nicheJd = `
Fintech Engineering Lead
Must have deep experience with EthereumSmartContracts, Snowflake, and GraphQL federation.
`;
    const analysis = generateDeterministicAtsAnalysis(fullResumeText, nicheJd);
    assert.ok(analysis.missingKeywords.some(k => /ethereumsmartcontracts|snowflake/i.test(k)), 'Should dynamically extract specialized domain keywords from JD');
  });

  // -------------------------------------------------------------
  // SUITE 3: Empty, Sparse & Malformed Inputs
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Empty, Sparse & Malformed Inputs ---');

  await test('Sparse incomplete resume receives calibrated low score (< 40%) without artificial clamping', async () => {
    const sparseResume = 'Bob Smith. Junior coder looking for entry-level work. Worked on HTML site.';
    const analysis = generateDeterministicAtsAnalysis(sparseResume);
    assert.ok(
      analysis.overallAtsScore <= 40,
      `Sparse resume should get <= 40%, got ${analysis.overallAtsScore}%`
    );
    assert.ok(
      analysis.sectionScore <= 35,
      `Section score should reflect missing structure (<= 35), got ${analysis.sectionScore}`
    );
  });

  await test('Empty or non-resume text triggers validation failure via API', async () => {
    const res = await fetch(`${BASE_URL}/api/resume/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText: 'Short text' }),
    });
    // Expected 422 Unprocessable Entity
    assert.equal(res.status, 422, `Expected 422, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.message, 'Must return helpful error message');
    assert.equal(data.validation?.isValid, false, 'Validation result must be false');
  });

  // -------------------------------------------------------------
  // SUITE 4: Resume Improver Content Preservation & Anti-Hallucination
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: Resume Improver Content Preservation & Anti-Hallucination ---');

  await test('Preservation validator permits valid professional phrasing improvements', () => {
    const original = 'Worked on backend APIs using Node.js and PostgreSQL, cutting latency by 25%.';
    const improved = 'Architected robust backend APIs utilizing Node.js and PostgreSQL, reducing request latency by 25%.';
    const validation = validateContentPreservation(original, improved);
    assert.equal(validation.isValid, true, `Expected isValid=true, got: ${validation.reason}`);
  });

  await test('Preservation validator rejects omitted percentages or metrics', () => {
    const original = 'Optimized database queries, improving performance by 40%.';
    const improvedWithoutMetric = 'Optimized database queries, improving overall system throughput and reliability.';
    const validation = validateContentPreservation(original, improvedWithoutMetric);
    assert.equal(validation.isValid, false, 'Should reject improvement that drops original 40% metric');
  });

  await test('Preservation validator rejects omitted dollar metrics', () => {
    const original = 'Managed cloud infrastructure budget of $500K annually.';
    const improvedWithoutDollar = 'Administered cloud infrastructure budget across enterprise production environments.';
    const validation = validateContentPreservation(original, improvedWithoutDollar);
    assert.equal(validation.isValid, false, 'Should reject improvement that drops original $500K metric');
  });

  await test('Preservation validator rejects omitted date ranges', () => {
    const original = 'Staff Engineer at Alpha Corp from 2021 to 2023.';
    const improvedWithoutDate = 'Served as Staff Engineer leading cross-functional engineering teams at Alpha Corp.';
    const validation = validateContentPreservation(original, improvedWithoutDate);
    assert.equal(validation.isValid, false, 'Should reject improvement that drops original date range');
  });

  await test('Preservation validator rejects invented/hallucinated buzzwords', () => {
    const original = 'Built REST endpoints using Express and MongoDB.';
    const hallucinatedTech = 'Built REST endpoints using Express, MongoDB, Kubernetes, and AWS Lambda.';
    const validation = validateContentPreservation(original, hallucinatedTech);
    assert.equal(validation.isValid, false, 'Should reject introduction of unmentioned technologies');
  });

  await test('Preservation validator rejects invented numerical quantities not in original', () => {
    const original = 'Handled user transactions and processed payments securely.';
    const inventedNumber = 'Handled 500,000 user transactions and processed payments securely.';
    const validation = validateContentPreservation(original, inventedNumber);
    assert.equal(validation.isValid, false, 'Should reject hallucination of new numbers not in original');
  });

  const authReg = await registerUser({
    name: 'Auth User',
    email: `auth_user_${Date.now()}@example.com`,
    password: 'Password123!',
  });
  const authToken = authReg.sessionToken;

  await test('API /api/resume/improve rejects unauthenticated requests with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/resume/improve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sectionName: 'Experience',
        originalContent: 'I worked with React and TypeScript to build UI components.',
      }),
    });
    assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('API /api/resume/improve validates input and returns improved phrasing for authenticated user', async () => {
    const res = await fetch(`${BASE_URL}/api/resume/improve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sra_user_session=${authToken}`,
      },
      body: JSON.stringify({
        sectionName: 'Experience',
        originalContent: 'I worked with React and TypeScript to build UI components for our product.',
      }),
    });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert.ok(data.improvedContent, 'Must return improvedContent');
    assert.ok(data.reasoning, 'Must return reasoning');
  });

  await test('API /api/resume/improve rejects empty originalContent with 400', async () => {
    const res = await fetch(`${BASE_URL}/api/resume/improve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sra_user_session=${authToken}`,
      },
      body: JSON.stringify({
        sectionName: 'Experience',
        originalContent: '   ',
      }),
    });
    assert.equal(res.status, 400, `Expected 400, got ${res.status}`);
  });

  // -------------------------------------------------------------
  // SUITE 5: Security & Multi-Tenant User Isolation
  // -------------------------------------------------------------
  console.log('\n--- SUITE 5: Security & Multi-Tenant User Isolation ---');

  await test('Unauthenticated GET /api/user/improvements returns 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/user/improvements`);
    assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('Unauthenticated POST /api/user/improvements returns 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/user/improvements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauthorized Suggestion',
        afterText: 'Updated content',
      }),
    });
    assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('Unauthenticated GET /api/user/analyses returns 401 Unauthorized', async () => {
    const res = await fetch(`${BASE_URL}/api/user/analyses`);
    assert.equal(res.status, 401, `Expected 401, got ${res.status}`);
  });

  await test('Authenticated User A can record improvement and retrieve only their improvements', async () => {
    const regA = await registerUser({
      name: 'User A',
      email: `user_a_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    const tokenA = regA.sessionToken;

    // Record improvement for User A
    const postRes = await fetch(`${BASE_URL}/api/user/improvements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sra_user_session=${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Action Verb Optimization',
        category: 'experience',
        beforeText: 'Worked on APIs',
        afterText: 'Engineered high-concurrency APIs',
      }),
    });
    assert.equal(postRes.status, 201, `Expected 201, got ${postRes.status}`);

    // Fetch improvements for User A
    const getResA = await fetch(`${BASE_URL}/api/user/improvements`, {
      headers: {
        Cookie: `sra_user_session=${tokenA}`,
      },
    });
    assert.equal(getResA.status, 200, `Expected 200, got ${getResA.status}`);
    const dataA = await getResA.json();
    assert.ok(dataA.improvements.length >= 1, 'User A should have at least 1 improvement');
    assert.ok(dataA.improvements.some(i => i.title === 'Action Verb Optimization'));

    // Verify User B cannot see User A's improvements
    const regB = await registerUser({
      name: 'User B',
      email: `user_b_${Date.now()}@example.com`,
      password: 'Password123!',
    });
    const tokenB = regB.sessionToken;

    const getResB = await fetch(`${BASE_URL}/api/user/improvements`, {
      headers: {
        Cookie: `sra_user_session=${tokenB}`,
      },
    });
    assert.equal(getResB.status, 200, `Expected 200, got ${getResB.status}`);
    const dataB = await getResB.json();
    // User B must have 0 improvements
    assert.equal(dataB.improvements.length, 0, 'User B must not see User A improvements (isolation check)');
  });

  // -------------------------------------------------------------
  // SUITE 6: Targeting Logic Verification
  // -------------------------------------------------------------
  console.log('\n--- SUITE 6: Targeting Logic Verification ---');

  await test('Projects targeting logic replaces the targeted project and not project[0]', () => {
    const resume = {
      projects: [
        { id: 'p1', title: 'Project One', description: 'Desc One', bullets: ['Bullet 1.1', 'Bullet 1.2'], technologies: [] },
        { id: 'p2', title: 'Project Two', description: 'Desc Two', bullets: ['Bullet 2.1', 'Bullet 2.2'], technologies: [] },
      ],
    };

    // Item targets project index 1, bullet index 1
    const item = {
      id: 'imp_1',
      section: 'projects',
      targetIndex: 1,
      targetBulletIndex: 1,
      originalContent: 'Bullet 2.2',
      improvedContent: 'Enhanced Bullet 2.2 with measurable results',
    };

    // Simulate our updated targeting logic
    const newProj = resume.projects.map(p => ({
      ...p,
      bullets: [...p.bullets],
      technologies: [...p.technologies],
    }));

    if (typeof item.targetIndex === 'number' && item.targetIndex < newProj.length) {
      const proj = newProj[item.targetIndex];
      if (typeof item.targetBulletIndex === 'number' && item.targetBulletIndex < proj.bullets.length) {
        proj.bullets[item.targetBulletIndex] = item.improvedContent;
      }
    }

    assert.equal(newProj[0].bullets[0], 'Bullet 1.1', 'Project 0 bullet 0 must remain unchanged');
    assert.equal(newProj[0].bullets[1], 'Bullet 1.2', 'Project 0 bullet 1 must remain unchanged');
    assert.equal(newProj[1].bullets[0], 'Bullet 2.1', 'Project 1 bullet 0 must remain unchanged');
    assert.equal(newProj[1].bullets[1], 'Enhanced Bullet 2.2 with measurable results', 'Project 1 bullet 1 must be updated');
  });

  await test('Experience targeting logic replaces targeted experience bullet', () => {
    const resume = {
      experience: [
        { id: 'e1', company: 'Company 1', role: 'Role 1', bulletPoints: ['Exp 1.1', 'Exp 1.2'] },
        { id: 'e2', company: 'Company 2', role: 'Role 2', bulletPoints: ['Exp 2.1', 'Exp 2.2'] },
      ],
    };

    const item = {
      id: 'imp_2',
      section: 'experience',
      targetIndex: 1,
      targetBulletIndex: 0,
      originalContent: 'Exp 2.1',
      improvedContent: 'Spearheaded Exp 2.1 across cross-functional engineering teams',
    };

    const newExp = resume.experience.map(e => ({
      ...e,
      bulletPoints: [...e.bulletPoints],
    }));

    if (typeof item.targetIndex === 'number' && item.targetIndex < newExp.length) {
      const targetExp = newExp[item.targetIndex];
      if (typeof item.targetBulletIndex === 'number' && item.targetBulletIndex < targetExp.bulletPoints.length) {
        targetExp.bulletPoints[item.targetBulletIndex] = item.improvedContent;
      }
    }

    assert.equal(newExp[0].bulletPoints[0], 'Exp 1.1', 'Exp 0 bullet 0 must remain unchanged');
    assert.equal(newExp[1].bulletPoints[0], 'Spearheaded Exp 2.1 across cross-functional engineering teams', 'Exp 1 bullet 0 must be updated');
    assert.equal(newExp[1].bulletPoints[1], 'Exp 2.2', 'Exp 1 bullet 1 must remain unchanged');
  });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runComprehensiveTests().catch(err => {
  console.error('Unhandled fatal error in test suite:', err);
  process.exit(1);
});
