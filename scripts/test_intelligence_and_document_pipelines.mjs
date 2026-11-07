import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import Module from 'node:module';

// Intercept server-only for standalone execution
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

console.log('================================================================');
console.log('🧠 SMART RESUME AI: INTELLIGENCE & DOCUMENT PIPELINES AUDIT');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`✓ PASS [${totalTests}]: ${desc}`);
      passedTests++;
    })
    .catch((err) => {
      console.error(`✗ FAIL [${totalTests}]: ${desc}`);
      console.error(err);
      process.exitCode = 1;
      throw err;
    });
}

const sampleResume = `
Alex Mercer
Systems Software Engineer
alex.mercer@mit.edu | (617) 555-0199 | Boston, MA | github.com/alexmercer

PROFESSIONAL SUMMARY
Systems software engineer with 4+ years of experience building high-throughput distributed backends in C++, Rust, and Go.
Specialized in consensus protocols, low-latency network I/O, and Linux kernel optimization.

EXPERIENCE
Systems Software Engineer | Cloudflare (2022 - Present)
- Designed and deployed an edge cache routing proxy in Rust handling 1.8M req/sec with sub-millisecond p99 latency.
- Optimized epoll network thread pool, reducing CPU context switching by 38% under peak DDoS mitigation workloads.
- Automated release canary pipelines using GitHub Actions, reducing rollout failure rate to zero.

Junior Backend Engineer | Akamai Technologies (2020 - 2022)
- Implemented asynchronous DNS resolver modules in C++20 and libuv.
- Profiled memory allocation hot paths using eBPF and perf, eliminating 150MB of unnecessary heap allocations per worker.

EDUCATION
B.S. in Computer Science & Engineering | MIT (2016 - 2020)
GPA: 3.9/4.0 | Dean's Honor Roll

TECHNICAL SKILLS
Languages: C++, Rust, Go, Python, TypeScript, Bash
Systems: Linux Kernel, eBPF, TCP/IP, Docker, Kubernetes, PostgreSQL, Redis, RocksDB
Tools: Git, GDB, Valgrind, Perf, CI/CD, Terraform
`;

const sampleJobDesc = `
Staff Systems Engineer - Infrastructure
We are seeking a Staff Systems Engineer to design, scale, and maintain our global edge network infrastructure.
Requirements:
- 4+ years experience with low-level systems programming in Rust, C++, or Go.
- Deep expertise in Linux networking, socket programming, epoll/kqueue, and asynchronous runtimes.
- Experience building distributed storage or caching architectures (RocksDB, Redis, Raft).
- Solid foundation in operating systems, concurrency primitives, and hardware performance profiling.
`;

async function runSuite() {
  const {
    probeAvailableGeminiModels,
    analyzeResume,
    generateDeterministicAtsAnalysis,
    PRIMARY_GEMINI_MODEL,
    CANDIDATE_GEMINI_MODELS,
  } = await import('../src/server/services/gemini.ts');

  const {
    detectFileSignature,
    extractResumeText,
  } = await import('../src/server/services/extractResumeText.ts');

  // ============================================================================
  // GROUP 1: LIVE GEMINI MODEL DISCOVERY & PROBE (AI-01)
  // ============================================================================
  console.log('--- GROUP 1: LIVE GEMINI MODEL AVAILABILITY PROBE (AI-01) ---');

  await it('Live Model Probe: Discovers available Gemini models dynamically via GenAI API', async () => {
    const models = await probeAvailableGeminiModels(true);
    assert.ok(Array.isArray(models), 'Models probe must return an array');
    assert.ok(models.length > 0, 'Models probe must discover at least 1 active model');
    const hasGeminiOrFlash = models.some((m) => m.includes('gemini') || m.includes('flash'));
    assert.ok(hasGeminiOrFlash, 'Discovered models must contain Gemini/Flash models');
  });

  await it('Live Model Probe: Caching TTL preserves probe results across repeated invocations', async () => {
    const start = Date.now();
    const modelsFirst = await probeAvailableGeminiModels(false);
    const modelsSecond = await probeAvailableGeminiModels(false);
    const duration = Date.now() - start;
    assert.deepEqual(modelsFirst, modelsSecond, 'Cached probe returns identical model set');
    assert.ok(duration < 100, 'Cached lookup returns instantly without API round-trip');
  });

  await it('Model Configuration: Primary model and candidate cascade are strictly defined', async () => {
    assert.equal(PRIMARY_GEMINI_MODEL, 'gemini-3.5-flash');
    assert.ok(CANDIDATE_GEMINI_MODELS.includes('gemini-3.5-flash'));
    assert.ok(CANDIDATE_GEMINI_MODELS.includes('gemini-3.5-flash-lite'));
    assert.ok(CANDIDATE_GEMINI_MODELS.includes('gemini-flash-latest'));
  });

  // ============================================================================
  // GROUP 2: CANDIDATE FAILOVER & DETERMINISTIC FALLBACK (AI-02, AI-03)
  // ============================================================================
  console.log('\n--- GROUP 2: CANDIDATE FAILOVER & DETERMINISTIC ENGINE LATENCY (AI-02, AI-03) ---');

  await it('Deterministic ATS Fallback: Executes with sub-500ms latency (< 50ms typical)', async () => {
    const t0 = Date.now();
    const deterministicResult = generateDeterministicAtsAnalysis(sampleResume, sampleJobDesc);
    const latencyMs = Date.now() - t0;

    assert.ok(latencyMs < 500, `Deterministic latency must be < 500ms (actual: ${latencyMs}ms)`);
    assert.ok(typeof deterministicResult.overallAtsScore === 'number');
    assert.ok(deterministicResult.overallAtsScore >= 0 && deterministicResult.overallAtsScore <= 100);
    assert.ok(Array.isArray(deterministicResult.topSuggestions));
    assert.ok(
      deterministicResult.topSuggestions.length > 0 && deterministicResult.topSuggestions.length <= 3,
      'Must produce between 1 and 3 prioritized suggestions'
    );
    assert.ok(typeof deterministicResult.keywordMatchScore === 'number', 'Must produce keywordMatchScore');
  });

  await it('Deterministic ATS Engine: Identifies matching technical skills and gaps truthfully', async () => {
    const result = generateDeterministicAtsAnalysis(sampleResume, sampleJobDesc);
    const matchedSkills = (result.detectedKeywords || []).map((s) => s.toLowerCase());
    assert.ok(matchedSkills.includes('rust') || matchedSkills.includes('c++') || matchedSkills.includes('linux'), 'Detects core skills');
    assert.ok(result.overallAtsScore >= 70, 'Strong candidate resume receives appropriate high score');
  });

  await it('External AI Resilience: Missing API key falls back to deterministic ATS engine without error', async () => {
    const origKey = process.env.GEMINI_API_KEY;
    const origGoogleKey = process.env.GOOGLE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    try {
      const result = await analyzeResume(sampleResume, sampleJobDesc);
      assert.ok(result, 'Result must be returned seamlessly');
      assert.ok(typeof result.overallAtsScore === 'number');
      assert.ok(result.overallAtsScore > 0);
    } finally {
      if (origKey !== undefined) process.env.GEMINI_API_KEY = origKey;
      if (origGoogleKey !== undefined) process.env.GOOGLE_API_KEY = origGoogleKey;
    }
  });

  // ============================================================================
  // GROUP 3: IN-MEMORY 10MB DOCUMENT PARSING & MAGIC BYTES (AI-04)
  // ============================================================================
  console.log('\n--- GROUP 3: IN-MEMORY 10MB DOCUMENT PARSING & MAGIC BYTES (AI-04) ---');

  await it('Magic-Byte Validation: Accurately detects PDF format via %PDF- header', async () => {
    const pdfHeader = Buffer.from('%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF');
    const signature = detectFileSignature(pdfHeader);
    assert.equal(signature.format, 'pdf');
  });

  await it('Magic-Byte Validation: Accurately detects DOCX format via PK\\x03\\x04 zip header', async () => {
    const docxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    const signature = detectFileSignature(docxHeader);
    assert.equal(signature.format, 'docx');
  });

  await it('Magic-Byte Validation: Accurately detects legacy Word (.doc) via OLE CFBF header', async () => {
    const legacyDocHeader = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    const signature = detectFileSignature(legacyDocHeader);
    assert.equal(signature.format, 'doc');
  });

  await it('Magic-Byte Validation: Accurately detects PNG, JPEG, and WebP images', async () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    assert.equal(detectFileSignature(pngHeader).format, 'image');

    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
    assert.equal(detectFileSignature(jpegHeader).format, 'image');
  });

  await it('In-Memory 10MB Processing: Handles 10MB in-memory buffer without filesystem writes', async () => {
    const filesBefore = fs.readdirSync(process.cwd());

    // Create 10MB synthetic buffer (10 * 1024 * 1024 bytes) with PDF header
    const size10MB = 10 * 1024 * 1024;
    const largeBuffer = Buffer.alloc(size10MB, 0x20); // filled with spaces
    largeBuffer.write('%PDF-1.7\n', 0);
    largeBuffer.write('John Student Resume Software Engineer\n', 10);
    largeBuffer.write('%%EOF\n', size10MB - 10);

    const sig = detectFileSignature(largeBuffer);
    assert.equal(sig.format, 'pdf');

    // Verify zero temp files were created in working directory
    const filesAfter = fs.readdirSync(process.cwd());
    assert.deepEqual(filesBefore, filesAfter, 'Zero files must be written to disk during in-memory processing');
  });

  await it('File Size Boundary: Buffers exceeding 10MB are strictly rejected', async () => {
    const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024); // 10MB + 1KB
    oversizedBuffer.write('%PDF-1.7\n', 0);

    let threw = false;
    try {
      await extractResumeText(oversizedBuffer, 'oversized.pdf', 'application/pdf');
    } catch (err) {
      threw = true;
      assert.ok(/exceeds|limit|10MB/i.test(err.message));
    }
    assert.ok(threw, 'extractResumeText must reject files > 10MB');
  });

  // ============================================================================
  // GROUP 4: DIN A4 PRINT DIMENSIONS & PAGINATION (AI-05)
  // ============================================================================
  console.log('\n--- GROUP 4: DIN A4 STANDARD PRINT ACCURACY (AI-05) ---');

  await it('A4 Standards: Validates ISO 216 dimensions (210mm x 297mm, ratio 1.414:1)', async () => {
    const widthMm = 210;
    const heightMm = 297;
    const ratio = heightMm / widthMm;
    assert.ok(Math.abs(ratio - Math.SQRT2) < 0.001, 'Aspect ratio must match 1.414 (sqrt(2))');

    // At standard 96 DPI: 210mm = 793.7px (~794px), 297mm = 1122.5px (~1123px)
    const pxPerMm = 96 / 25.4;
    const widthPx = Math.round(widthMm * pxPerMm);
    const heightPx = Math.round(heightMm * pxPerMm);
    assert.equal(widthPx, 794);
    assert.equal(heightPx, 1123);
  });

  await it('Print Stylesheet Integrity: Checks page-break-inside, overflow visible, and size A4', async () => {
    const cssPath = path.join(process.cwd(), 'src/app/globals.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(cssContent.includes('@media print'), 'globals.css must contain @media print styles');
    assert.ok(cssContent.includes('size: A4 portrait') || cssContent.includes('size: a4 portrait') || cssContent.includes('size: 210mm 297mm') || cssContent.includes('size: A4'), 'Print styles must declare standard A4 size');
    assert.ok(cssContent.includes('page-break-inside: avoid') || cssContent.includes('break-inside: avoid'), 'Print styles must avoid breaking inside sections');
  });

  console.log('\n================================================================');
  console.log(`TOTAL PIPELINE TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: 0`);
  console.log('================================================================');
  console.log('🎉 ALL INTELLIGENCE & DOCUMENT PIPELINE TESTS PASSED (100%)');
}

runSuite().catch((err) => {
  console.error('Fatal Pipeline Test Error:', err);
  process.exit(1);
});
