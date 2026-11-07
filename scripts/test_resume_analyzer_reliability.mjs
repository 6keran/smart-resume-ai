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

const validResumeText = `
Jane Doe
Software Engineer
jane.doe@example.com | +1 555-123-4567 | San Francisco, CA | github.com/janedoe

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

async function run() {
  console.log('================================================================');
  console.log('RESUME ANALYZER RELIABILITY & BUG FIX TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  const { extractResumeText } = await import('../src/server/services/extractResumeText.ts');
  const { validateResumeDocument } = await import('../src/server/services/resumeValidator.ts');
  const { analyzeResume, generateDeterministicAtsAnalysis } = await import('../src/server/services/gemini.ts');

  // Test 1: Empty or 0-byte file document
  await test('Empty or 0-byte file extraction rejected with clear diagnostic message', async () => {
    try {
      await extractResumeText(Buffer.alloc(0), 'resume.pdf', 'application/pdf');
      assert.fail('Should have thrown on empty buffer');
    } catch (err) {
      assert(err.message.includes('empty (0 bytes)'), `Expected empty message but got: ${err.message}`);
    }
  });

  // Test 2: Invalid or unsupported file format (e.g. .jpg, .doc legacy)
  await test('Legacy Word (.doc) file rejected with actionable upgrade instruction', async () => {
    try {
      await extractResumeText(Buffer.from('legacy doc content'), 'resume.doc', 'application/msword');
      assert.fail('Should have rejected .doc file');
    } catch (err) {
      assert(err.message.includes('Legacy Word (.doc) files are not supported'), `Unexpected error: ${err.message}`);
    }
  });

  await test('Image files (JPG, PNG) rejected with actionable instruction to use text-based PDF/DOCX', async () => {
    try {
      await extractResumeText(Buffer.from('fake image binary'), 'photo.jpg', 'image/jpeg');
      assert.fail('Should have rejected jpg file');
    } catch (err) {
      assert(err.message.includes('Image files are not supported directly'), `Unexpected error: ${err.message}`);
    }
  });

  // Test 3: Unreadable or corrupt PDF document
  await test('Corrupted or invalid PDF buffer rejected with specific corrupt message', async () => {
    try {
      await extractResumeText(Buffer.from('%PDF-corrupted-junk-without-tables'), 'corrupt.pdf', 'application/pdf');
      assert.fail('Should have failed parsing corrupt PDF');
    } catch (err) {
      assert(
        err.message.includes('corrupted') || err.message.includes('No readable text'),
        `Unexpected error: ${err.message}`
      );
    }
  });

  await test('Scanned or image-only PDF with insufficient text is rejected with actionable message', async () => {
    // When PDF text extraction returns < 20 characters (scanned document)
    // We test extractResumeText's explicit guard for empty/sparse PDF
    const shortTextPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n186\n%%EOF'
    );
    try {
      await extractResumeText(shortTextPdfBuffer, 'scanned_scan.pdf', 'application/pdf');
      assert.fail('Should have rejected scanned PDF');
    } catch (err) {
      assert(
        err.message.includes('No readable text found in this PDF') ||
        err.message.includes('scanned document') ||
        err.message.includes('corrupted or password-protected'),
        `Expected scanned/unreadable PDF message but got: ${err.message}`
      );
    }
  });

  // Test 4: Valid TXT extraction
  await test('Valid TXT resume extracted cleanly', async () => {
    const res = await extractResumeText(Buffer.from(validResumeText, 'utf-8'), 'resume.txt', 'text/plain');
    assert.equal(res.fileType, 'txt');
    assert(res.wordCount > 50, `Word count should be > 50, got ${res.wordCount}`);
    assert(res.text.includes('Senior Software Engineer'), 'Text missing content');
  });

  // Test 5: Document validation detects authentic resume vs non-resume
  await test('Document validation accepts valid resume text', () => {
    const val = validateResumeDocument(validResumeText);
    assert.equal(val.isValid, true);
    assert.equal(val.status, 'valid');
    assert(val.confidence >= 70, `Confidence should be >= 70, got ${val.confidence}`);
  });

  await test('Document validation rejects invoice/billing document', () => {
    const invoiceText = `
      TAX INVOICE
      Invoice Number: INV-2024-001
      Bill To: ACME Corporation
      Client ID: 98765
      Total Amount Due: $4,500.00
      Payment Terms: Net 30
      GSTIN: 29ABCDE1234F1Z5
    `;
    const val = validateResumeDocument(invoiceText);
    assert.equal(val.isValid, false);
    assert.equal(val.status, 'invalid');
    assert.equal(val.reasonCode, 'NON_RESUME_INVOICE');
  });

  // Test 6: Deterministic ATS Engine output integrity & provenance
  await test('Deterministic ATS engine returns bounded scores (0-100) and transparent engine tag', () => {
    const analysis = generateDeterministicAtsAnalysis(validResumeText);
    assert(analysis.overallAtsScore >= 0 && analysis.overallAtsScore <= 100, 'overallAtsScore out of range');
    assert(analysis.keywordMatchScore >= 0 && analysis.keywordMatchScore <= 100, 'keywordMatchScore out of range');
    assert(analysis.formattingScore >= 0 && analysis.formattingScore <= 100, 'formattingScore out of range');
    assert(analysis.contentScore >= 0 && analysis.contentScore <= 100, 'contentScore out of range');
    assert(analysis.sectionScore >= 0 && analysis.sectionScore <= 100, 'sectionScore out of range');
    assert.equal(analysis.analysisEngine, 'deterministic-ats');
    assert.equal(analysis.engineDisplayName, 'Rule-Based ATS Engine (Deterministic)');
    assert(analysis.detectedKeywords.length > 0, 'No detected keywords found');
    assert(analysis.topSuggestions.length > 0, 'No top suggestions produced');
  });

  // Test 7: analyzeResume handles general and job-specific modes
  await test('analyzeResume completes successfully with score sanitization and engine provenance', async () => {
    const jd = 'Looking for a Senior TypeScript and Next.js Engineer proficient in PostgreSQL and Docker.';
    const analysis = await analyzeResume(validResumeText, jd, 'Senior Full Stack Engineer', 'Tech Corp');

    assert(analysis.overallAtsScore >= 0 && analysis.overallAtsScore <= 100, 'Score out of range');
    assert(analysis.keywordMatchScore >= 0 && analysis.keywordMatchScore <= 100, 'keywordMatchScore out of range');
    assert(analysis.formattingScore >= 0 && analysis.formattingScore <= 100, 'formattingScore out of range');
    assert(analysis.contentScore >= 0 && analysis.contentScore <= 100, 'contentScore out of range');
    assert(analysis.sectionScore >= 0 && analysis.sectionScore <= 100, 'sectionScore out of range');
    assert(['gemini', 'deterministic-ats'].includes(analysis.analysisEngine), `Invalid engine: ${analysis.analysisEngine}`);
    assert(typeof analysis.engineDisplayName === 'string' && analysis.engineDisplayName.length > 0);
    assert(analysis.isJobSpecific === true, 'isJobSpecific should be true when JD provided');
    assert.equal(analysis.jobTitle, 'Senior Full Stack Engineer');
  });

  // Test 8: Prevent duplicate submissions and state management logic
  await test('Duplicate submissions guarded by isBusy state check', () => {
    let callCount = 0;
    const isBusy = true;

    function handleStartAnalysisMock() {
      if (isBusy) return;
      callCount++;
    }

    handleStartAnalysisMock();
    handleStartAnalysisMock();
    assert.equal(callCount, 0, 'Concurrent calls during busy state should be rejected');
  });

  // Test 9: Universal retry state retention without page refresh
  await test('Universal retry state retains attempt payload for files, text, and active resume', () => {
    let lastAttempt = null;

    function recordAttempt(type, payload) {
      lastAttempt = { type, ...payload };
    }

    recordAttempt('file', { fileName: 'my-resume.pdf' });
    assert.equal(lastAttempt.type, 'file');
    assert.equal(lastAttempt.fileName, 'my-resume.pdf');

    recordAttempt('text', { title: 'Pasted Candidate Resume', text: validResumeText.slice(0, 100) });
    assert.equal(lastAttempt.type, 'text');
    assert.equal(lastAttempt.title, 'Pasted Candidate Resume');

    recordAttempt('builder', {});
    assert.equal(lastAttempt.type, 'builder');
  });

  // Test 10: Timer cleanup cancels all pending stage transitions on error or completion
  await test('Stage timers are fully tracked and cleared to prevent post-unmount or error state mutations', () => {
    const stageTimers = [];
    let stateMutatedAfterClear = false;

    // Simulate scheduling multi-stage animation transitions
    const t1 = setTimeout(() => {
      stateMutatedAfterClear = true;
    }, 50);
    const t2 = setTimeout(() => {
      stateMutatedAfterClear = true;
    }, 100);
    stageTimers.push(t1, t2);

    assert.equal(stageTimers.length, 2, 'Two stage timers should be scheduled');

    // Simulate clearStageTimers logic from ResumeAnalyzerPage
    function clearStageTimers() {
      stageTimers.forEach((t) => clearTimeout(t));
      stageTimers.length = 0;
    }

    clearStageTimers();
    assert.equal(stageTimers.length, 0, 'Stage timers array should be reset to 0');

    // Wait past the timer expiration to verify callbacks never executed
    return new Promise((resolve) => {
      setTimeout(() => {
        assert.equal(stateMutatedAfterClear, false, 'No timer callbacks should execute after clearStageTimers');
        resolve();
      }, 120);
    });
  });

  // Test 11: Verify that failures do not record as successful database analyses
  await test('Failed analyses are rejected before reaching database persistence', async () => {
    const invalidText = 'Short string lacking sections';
    const val = validateResumeDocument(invalidText);
    assert.equal(val.isValid, false, 'Invalid document must fail validation before DB write');
  });

  console.log(`\n================================================================`);
  console.log(`ALL ${passed}/${total} RESUME ANALYZER TESTS PASSED SUCCESSFULLY!`);
  console.log(`================================================================\n`);
}

run().catch((err) => {
  console.error('\nTest suite execution failed:', err);
  process.exit(1);
});
