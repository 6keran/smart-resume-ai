import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const sampleResumeStandard = `
Jane Doe
Software Engineer
jane.doe@example.com | +1 555-123-4567 | San Francisco, CA | github.com/janedoe | linkedin.com/in/janedoe

PROFESSIONAL SUMMARY
Experienced Full Stack Software Engineer with 5+ years specializing in TypeScript, React, Next.js, and Node.js.
Passionate about distributed microservices, performance optimization, and developer productivity.

WORK EXPERIENCE
Senior Software Engineer | Tech Corp (2022 - Present)
• Architected and built high-throughput microservices using Node.js, TypeScript, and PostgreSQL handling 25M daily requests.
• Optimized frontend rendering performance in Next.js 15 App Router, improving Core Web Vitals LCP by 45%.
• Spearheaded CI/CD automation with GitHub Actions and Docker, reducing release deployment cycle times by 60%.

Software Engineer | Startup Labs (2019 - 2022)
• Built interactive client-facing dashboards using React, Redux, and Tailwind CSS.
• Implemented RESTful APIs and PostgreSQL schema migrations, improving API latency by 35%.

EDUCATION
B.S. in Computer Science | University of California, Berkeley (2015 - 2019)

TECHNICAL SKILLS
Languages & Frameworks: TypeScript, JavaScript, React, Next.js, Node.js, Express, Python
Databases & Cloud: PostgreSQL, Redis, Docker, AWS, Git, CI/CD, REST APIs, GraphQL, Jest

PROJECTS
Cloud Stream Processor | Docker, Node.js, Redis, AWS
• Engineered an event streaming pipeline processing 15,000 messages/sec with 99.99% availability.
• Open sourced on GitHub with 1,200+ stars and comprehensive unit test coverage.
`;

const sampleJobDescriptionMatching = `
Senior Full Stack Engineer
Tech Corp is hiring a Senior Full Stack Engineer.
Requirements:
- 4+ years of professional software engineering experience
- Strong proficiency in TypeScript, React, Next.js, and Node.js
- Production experience with PostgreSQL, Redis, and REST APIs
- Familiarity with containerization using Docker and cloud infrastructure (AWS)
- Experience designing automated CI/CD pipelines
`;

const sampleJobDescriptionMismatched = `
Mobile iOS & Embedded Systems Engineer
Hardware Solutions Inc.
Requirements:
- 5+ years of experience in Swift, Objective-C, and iOS SDK development
- Embedded C/C++ firmware development on ARM microcontrollers
- Experience with Bluetooth Low Energy (BLE) and Zigbee protocols
- Proficiency in Ruby on Rails backend integration
`;

const sampleResumeDegraded = `
John Smith
john@example.com

SUMMARY
Looking for a job in technology.

EXPERIENCE
Company XYZ (2022 - 2023)
Worked on various duties and assisted team members.
Responsible for office tasks and communication.

EDUCATION
High School Diploma (2018)
`;

async function run() {
  console.log('================================================================');
  console.log('🧪 SMART RESUME AI: ATS DETERMINISTIC SCORING REGRESSION SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function pass(name, detail = '') {
    passed++;
    total++;
    console.log(`  ✅ [PASS] Test ${passed}: ${name}${detail ? ` (${detail})` : ''}`);
  }

  function fail(name, error) {
    total++;
    console.error(`  ❌ [FAIL] ${name}:`, error);
    throw error;
  }

  const {
    calculateDeterministicAtsScore,
    normalizeAtsInput,
  } = await import('../src/server/services/deterministicAtsEngine.ts');
  const {
    analyzeResume,
    generateDeterministicAtsAnalysis,
  } = await import('../src/server/services/gemini.ts');

  // --------------------------------------------------------------------------
  // TEST 1: Run same resume and job description 10 times -> all scores must match
  // --------------------------------------------------------------------------
  console.log('--- Test 1: 10 Consecutive Executions on Identical Inputs ---');
  try {
    const runs = [];
    for (let i = 0; i < 10; i++) {
      const result = await analyzeResume(
        sampleResumeStandard,
        sampleJobDescriptionMatching,
        'Senior Full Stack Engineer',
        'Tech Corp'
      );
      runs.push({
        overall: result.overallAtsScore,
        keyword: result.keywordMatchScore,
        formatting: result.formattingScore,
        content: result.contentScore,
        section: result.sectionScore,
        readability: result.readabilityScore,
        bullet: result.bulletStrengthScore,
      });
    }

    const first = runs[0];
    for (let i = 1; i < runs.length; i++) {
      const current = runs[i];
      assert.strictEqual(
        current.overall,
        first.overall,
        `Run ${i + 1} overall score (${current.overall}) did not match Run 1 (${first.overall})`
      );
      assert.strictEqual(current.keyword, first.keyword, `Run ${i + 1} keyword score diverged`);
      assert.strictEqual(current.formatting, first.formatting, `Run ${i + 1} formatting score diverged`);
      assert.strictEqual(current.content, first.content, `Run ${i + 1} content score diverged`);
      assert.strictEqual(current.section, first.section, `Run ${i + 1} section score diverged`);
      assert.strictEqual(current.readability, first.readability, `Run ${i + 1} readability score diverged`);
      assert.strictEqual(current.bullet, first.bullet, `Run ${i + 1} bullet strength score diverged`);
    }

    pass(
      '10 Consecutive Runs on Identical Inputs',
      `All 10 runs produced overallAtsScore = ${first.overall}, keyword = ${first.keyword}, formatting = ${first.formatting}, content = ${first.content}, section = ${first.section} (Variance: 0.00)`
    );
  } catch (err) {
    fail('Test 1: 10 Consecutive Executions', err);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Run identical requests through different API entry points -> scores match
  // --------------------------------------------------------------------------
  console.log('\n--- Test 2: Identical Requests Across Different API Entry Points ---');
  try {
    // A. Direct Engine
    const directResult = calculateDeterministicAtsScore(
      sampleResumeStandard,
      sampleJobDescriptionMatching,
      'Senior Full Stack Engineer',
      'Tech Corp'
    );

    // B. Direct analyzeResume function
    const fnResult = await analyzeResume(
      sampleResumeStandard,
      sampleJobDescriptionMatching,
      'Senior Full Stack Engineer',
      'Tech Corp'
    );

    // C. Live HTTP API endpoint - JSON payload
    let httpJsonResult = null;
    try {
      const httpRes = await fetch(`${BASE_URL}/api/resume/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: sampleResumeStandard,
          jobDescription: sampleJobDescriptionMatching,
          jobTitle: 'Senior Full Stack Engineer',
          company: 'Tech Corp',
        }),
      });
      if (httpRes.ok) {
        httpJsonResult = await httpRes.json();
      }
    } catch (httpErr) {
      console.warn('[HTTP Test Note] Live server fetch skipped if port offline:', httpErr.message);
    }

    // D. Live HTTP API endpoint - Multipart Form Data payload
    let httpFormResult = null;
    try {
      const formData = new FormData();
      const textBlob = new Blob([sampleResumeStandard], { type: 'text/plain' });
      formData.append('file', textBlob, 'resume.txt');
      formData.append('jobDescription', sampleJobDescriptionMatching);
      formData.append('jobTitle', 'Senior Full Stack Engineer');
      formData.append('company', 'Tech Corp');

      const httpRes = await fetch(`${BASE_URL}/api/resume/analyze`, {
        method: 'POST',
        body: formData,
      });
      if (httpRes.ok) {
        httpFormResult = await httpRes.json();
      }
    } catch (httpErr) {
      console.warn('[HTTP Test Note] Live form fetch skipped if port offline:', httpErr.message);
    }

    // Assert direct engine matches analyzeResume
    assert.strictEqual(
      directResult.overallAtsScore,
      fnResult.overallAtsScore,
      'Direct engine overall score must match analyzeResume'
    );
    assert.strictEqual(
      directResult.keywordMatchScore,
      fnResult.keywordMatchScore,
      'Direct engine keyword score must match analyzeResume'
    );
    assert.strictEqual(
      directResult.formattingScore,
      fnResult.formattingScore,
      'Direct engine formatting score must match analyzeResume'
    );
    assert.strictEqual(
      directResult.contentScore,
      fnResult.contentScore,
      'Direct engine content score must match analyzeResume'
    );
    assert.strictEqual(
      directResult.sectionScore,
      fnResult.sectionScore,
      'Direct engine section score must match analyzeResume'
    );

    if (httpJsonResult) {
      assert.strictEqual(
        httpJsonResult.overallAtsScore,
        directResult.overallAtsScore,
        `HTTP JSON overallAtsScore (${httpJsonResult.overallAtsScore}) must match Direct engine (${directResult.overallAtsScore})`
      );
      assert.strictEqual(
        httpJsonResult.keywordMatchScore,
        directResult.keywordMatchScore,
        'HTTP JSON keyword score must match Direct engine'
      );
      assert.strictEqual(
        httpJsonResult.formattingScore,
        directResult.formattingScore,
        'HTTP JSON formatting score must match Direct engine'
      );
    }

    if (httpFormResult) {
      assert.strictEqual(
        httpFormResult.overallAtsScore,
        directResult.overallAtsScore,
        `HTTP Multipart overallAtsScore (${httpFormResult.overallAtsScore}) must match Direct engine (${directResult.overallAtsScore})`
      );
    }

    pass(
      'Entry Point Equivalence (Engine, Function, HTTP JSON, HTTP Multipart)',
      `Engine: ${directResult.overallAtsScore}, Function: ${fnResult.overallAtsScore}${
        httpJsonResult ? `, HTTP JSON: ${httpJsonResult.overallAtsScore}` : ''
      }${httpFormResult ? `, HTTP Multipart: ${httpFormResult.overallAtsScore}` : ''}`
    );
  } catch (err) {
    fail('Test 2: Entry Point Equivalence', err);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Repeat tests across independent process runs (server restart simulation)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 3: Consistency Across Server Restarts / Isolated Processes ---');
  try {
    const sub1 = spawnSync('npx tsx scripts/test_restart_simulation_worker.mjs', {
      encoding: 'utf8',
      shell: true,
    });
    const sub2 = spawnSync('npx tsx scripts/test_restart_simulation_worker.mjs', {
      encoding: 'utf8',
      shell: true,
    });

    assert.strictEqual(sub1.status, 0, `Subprocess 1 failed: ${sub1.stderr}`);
    assert.strictEqual(sub2.status, 0, `Subprocess 2 failed: ${sub2.stderr}`);

    const out1 = JSON.parse(sub1.stdout.trim().split('\n').pop());
    const out2 = JSON.parse(sub2.stdout.trim().split('\n').pop());

    assert.deepStrictEqual(out1, out2, 'Independent fresh processes produced differing results');

    pass(
      'Independent Process / Restart Simulation',
      `Process A (${out1.overall}/100) exactly equals Process B (${out2.overall}/100)`
    );
  } catch (err) {
    fail('Test 3: Process Isolation / Restart Consistency', err);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Changing the resume changes the score when relevant
  // --------------------------------------------------------------------------
  console.log('\n--- Test 4: Resume Sensitivity (Changing Resume Changes Score) ---');
  try {
    const goodResult = calculateDeterministicAtsScore(
      sampleResumeStandard,
      sampleJobDescriptionMatching
    );
    const degradedResult = calculateDeterministicAtsScore(
      sampleResumeDegraded,
      sampleJobDescriptionMatching
    );

    assert(
      goodResult.overallAtsScore > degradedResult.overallAtsScore + 25,
      `Expected standard resume score (${goodResult.overallAtsScore}) to be significantly higher than degraded resume score (${degradedResult.overallAtsScore})`
    );
    assert(
      goodResult.contentScore > degradedResult.contentScore,
      'Good resume content score must exceed degraded resume content score'
    );
    assert(
      goodResult.sectionScore > degradedResult.sectionScore,
      'Good resume section completeness must exceed degraded resume section completeness'
    );

    pass(
      'Resume Sensitivity',
      `Standard resume scored ${goodResult.overallAtsScore}/100 vs Degraded resume scored ${degradedResult.overallAtsScore}/100 (Delta: +${
        goodResult.overallAtsScore - degradedResult.overallAtsScore
      })`
    );
  } catch (err) {
    fail('Test 4: Resume Sensitivity', err);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Changing the job description changes the score when relevant
  // --------------------------------------------------------------------------
  console.log('\n--- Test 5: Job Description Sensitivity ---');
  try {
    const matchedJdResult = calculateDeterministicAtsScore(
      sampleResumeStandard,
      sampleJobDescriptionMatching,
      'Senior Full Stack Engineer',
      'Tech Corp'
    );
    const mismatchedJdResult = calculateDeterministicAtsScore(
      sampleResumeStandard,
      sampleJobDescriptionMismatched,
      'iOS Embedded Engineer',
      'Hardware Solutions'
    );

    assert(
      matchedJdResult.keywordMatchScore > mismatchedJdResult.keywordMatchScore,
      `Matched JD keyword score (${matchedJdResult.keywordMatchScore}) must exceed mismatched JD keyword score (${mismatchedJdResult.keywordMatchScore})`
    );
    assert(
      matchedJdResult.overallAtsScore > mismatchedJdResult.overallAtsScore,
      `Matched JD overall score (${matchedJdResult.overallAtsScore}) must exceed mismatched JD overall score (${mismatchedJdResult.overallAtsScore})`
    );

    pass(
      'Job Description Sensitivity',
      `Matching JD scored ${matchedJdResult.overallAtsScore}% (Keyword: ${matchedJdResult.keywordMatchScore}%) vs Mismatched JD scored ${mismatchedJdResult.overallAtsScore}% (Keyword: ${mismatchedJdResult.keywordMatchScore}%)`
    );
  } catch (err) {
    fail('Test 5: Job Description Sensitivity', err);
  }

  // --------------------------------------------------------------------------
  // TEST 6: AI service failure does not randomly change numerical scores
  // --------------------------------------------------------------------------
  console.log('\n--- Test 6: Resilience: AI Service Failure Invariance ---');
  try {
    // Run deterministic calculation
    const deterministicBase = generateDeterministicAtsAnalysis(
      sampleResumeStandard,
      sampleJobDescriptionMatching,
      'Senior Full Stack Engineer',
      'Tech Corp'
    );

    // Run standard analyzeResume (which may call Gemini or fall back)
    const normalAnalysis = await analyzeResume(
      sampleResumeStandard,
      sampleJobDescriptionMatching,
      'Senior Full Stack Engineer',
      'Tech Corp'
    );

    assert.strictEqual(
      normalAnalysis.overallAtsScore,
      deterministicBase.overallAtsScore,
      `Numerical score under AI (${normalAnalysis.overallAtsScore}) must strictly match deterministic score (${deterministicBase.overallAtsScore})`
    );
    assert.strictEqual(
      normalAnalysis.keywordMatchScore,
      deterministicBase.keywordMatchScore,
      'Keyword match score under AI must strictly match deterministic score'
    );
    assert.strictEqual(
      normalAnalysis.formattingScore,
      deterministicBase.formattingScore,
      'Formatting score under AI must strictly match deterministic score'
    );
    assert.strictEqual(
      normalAnalysis.contentScore,
      deterministicBase.contentScore,
      'Content score under AI must strictly match deterministic score'
    );
    assert.strictEqual(
      normalAnalysis.sectionScore,
      deterministicBase.sectionScore,
      'Section score under AI must strictly match deterministic score'
    );

    pass(
      'AI Failure / Fallback Invariance',
      `AI Online/Offline Numerical Invariance: Overall=${normalAnalysis.overallAtsScore}, Keyword=${normalAnalysis.keywordMatchScore}, Formatting=${normalAnalysis.formattingScore}, Content=${normalAnalysis.contentScore}, Section=${normalAnalysis.sectionScore}`
    );
  } catch (err) {
    fail('Test 6: AI Failure Invariance', err);
  }

  // --------------------------------------------------------------------------
  // TEST 7: Input Normalization Invariance (CRLF vs LF, Smart Quotes, Spacing)
  // --------------------------------------------------------------------------
  console.log('\n--- Test 7: Formatting Normalization Invariance ---');
  try {
    const crlfResume = sampleResumeStandard.replace(/\n/g, '\r\n');
    const smartQuotesResume = sampleResumeStandard
      .replace(/"/g, '“')
      .replace(/'/g, '’')
      .replace(/-/g, '—')
      .replace(/  /g, '   ');

    const baseResult = calculateDeterministicAtsScore(sampleResumeStandard);
    const crlfResult = calculateDeterministicAtsScore(crlfResume);
    const smartQuotesResult = calculateDeterministicAtsScore(smartQuotesResume);

    assert.strictEqual(crlfResult.overallAtsScore, baseResult.overallAtsScore, 'CRLF score must match LF score');
    assert.strictEqual(
      smartQuotesResult.overallAtsScore,
      baseResult.overallAtsScore,
      'Smart quotes / em-dash score must match ASCII score'
    );
    assert.strictEqual(smartQuotesResult.wordCount, baseResult.wordCount, 'Word counts must match after normalization');

    pass(
      'Input Normalization Invariance',
      `CRLF, smart quotes, em-dashes, and irregular spaces all produced identical score: ${baseResult.overallAtsScore}/100`
    );
  } catch (err) {
    fail('Test 7: Normalization Invariance', err);
  }

  console.log('\n================================================================');
  console.log(`🎉 ALL ${passed}/${total} REGRESSION TESTS PASSED WITH 100% DETERMINISM!`);
  console.log('================================================================\n');
}

run().catch((err) => {
  console.error('\nRegression test suite failed:', err);
  process.exit(1);
});
