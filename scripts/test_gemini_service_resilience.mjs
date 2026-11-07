import assert from 'node:assert/strict';
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

const sampleResume = `
Jane Doe
Software Engineer
jane.doe@example.com | 555-123-4567 | github.com/janedoe | linkedin.com/in/janedoe

PROFESSIONAL SUMMARY
Experienced Full Stack Engineer with 5+ years specializing in TypeScript, React, Next.js, and Node.js.
Passionate about distributed systems, performance optimization, and developer productivity.

EXPERIENCE
Senior Software Engineer | Tech Corp (2022 - Present)
- Architected and built high-throughput microservices using Node.js, TypeScript, and PostgreSQL handling 25M daily requests.
- Optimized frontend rendering performance in Next.js 15 App Router, improving Core Web Vitals LCP by 45%.
- Spearheaded CI/CD automation with GitHub Actions and Docker, reducing release deployment cycle times by 60%.

Software Engineer | Startup Labs (2019 - 2022)
- Built interactive client-facing dashboards using React, Redux, and Tailwind CSS.
- Implemented RESTful APIs and PostgreSQL schema migrations, improving API latency by 35%.

EDUCATION
B.S. in Computer Science | University of Technology (2015 - 2019)

SKILLS
TypeScript, JavaScript, React, Next.js, Node.js, Express, PostgreSQL, Redis, Docker, Git, REST API, GraphQL, CI/CD, Jest
`;

const sampleJobDescription = `
Senior Full Stack Engineer
We are seeking a Senior Full Stack Engineer proficient in TypeScript, React, Next.js, Node.js, and PostgreSQL.
Experience with Docker, Kubernetes, microservices architecture, and cloud deployment (AWS or GCP) is highly desirable.
Responsibilities include architecting scalable services, optimizing frontend performance, and mentoring junior engineers.
`;

async function run() {
  console.log('================================================================');
  console.log('GEMINI MODEL VERIFICATION & RESILIENCE TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // Dynamically import the gemini service
  const geminiModule = await import('../src/server/services/gemini.ts');

  // Test 1: Configuration check
  await test('1. PRIMARY_GEMINI_MODEL is set to verified Google model', async () => {
    assert.equal(geminiModule.PRIMARY_GEMINI_MODEL, 'gemini-3.5-flash');
    assert.deepEqual(Array.from(geminiModule.CANDIDATE_GEMINI_MODELS), [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-flash-latest',
    ]);
  });

  // Test 2: Live AI resume analysis
  await test('2. Live AI resume analysis succeeds with structured metrics', async () => {
    const res = await geminiModule.analyzeResume(sampleResume, sampleJobDescription, 'Senior Full Stack Engineer', 'Tech Innovators');
    assert.ok(res, 'Analysis result is truthy');
    assert.ok(typeof res.overallAtsScore === 'number' && res.overallAtsScore >= 0 && res.overallAtsScore <= 100, 'overallAtsScore is 0-100');
    assert.ok(typeof res.keywordMatchScore === 'number', 'keywordMatchScore exists');
    assert.ok(Array.isArray(res.detectedKeywords), 'detectedKeywords is an array');
    assert.ok(res.detectedKeywords.length > 0, 'detectedKeywords has items');
    assert.ok(Array.isArray(res.topSuggestions), 'topSuggestions is an array');
    assert.ok(res.topSuggestions.length <= 3, 'topSuggestions is capped at 3');
    for (const sug of res.topSuggestions) {
      assert.ok(['High', 'Medium', 'Low'].includes(sug.priority), 'Valid priority');
      assert.ok(sug.whatNeedsImprovement && sug.whatNeedsImprovement.length > 5, 'Valid whatNeedsImprovement');
      assert.ok(sug.whyItMatters && sug.whyItMatters.length > 5, 'Valid whyItMatters');
      assert.ok(sug.howToImprove && sug.howToImprove.length > 5, 'Valid howToImprove');
    }
  });

  // Test 3: Live section improvement
  await test('3. Live AI section improvement succeeds without false metrics', async () => {
    const orig = 'Responsible for developing backend APIs and helping with database migrations.';
    const improved = await geminiModule.improveResumeSection('Work Experience', orig, sampleJobDescription, 'Senior Full Stack Engineer');
    assert.ok(improved.improvedContent, 'improvedContent is non-empty');
    assert.ok(improved.reasoning, 'reasoning is non-empty');
    assert.ok(improved.metricImpact, 'metricImpact is non-empty');
    // Ensure no false numerical claims
    assert.ok(!/\+\d+%\s+guaranteed/i.test(improved.metricImpact), 'No false percentage guarantees');
  });

  // Test 4: Live job matching
  await test('4. Live AI job matching produces valid alignment scores', async () => {
    const match = await geminiModule.matchResumeToJob(sampleResume, 'Senior Full Stack Engineer', 'Tech Innovators', sampleJobDescription);
    assert.ok(match, 'Match result is truthy');
    assert.ok(typeof match.overallMatchScore === 'number' && match.overallMatchScore >= 0 && match.overallMatchScore <= 100);
    assert.ok(typeof match.skillsMatchScore === 'number');
    assert.ok(Array.isArray(match.matchedSkills));
  });

  // Test 5: Fallback behavior on invalid API key
  await test('5. Fallback behavior: Invalid API key falls back seamlessly to deterministic engine', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync(`npx tsx scripts/test_gemini_fallback_child.mjs invalid`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    assert.ok(out.includes('FALLBACK_OK'), 'Fallback should produce valid output on invalid API key');
  });

  // Test 6: Fallback behavior on missing API key
  await test('6. Fallback behavior: Missing API key falls back gracefully to deterministic engine', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync(`npx tsx scripts/test_gemini_fallback_child.mjs missing`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    assert.ok(out.includes('FALLBACK_OK'), 'Fallback should produce valid output on missing API key');
  });

  // Test 7: Quota exhaustion should fall back without retry loops.
  await test('7. Fallback behavior: Quota exhaustion returns deterministic ATS output', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync(`npx tsx scripts/test_gemini_fallback_child.mjs quota`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 45_000,
    });
    assert.ok(out.includes('FALLBACK_OK:quota'), 'Quota failure should produce explicitly deterministic ATS output');
  });

  // Test 8: A hung provider request should time out and use deterministic output.
  await test('8. Fallback behavior: Provider timeout returns deterministic ATS output', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync(`npx tsx scripts/test_gemini_fallback_child.mjs timeout`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 60_000,
    });
    assert.ok(out.includes('FALLBACK_OK:timeout'), 'Timed out provider should produce explicitly deterministic ATS output');
  });

  await test('9. Career intelligence quota failures use deterministic results', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync(`npx tsx scripts/test_career_intelligence_fallback_child.mjs quota`, {
      cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 30_000,
    });
    assert.ok(out.includes('CAREER_FALLBACK_OK:quota'));
  });

  await test('10. Career intelligence provider timeouts use deterministic results', async () => {
    const { execSync } = await import('node:child_process');
    const out = execSync(`npx tsx scripts/test_career_intelligence_fallback_child.mjs timeout`, {
      cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 35_000,
    });
    assert.ok(out.includes('CAREER_FALLBACK_OK:timeout'));
  });

  console.log(`\n================================================================`);
  console.log(`SUCCESS: All ${passed}/${passed} Gemini model & fallback tests passed!`);
  console.log(`================================================================`);
}

run().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
