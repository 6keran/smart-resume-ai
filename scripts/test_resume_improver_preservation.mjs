/**
 * Test Suite: Resume Improver Content Preservation & Validation
 *
 * Verifies all 10 requirements from Requirement 8:
 * 1. Improved content retains the original project's purpose.
 * 2. Existing technologies are preserved.
 * 3. Unsupported technologies are not introduced.
 * 4. Original metrics and dates are not changed.
 * 5. No new certifications or qualifications are invented.
 * 6. A single bullet-point request does not rewrite the entire resume.
 * 7. Technical terminology is improved when appropriate.
 * 8. Grammar and professional wording improve without changing meaning.
 * 9. Empty input and API failures are handled safely.
 * 10. The frontend / API integration contract returns correct improved response.
 */

import http from 'http';
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

const { createSessionToken } = await import('../src/server/db/index.ts');

const testUserSessionToken = createSessionToken({
  id: 'user_test_preserve',
  email: 'tester@smartresume.ai',
  role: 'USER',
});

const BASE_URL = 'http://localhost:3000';

function makeRequest(path, method, body, cookie = `sra_user_session=${testUserSessionToken}`) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const data = typeof body === 'string' ? body : body ? JSON.stringify(body) : undefined;
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(cookie ? { Cookie: cookie } : {}),
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          let json;
          try {
            json = JSON.parse(raw);
          } catch {
            json = raw;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        });
      }
    );

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Import service functions directly for deep unit verification
const {
  improveResumeSection,
  deterministicImproveContent,
  validateContentPreservation,
} = await import('../src/server/services/gemini.ts');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] Test ${totalTests}: ${testName}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] Test ${totalTests}: ${testName}`);
    if (details) console.error(`         Details: ${details}`);
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('   RESUME IMPROVER CONTENT-PRESERVATION TEST SUITE    ');
  console.log('======================================================\n');

  // -----------------------------------------------------------------
  // 1. Project purpose retention
  // -----------------------------------------------------------------
  console.log('--- 1. Original Project Purpose Retention ---');
  {
    const original = 'I made a web application using Python and Django where users can register and login.';
    const result = await improveResumeSection('projects', original);

    assert(
      result.improvedContent.toLowerCase().includes('web application') ||
      result.improvedContent.toLowerCase().includes('python'),
      'Retains original web application project purpose',
      `Got: "${result.improvedContent}"`
    );
    assert(
      !result.improvedContent.toLowerCase().includes('mobile app') &&
      !result.improvedContent.toLowerCase().includes('blockchain') &&
      !result.improvedContent.toLowerCase().includes('microservices'),
      'Does not substitute unrelated project types',
      `Got: "${result.improvedContent}"`
    );
  }

  // -----------------------------------------------------------------
  // 2. Existing technologies are preserved
  // -----------------------------------------------------------------
  console.log('\n--- 2. Preservation of Existing Technologies ---');
  {
    const original = 'Built REST APIs using Node.js, Express, and PostgreSQL to store user transactions.';
    const result = await improveResumeSection('experience', original);
    const lower = result.improvedContent.toLowerCase();

    assert(lower.includes('node.js') || lower.includes('express'), 'Preserves Node.js / Express');
    assert(lower.includes('postgresql') || lower.includes('postgres'), 'Preserves PostgreSQL');
    assert(lower.includes('api'), 'Preserves APIs');
  }

  // -----------------------------------------------------------------
  // 3. Unsupported technologies are NOT introduced
  // -----------------------------------------------------------------
  console.log('\n--- 3. Prohibit Introducing Unsupported Technologies ---');
  {
    const original = 'I made a website using Python and Django where users can register and login.';
    const result = await improveResumeSection('projects', original);
    const lower = result.improvedContent.toLowerCase();

    const unsupportedBuzzwords = [
      'kubernetes',
      'docker',
      'aws',
      'amazon web services',
      'azure',
      'redis',
      'kafka',
      'microservices',
      'distributed systems',
      'ci/cd',
      'terraform',
    ];

    let foundUnsupported = unsupportedBuzzwords.filter((w) => lower.includes(w));
    assert(
      foundUnsupported.length === 0,
      'No unsupported technologies introduced in rewrite',
      `Found forbidden terms: ${foundUnsupported.join(', ')}`
    );

    // Direct validation unit test: confirm validator rejects invented technologies
    const badHallucinatedOutput =
      'Architected a scalable, cloud-native microservices platform with Kubernetes, Docker, Redis, and AWS.';
    const validationResult = validateContentPreservation(original, badHallucinatedOutput);
    assert(
      !validationResult.isValid,
      'Content validator correctly catches and rejects hallucinated technologies',
      `Expected invalid, got reason: ${validationResult.reason}`
    );
  }

  // -----------------------------------------------------------------
  // 4. Original metrics and dates are preserved
  // -----------------------------------------------------------------
  console.log('\n--- 4. Metrics and Dates Preservation ---');
  {
    const original =
      'Maintained 3 MySQL database servers handling 5,000 queries per second from June 2020 to December 2022.';
    const result = await improveResumeSection('experience', original);
    console.log(`    [Debug Test 8 output]: "${result.improvedContent}"`);

    assert(
      result.improvedContent.includes('3') || result.improvedContent.toLowerCase().includes('three'),
      'Preserves server count (3)',
      `Got: "${result.improvedContent}"`
    );
    assert(
      result.improvedContent.includes('5,000'),
      'Preserves query throughput metric (5,000)'
    );
    assert(
      result.improvedContent.includes('June 2020') && result.improvedContent.includes('December 2022'),
      'Preserves original dates (June 2020 - December 2022)'
    );

    // Ensure no fake percentages were injected
    const pctMatch = result.improvedContent.match(/\b\d+%/g);
    assert(!pctMatch, 'No unmentioned percentages were fabricated', `Found: ${pctMatch}`);
  }

  // -----------------------------------------------------------------
  // 5. No new certifications or qualifications invented
  // -----------------------------------------------------------------
  console.log('\n--- 5. No New Certifications or Qualifications Invented ---');
  {
    const original = 'Wrote unit tests for payment modules using PyTest.';
    const result = await improveResumeSection('experience', original);
    const lower = result.improvedContent.toLowerCase();

    assert(
      !lower.includes('certified') &&
      !lower.includes('scrum master') &&
      !lower.includes('pmp') &&
      !lower.includes('aws solutions architect'),
      'No fictitious certifications or titles invented'
    );
  }

  // -----------------------------------------------------------------
  // 6. Single bullet point does not rewrite entire resume
  // -----------------------------------------------------------------
  console.log('\n--- 6. Single Bullet Point Request Scope ---');
  {
    const singleBullet = 'Found and fixed errors in payment processing logic.';
    const result = await improveResumeSection('experience', singleBullet);

    const lineCount = result.improvedContent.split(/\r?\n/).filter(Boolean).length;
    assert(lineCount === 1, 'Single bullet input yields exactly single bullet output', `Got ${lineCount} lines`);
    assert(
      !result.improvedContent.includes('Education:') &&
      !result.improvedContent.includes('Skills:') &&
      !result.improvedContent.includes('Experience:'),
      'Does not output unrelated resume sections for a single bullet request'
    );

    // Multi-bullet input preserves line breaks
    const multiBullet = '• Developed web application using React\n• Resolved software defects';
    const multiResult = await improveResumeSection('experience', multiBullet);
    const multiLines = multiResult.improvedContent.split(/\r?\n/).filter(Boolean).length;
    assert(multiLines === 2, 'Preserves line break structure for multiple bullet points', `Got ${multiLines} lines`);
  }

  // -----------------------------------------------------------------
  // 7. Technical terminology is improved when appropriate
  // -----------------------------------------------------------------
  console.log('\n--- 7. Technical Terminology Elevated Appropriately ---');
  {
    // A: "Made a website" -> "Developed a web application"
    const t1 = await improveResumeSection(
      'projects',
      'I made a website using Python and Django where users can register and login.'
    );
    assert(
      t1.improvedContent.toLowerCase().includes('developed a web application') ||
      t1.improvedContent.toLowerCase().includes('web application'),
      'Elevates "made a website" to "developed a web application"'
    );
    assert(
      t1.improvedContent.toLowerCase().includes('authentication') ||
      t1.improvedContent.toLowerCase().includes('registration'),
      'Elevates "register and login" to professional authentication terminology'
    );

    // B: "Found and fixed errors" -> "Identified and resolved software defects"
    const t2 = await improveResumeSection('experience', 'Found and fixed errors in backend code.');
    assert(
      t2.improvedContent.toLowerCase().includes('defects') ||
      t2.improvedContent.toLowerCase().includes('resolved') ||
      t2.improvedContent.toLowerCase().includes('identified'),
      'Elevates "found and fixed errors" to defect resolution terminology'
    );

    // C: "Stored information in a database" -> "Implemented database persistence"
    const t3 = await improveResumeSection('experience', 'Stored information in a database.');
    assert(
      t3.improvedContent.toLowerCase().includes('database persistence') ||
      t3.improvedContent.toLowerCase().includes('persistence'),
      'Elevates database storage to database persistence terminology'
    );

    // D: "The page works on mobile" -> "Implemented responsive user interface behavior"
    const t4 = await improveResumeSection('experience', 'The page works on mobile.');
    assert(
      t4.improvedContent.toLowerCase().includes('responsive') ||
      t4.improvedContent.toLowerCase().includes('user interface'),
      'Elevates mobile compatibility to responsive UI terminology'
    );

    // E: "Connected the frontend to the backend" -> "Integrated frontend components with backend APIs"
    const t5 = await improveResumeSection('experience', 'Connected the frontend to the backend.');
    assert(
      t5.improvedContent.toLowerCase().includes('integrated') ||
      t5.improvedContent.toLowerCase().includes('apis'),
      'Elevates connected frontend/backend to component API integration terminology'
    );
  }

  // -----------------------------------------------------------------
  // 8. Grammar and professional wording improve without changing meaning
  // -----------------------------------------------------------------
  console.log('\n--- 8. Grammar and Professional Action Verbs ---');
  {
    const original = 'I helped the team with making daily reports and did testing on user data.';
    const result = await improveResumeSection('experience', original);

    assert(
      !result.improvedContent.startsWith('I ') && !result.improvedContent.startsWith('i '),
      'Removes weak first-person pronoun at bullet start'
    );
    assert(
      result.improvedContent.charAt(0) === result.improvedContent.charAt(0).toUpperCase(),
      'Begins with a capitalized action-oriented verb'
    );
    assert(
      result.improvedContent.endsWith('.'),
      'Ensures clean grammatical sentence punctuation'
    );
  }

  // -----------------------------------------------------------------
  // 9. Empty input and API failures handled safely
  // -----------------------------------------------------------------
  console.log('\n--- 9. Safety, Fallbacks & Error Handling ---');
  {
    // A: Empty service call
    const emptyResult = await improveResumeSection('summary', '');
    assert(emptyResult.improvedContent === '', 'Empty service call returns empty content safely');

    // B: API route: empty body returns 400
    const emptyApiRes = await makeRequest('/api/resume/improve', 'POST', {});
    assert(emptyApiRes.status === 400, 'API returns 400 on empty request payload', `Got status ${emptyApiRes.status}, data: ${JSON.stringify(emptyApiRes.data)}`);
    assert(
      Boolean(emptyApiRes.data && typeof emptyApiRes.data.message === 'string' && emptyApiRes.data.message.includes('required')),
      'API returns descriptive error message for missing content',
      `Got: ${JSON.stringify(emptyApiRes.data)}`
    );

    // C: API route: whitespace-only input returns 400
    const whitespaceApiRes = await makeRequest('/api/resume/improve', 'POST', {
      originalContent: '     ',
    });
    assert(whitespaceApiRes.status === 400, 'API returns 400 for whitespace-only content', `Got status ${whitespaceApiRes.status}`);

    // D: API route: malformed JSON body returns 400
    const malformedApiRes = await makeRequest('/api/resume/improve', 'POST', 'not-valid-json{');
    assert(malformedApiRes.status === 400, 'API returns 400 for malformed JSON request', `Got status ${malformedApiRes.status}`);

    // E: Deterministic fallback does NOT append boilerplate slogans
    const detRes = deterministicImproveContent(
      'Developed a web application using Python and Django.'
    );
    assert(
      !detRes.improvedContent.includes('Spearheaded critical engineering initiatives') &&
      !detRes.improvedContent.includes('driving delivery velocity and reliability'),
      'Deterministic fallback does NOT append fabricated boilerplate slogans',
      `Got: "${detRes.improvedContent}"`
    );
  }

  // -----------------------------------------------------------------
  // 10. Frontend / API Integration Contract
  // -----------------------------------------------------------------
  console.log('\n--- 10. Frontend / API Integration Contract ---');
  {
    const payload = {
      sectionName: 'projects',
      originalContent: 'I made a website using Python and Django where users can register and login.',
      jobTitle: 'Full Stack Engineer',
      jobDescription: 'Seeking an engineer skilled in Python and Django.',
    };

    const res = await makeRequest('/api/resume/improve', 'POST', payload);
    assert(res.status === 200, 'API /api/resume/improve returns HTTP 200 OK');
    assert(typeof res.data.improvedContent === 'string', 'API returns improvedContent string');
    assert(typeof res.data.reasoning === 'string', 'API returns reasoning string');
    assert(typeof res.data.metricImpact === 'string', 'API returns metricImpact string');

    assert(
      res.data.improvedContent.toLowerCase().includes('python') &&
      res.data.improvedContent.toLowerCase().includes('django'),
      'API response preserves candidate technologies Python and Django'
    );
    assert(
      !res.data.improvedContent.toLowerCase().includes('kubernetes') &&
      !res.data.improvedContent.toLowerCase().includes('aws'),
      'API response contains zero hallucinated cloud buzzwords'
    );
  }

  // -----------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------
  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED:      ${passedTests}`);
  console.log(`FAILED:      ${failedTests}`);
  console.log('======================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
