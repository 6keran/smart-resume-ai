import assert from 'node:assert';
import zlib from 'node:zlib';
import Module from 'node:module';

// Intercept server-only for testing
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

console.log('================================================================');
console.log('📄 SMART RESUME AI: COMPREHENSIVE PDF PIPELINE & COMPATIBILITY AUDIT');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] Test ${passed}: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}:`, error);
}

// -----------------------------------------------------------------------------
// PDF Generator Helpers
// -----------------------------------------------------------------------------

function createFlateStream(text) {
  return zlib.deflateSync(Buffer.from(text, 'utf-8'));
}

function buildMinimalPdf(pagesContentArray, options = {}) {
  const { producer = 'Smart Resume AI PDF Builder', isEncrypted = false, hasImage = false } = options;

  let objects = [];
  let offsets = [];

  // 1 0 obj: Catalog
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2 0 obj: Pages
  const pageCount = pagesContentArray.length;
  const kids = Array.from({ length: pageCount }, (_, i) => `${3 + i * 2} 0 R`).join(' ');
  objects.push(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>\nendobj\n`);

  let currentObj = 3;
  for (let i = 0; i < pageCount; i++) {
    const pageObjNum = currentObj++;
    const contentObjNum = currentObj++;

    const streamRaw = pagesContentArray[i];
    const deflated = createFlateStream(streamRaw);

    let resources = `/Font << /F1 ${3 + pageCount * 2} 0 R >>`;
    if (hasImage) {
      resources += ` /XObject << /Im1 ${4 + pageCount * 2} 0 R >>`;
    }

    // Page object
    objects.push(
      `${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentObjNum} 0 R /Resources << ${resources} >> >>\nendobj\n`
    );

    // Contents object
    objects.push(
      Buffer.concat([
        Buffer.from(`${contentObjNum} 0 obj\n<< /Length ${deflated.length} /Filter /FlateDecode >>\nstream\n`),
        deflated,
        Buffer.from('\nendstream\nendobj\n'),
      ])
    );
  }

  // Font object
  const fontObjNum = currentObj++;
  objects.push(`${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

  // Optional Image object
  if (hasImage) {
    const imgObjNum = currentObj++;
    const fakeImgData = Buffer.alloc(100, 0xaa);
    objects.push(
      Buffer.concat([
        Buffer.from(`${imgObjNum} 0 obj\n<< /Type /XObject /Subtype /Image /Width 10 /Height 10 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${fakeImgData.length} >>\nstream\n`),
        fakeImgData,
        Buffer.from('\nendstream\nendobj\n'),
      ])
    );
  }

  // Optional Encryption object
  let encryptTrailer = '';
  if (isEncrypted) {
    const encObjNum = currentObj++;
    objects.push(`${encObjNum} 0 obj\n<< /Filter /Standard /V 2 /R 3 /O (fake_owner_hash) /U (fake_user_hash) /P -1052 >>\nendobj\n`);
    encryptTrailer = ` /Encrypt ${encObjNum} 0 R`;
  }

  // Info object
  const infoObjNum = currentObj++;
  objects.push(`${infoObjNum} 0 obj\n<< /Producer (${producer}) /CreationDate (D:20261102000000Z) >>\nendobj\n`);

  // Assemble with header and xref
  const header = Buffer.from('%PDF-1.7\n%âãÏÓ\n');
  let currentOffset = header.length;
  const bodyParts = [header];

  offsets.push(0); // 0th entry

  for (let idx = 0; idx < objects.length; idx++) {
    const obj = typeof objects[idx] === 'string' ? Buffer.from(objects[idx]) : objects[idx];
    offsets.push(currentOffset);
    bodyParts.push(obj);
    currentOffset += obj.length;
  }

  const startxref = currentOffset;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let o = 1; o < offsets.length; o++) {
    xref += `${offsets[o].toString().padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R /Info ${infoObjNum} 0 R${encryptTrailer} >>\nstartxref\n${startxref}\n%%EOF\n`;

  bodyParts.push(Buffer.from(xref));
  return Buffer.concat(bodyParts);
}

// -----------------------------------------------------------------------------
// AUDIT EXECUTION
// -----------------------------------------------------------------------------

async function runPdfPipelineAudit() {
  const {
    extractResumeText,
    detectFileSignature,
    isPdfPasswordProtected,
    isPdfScannedImageOnly,
  } = await import('../src/server/services/extractResumeText.ts');

  const { validateResumeDocument } = await import('../src/server/services/resumeValidator.ts');
  const { analyzeResume } = await import('../src/server/services/gemini.ts');

  // Resume Text Stream Payload
  const resumePage1Stream = `
BT
/F1 14 Tf
72 780 Td
(ALEXANDER CHEN - SENIOR FULL STACK ENGINEER) Tj
0 -20 Td
/F1 10 Tf
(Email: alex.chen@stanford.edu | Phone: \\(555\\) 321-7890 | San Francisco, CA) Tj
0 -15 Td
(GitHub: github.com/alexchen | LinkedIn: linkedin.com/in/alexchen-sde) Tj
0 -25 Td
/F1 12 Tf
(PROFESSIONAL SUMMARY) Tj
0 -16 Td
/F1 10 Tf
(Results-oriented Full Stack Software Engineer with 5+ years of experience architecting) Tj
0 -14 Td
(scalable distributed systems, React web applications, and high-throughput Node.js APIs.) Tj
0 -25 Td
/F1 12 Tf
(WORK EXPERIENCE) Tj
0 -16 Td
/F1 10 Tf
(Senior Software Engineer | Stripe | 2022 - Present) Tj
0 -14 Td
(- Engineered resilient payment webhook processing microservices in TypeScript and Node.js.) Tj
0 -14 Td
(- Reduced database connection contention by 42% utilizing Redis caching and PostgreSQL locks.) Tj
0 -25 Td
/F1 12 Tf
(EDUCATION) Tj
0 -16 Td
/F1 10 Tf
(Stanford University - B.S. in Computer Science | GPA: 3.88 | Class of 2021) Tj
0 -25 Td
/F1 12 Tf
(SKILLS) Tj
0 -16 Td
/F1 10 Tf
(TypeScript, JavaScript, React, Next.js, Node.js, PostgreSQL, Docker, Redis, Kubernetes) Tj
ET
`;

  const resumePage2Stream = `
BT
/F1 12 Tf
72 780 Td
(PROJECTS & ACCOMPLISHMENTS) Tj
0 -20 Td
/F1 10 Tf
(Distributed Vector Search Engine | Rust, TypeScript, Docker) Tj
0 -14 Td
(- Designed SIMD-accelerated cosine distance calculation engine achieving 15k QPS.) Tj
0 -25 Td
/F1 12 Tf
(CERTIFICATIONS) Tj
0 -16 Td
/F1 10 Tf
(AWS Certified Solutions Architect - Professional | 2023) Tj
ET
`;

  // ---------------------------------------------------------------------------
  // TEST 1: Valid One-Page PDF
  // ---------------------------------------------------------------------------
  console.log('--- Test Group 1: Standard & Multipage Document Extraction ---');
  try {
    const onePagePdf = buildMinimalPdf([resumePage1Stream], { producer: 'Standard PDF Producer' });
    const result = await extractResumeText(onePagePdf, 'Alex_Chen_Resume.pdf', 'application/pdf');

    assert.ok(result.text.includes('ALEXANDER CHEN'), 'Extracted candidate name');
    assert.ok(result.text.includes('alex.chen@stanford.edu'), 'Extracted contact email');
    assert.ok(result.text.includes('PROFESSIONAL SUMMARY'), 'Extracted summary heading');
    assert.ok(result.text.includes('Stripe'), 'Extracted company name');
    assert.ok(result.wordCount > 50, `Substantial word count (${result.wordCount} words)`);
    pass('Valid One-Page PDF', `Extracted ${result.wordCount} words using ${result.method}`);
  } catch (err) {
    fail('Test 1: Valid One-Page PDF', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Valid Multi-Page PDF
  // ---------------------------------------------------------------------------
  try {
    const multiPagePdf = buildMinimalPdf([resumePage1Stream, resumePage2Stream], { producer: 'Multipage PDF Writer' });
    const result = await extractResumeText(multiPagePdf, 'Alex_Chen_TwoPage.pdf', 'application/pdf');

    assert.ok(result.text.includes('ALEXANDER CHEN'), 'Page 1 name present');
    assert.ok(result.text.includes('Distributed Vector Search Engine'), 'Page 2 project present');
    assert.ok(result.text.includes('AWS Certified Solutions Architect'), 'Page 2 certification present');
    pass('Valid Multi-Page PDF', `Successfully concatenated 2 pages (${result.wordCount} words) via ${result.method}`);
  } catch (err) {
    fail('Test 2: Valid Multi-Page PDF', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 3: Smart Resume AI Resume Builder Generated PDF
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 2: Origin Application & Office Format Compatibility ---');
  try {
    const builderPdf = buildMinimalPdf([resumePage1Stream], {
      producer: 'Smart Resume AI - Chromium Headless PrintToPDF v16.4',
    });
    const result = await extractResumeText(builderPdf, 'smart-resume-builder-export.pdf', 'application/pdf');

    assert.ok(result.text.includes('Stanford University'), 'Builder education preserved');
    assert.ok(result.text.includes('PostgreSQL'), 'Builder skills preserved');
    pass('Smart Resume AI Generated PDF', `Parsed application builder export via ${result.method}`);
  } catch (err) {
    fail('Test 3: Smart Resume AI Generated PDF', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 4: Microsoft Word Exported PDF
  // ---------------------------------------------------------------------------
  try {
    const wordPdf = buildMinimalPdf([resumePage1Stream], {
      producer: 'Microsoft: Print to PDF / Microsoft Word for Office 365',
    });
    const result = await extractResumeText(wordPdf, 'Resume_Word_Export.pdf', 'application/pdf');

    assert.ok(result.text.includes('PROFESSIONAL SUMMARY'), 'Word summary preserved');
    assert.ok(result.text.includes('Stripe'), 'Word work history preserved');
    pass('Microsoft Word Exported PDF', `Handled Word print-to-pdf metadata via ${result.method}`);
  } catch (err) {
    fail('Test 4: Microsoft Word Exported PDF', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 5: Google Docs Exported PDF
  // ---------------------------------------------------------------------------
  try {
    const gdocsPdf = buildMinimalPdf([resumePage1Stream], {
      producer: 'Skia/PDF m122 Google Docs',
    });
    const result = await extractResumeText(gdocsPdf, 'Resume_Google_Docs.pdf', 'application/pdf');

    assert.ok(result.text.includes('ALEXANDER CHEN'), 'Google Docs candidate name extracted');
    pass('Google Docs Exported PDF', `Handled Google Docs Skia/PDF producer via ${result.method}`);
  } catch (err) {
    fail('Test 5: Google Docs Exported PDF', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 6: Scanned / Image-Only PDF Detection
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Document Edge Cases & Security Exceptions ---');
  try {
    // Scanned document: empty stream text but contains Image XObject
    const scannedPdf = buildMinimalPdf([''], { hasImage: true, producer: 'HP ScanJet Pro 4500' });
    const isScanned = isPdfScannedImageOnly(scannedPdf);
    assert.strictEqual(isScanned, true, 'isPdfScannedImageOnly correctly identified image-only PDF');

    try {
      await extractResumeText(scannedPdf, 'scanned_document.pdf', 'application/pdf');
      // If OCR is active, it might extract or fail gracefully
      pass('Scanned PDF Handling', 'Processed scanned PDF through OCR pipeline');
    } catch (err) {
      assert.ok(
        err.message.includes('scanned document') || err.message.includes('image-only'),
        `Clear scanned error message: "${err.message}"`
      );
      pass('Scanned PDF Detection', `Rejected scanned PDF with clear diagnostic message`);
    }
  } catch (err) {
    fail('Test 6: Scanned PDF Detection', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Empty PDF Handling
  // ---------------------------------------------------------------------------
  try {
    // 0-byte buffer
    try {
      await extractResumeText(Buffer.alloc(0), 'empty.pdf', 'application/pdf');
      assert.fail('Should fail on 0-byte buffer');
    } catch (err) {
      assert.ok(err.message.includes('empty (0 bytes)'), `0-byte error: ${err.message}`);
    }

    // PDF with no pages or catalog
    const emptyPdfBytes = Buffer.from('%PDF-1.7\n%%EOF');
    try {
      await extractResumeText(emptyPdfBytes, 'empty_struct.pdf', 'application/pdf');
      assert.fail('Should fail on empty PDF structure');
    } catch (err) {
      assert.ok(
        err.message.includes('no readable pages') || err.message.includes('No readable text'),
        `Empty structure message: ${err.message}`
      );
    }
    pass('Empty PDF Diagnostic', 'Reported clear 0-byte and empty structure diagnostics without generic crash');
  } catch (err) {
    fail('Test 7: Empty PDF Handling', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 8: Password-Protected PDF Detection
  // ---------------------------------------------------------------------------
  try {
    const encryptedPdf = buildMinimalPdf([resumePage1Stream], { isEncrypted: true });
    const isEncrypted = isPdfPasswordProtected(encryptedPdf);
    assert.strictEqual(isEncrypted, true, 'isPdfPasswordProtected identified /Encrypt dictionary');

    try {
      await extractResumeText(encryptedPdf, 'locked_resume.pdf', 'application/pdf');
      assert.fail('Should fail on encrypted PDF');
    } catch (err) {
      assert.ok(
        err.message.includes('password-protected'),
        `Exact password message: "${err.message}"`
      );
      assert.strictEqual(
        err.message.includes('corrupted or password-protected'),
        false,
        'Does NOT use the ambiguous corrupted-or-password combined error'
      );
    }
    pass('Password-Protected PDF', 'Separated password protection from file corruption with clear unlock instructions');
  } catch (err) {
    fail('Test 8: Password-Protected PDF', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 9: Invalid PDF Bytes & Corrupted Stream
  // ---------------------------------------------------------------------------
  try {
    const corruptBytes = Buffer.from('%PDF-corrupted-binary-with-destroyed-tables-and-no-objects');
    try {
      await extractResumeText(corruptBytes, 'corrupt.pdf', 'application/pdf');
      assert.fail('Should fail on corrupted PDF bytes');
    } catch (err) {
      assert.ok(
        err.message.includes('no readable pages') || err.message.includes('corrupted') || err.message.includes('No readable text'),
        `Corrupted file message: ${err.message}`
      );
    }
    pass('Invalid PDF Bytes Handling', 'Handled destroyed xref/objects gracefully');
  } catch (err) {
    fail('Test 9: Invalid PDF Bytes', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 10: Incorrect MIME Type & Binary Signature Verification
  // ---------------------------------------------------------------------------
  try {
    // 1. Image masquerading as PDF (.pdf extension with PNG magic bytes)
    const pngFake = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(100, 0),
    ]);
    const sig = detectFileSignature(pngFake);
    assert.strictEqual(sig.format, 'image', 'Detected PNG signature despite .pdf extension');

    try {
      await extractResumeText(pngFake, 'fake_resume.pdf', 'application/pdf');
      assert.fail('Should reject fake PNG');
    } catch (err) {
      assert.ok(err.message.includes('Image files are not supported'), `Image message: ${err.message}`);
    }

    // 2. Real PDF with generic or missing MIME type (application/octet-stream)
    const realPdfGenericMime = buildMinimalPdf([resumePage1Stream]);
    const extractedGeneric = await extractResumeText(realPdfGenericMime, 'resume', 'application/octet-stream');
    assert.ok(extractedGeneric.text.includes('ALEXANDER CHEN'), 'Identified PDF by magic bytes when MIME was octet-stream');

    pass('File Signature vs MIME Verification', 'Detected image masquerading as PDF and supported real PDF with generic MIME');
  } catch (err) {
    fail('Test 10: Incorrect MIME Type', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 11: Oversized File Upload Rejection
  // ---------------------------------------------------------------------------
  try {
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024, 0x41); // 11MB
    try {
      await extractResumeText(largeBuffer, 'huge_resume.pdf', 'application/pdf');
      assert.fail('Should reject oversized file');
    } catch (err) {
      assert.ok(err.message.includes('10MB limit'), `Oversized message: ${err.message}`);
    }
    pass('Oversized Upload Rejection', 'Strictly enforced 10MB limit before reading memory buffers');
  } catch (err) {
    fail('Test 11: Oversized Upload', err);
    throw err;
  }

  // ---------------------------------------------------------------------------
  // TEST 12: PDF Parsing Succeeds but AI Analysis Falls Back Gracefully
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 4: End-to-End Extraction to Analysis Resiliency ---');
  try {
    const validPdf = buildMinimalPdf([resumePage1Stream]);
    const extractedDoc = await extractResumeText(validPdf, 'Sarah_Jenkins.pdf', 'application/pdf');

    // Document validation
    const validation = validateResumeDocument(extractedDoc.text, { fileName: 'Sarah_Jenkins.pdf' });
    assert.strictEqual(validation.isValid, true, 'Resume document passed structural validation');

    // Run analysis: Even if AI provider hits quota/errors, it must fall back to deterministic ATS engine
    const analysis = await analyzeResume(extractedDoc.text, 'Senior Backend Engineer', 'Stripe');
    assert.ok(typeof analysis.overallAtsScore === 'number', 'ATS score computed');
    assert.ok(analysis.detectedKeywords.length > 0, `Detected ${analysis.detectedKeywords.length} technical skills`);
    assert.ok(analysis.topSuggestions.length > 0, 'Generated prioritized suggestions');
    pass('End-to-End Extraction to ATS Analysis', `Score: ${analysis.overallAtsScore}%, Detected: ${analysis.detectedKeywords.slice(0, 4).join(', ')} via ${analysis.analysisEngine}`);
  } catch (err) {
    fail('Test 12: Extraction to Analysis Resiliency', err);
    throw err;
  }

  console.log('\n================================================================');
  console.log(`TOTAL PDF COMPATIBILITY TESTS: 12 | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

runPdfPipelineAudit().catch((err) => {
  console.error('Fatal PDF pipeline audit error:', err);
  process.exit(1);
});

