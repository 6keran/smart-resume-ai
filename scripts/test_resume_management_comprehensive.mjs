import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// -----------------------------------------------------------------------------
// 1. ISOLATED TEST SANDBOX
// -----------------------------------------------------------------------------
setupTestDb('resume_management_comprehensive');

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

console.log('================================================================');
console.log('📄 SMART RESUME AI: RESUME REPLACEMENT, REMOVAL & SWITCHING AUDIT');
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

// Minimal PDF Generator for Testing Multipart Resume Upload
function buildTestResumePdf(text) {
  const streamRaw = `BT /F1 12 Tf 50 750 Td (${text.replace(/[()\\]/g, '')}) Tj ET`;
  const deflated = zlib.deflateSync(Buffer.from(streamRaw, 'utf-8'));

  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n');
  objects.push(
    Buffer.concat([
      Buffer.from(`4 0 obj\n<< /Length ${deflated.length} /Filter /FlateDecode >>\nstream\n`),
      deflated,
      Buffer.from('\nendstream\nendobj\n'),
    ])
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');
  objects.push('6 0 obj\n<< /Producer (Smart Resume AI Test Builder) >>\nendobj\n');

  const header = Buffer.from('%PDF-1.7\n%âãÏÓ\n');
  let currentOffset = header.length;
  const offsets = [0];
  const bodyParts = [header];

  for (let idx = 0; idx < objects.length; idx++) {
    offsets.push(currentOffset);
    const item = typeof objects[idx] === 'string' ? Buffer.from(objects[idx], 'utf-8') : objects[idx];
    bodyParts.push(item);
    currentOffset += item.length;
  }

  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  bodyParts.push(Buffer.from(xref, 'utf-8'));
  bodyParts.push(Buffer.from(trailer, 'utf-8'));

  return Buffer.concat(bodyParts);
}

async function runResumeManagementAudit() {
  const { getDb } = await import('../src/server/db/index.ts');

  // Pre-flight check: ensure HTTP server is reachable
  try {
    await fetch(`${BASE_URL}/`, { redirect: 'manual', signal: AbortSignal.timeout(3000) });
  } catch (err) {
    console.error(`\n❌ [PRE-FLIGHT ERROR] HTTP server at ${BASE_URL} is not reachable.`);
    console.error(`   To run this live HTTP test suite, ensure the Next.js server is running`);
    console.error(`   or execute the automated isolated runner: node scripts/run_live_e2e_isolated.mjs\n`);
    process.exit(1);
  }

  const timestamp = Date.now();
  const testIp1 = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const testIp2 = `198.51.100.${Math.floor(Math.random() * 200) + 10}`;
  const studentAEmail = `alexa.resume.${timestamp}@stanford.edu`;
  const studentBEmail = `ben.resume.${timestamp}@mit.edu`;
  const password = 'SecureResumePass2026!';

  let cookieA = '';
  let cookieB = '';
  let userAId = '';
  let userBId = '';

  let resumeId1 = '';
  let resumeId2 = '';
  let resumeId3 = '';

  try {
    // ------------------------------------------------------------------------
    // PHASE 1: Authentication & User Setup
    // ------------------------------------------------------------------------
    console.log('--- Phase 1: Authentication & User Setup ---');

    // Register User A
    const regResA = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp1 },
      body: JSON.stringify({
        fullName: 'Alexa Candidate',
        email: studentAEmail,
        password: password,
        confirmPassword: password,
      }),
    });
    const regDataA = await regResA.json();
    assert.ok(regResA.status === 200 || regResA.status === 201, `User A registration status: ${regResA.status}`);
    userAId = regDataA.user?.id;
    assert.ok(userAId, 'User A ID must be present');
    const rawCookieA = regResA.headers.get('set-cookie');
    assert.ok(rawCookieA, 'User A session cookie must be set');
    cookieA = rawCookieA.split(';')[0];
    pass('User A registration and session acquisition', `ID: ${userAId}`);

    // Register User B
    const regResB = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': testIp2 },
      body: JSON.stringify({
        fullName: 'Ben Competitor',
        email: studentBEmail,
        password: password,
        confirmPassword: password,
      }),
    });
    const regDataB = await regResB.json();
    assert.ok(regResB.status === 200 || regResB.status === 201, `User B registration status: ${regResB.status}`);
    userBId = regDataB.user?.id;
    assert.ok(userBId, 'User B ID must be present');
    const rawCookieB = regResB.headers.get('set-cookie');
    assert.ok(rawCookieB, 'User B session cookie must be set');
    cookieB = rawCookieB.split(';')[0];
    pass('User B registration and session acquisition', `ID: ${userBId}`);

    // ------------------------------------------------------------------------
    // PHASE 2: Create First Resume for User A (Resume 1: Software Engineer)
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 2: Create Initial Resume (Resume 1) ---');

    const resume1Payload = {
      createNew: true,
      filename: 'Alexa_SWE_Resume.pdf',
      resumeData: {
        personalInfo: {
          fullName: 'Alexa Candidate',
          email: studentAEmail,
          phone: '(555) 234-5678',
          location: 'San Francisco, CA',
        },
        summary: 'Passionate Full Stack Software Engineer specializing in Next.js and distributed cloud microservices.',
        skills: {
          technical: ['TypeScript', 'React', 'Next.js', 'Node.js', 'PostgreSQL'],
          tools: ['Docker', 'Git', 'AWS'],
          soft: ['Problem Solving', 'Leadership'],
        },
        experience: [
          {
            id: 'exp-1',
            company: 'Stripe',
            position: 'Software Engineer Intern',
            startDate: 'Jun 2024',
            endDate: 'Sep 2024',
            description: 'Architected high-throughput webhook processing engine reducing p99 latency by 42%.',
          },
        ],
        education: [
          {
            id: 'edu-1',
            institution: 'Stanford University',
            degree: 'B.S. in Computer Science',
            graduationYear: '2025',
          },
        ],
      },
    };

    const saveRes1 = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-forwarded-for': testIp1,
      },
      body: JSON.stringify(resume1Payload),
    });
    const saveData1 = await saveRes1.json();
    assert.equal(saveRes1.status, 200, `Save Resume 1 HTTP status: ${saveRes1.status}`);
    assert.ok(saveData1.resumeId, 'Saved response must return resumeId');
    resumeId1 = saveData1.resumeId;
    pass('User A creates initial resume (Resume 1)', `ID: ${resumeId1}`);

    // Verify User A resume list has exactly 1 resume
    const listRes1 = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const listData1 = await listRes1.json();
    assert.equal(listRes1.status, 200);
    assert.ok(Array.isArray(listData1.resumes), 'Response must contain resumes array');
    assert.equal(listData1.resumes.length, 1, 'Should have exactly 1 resume in list');
    assert.equal(listData1.resumes[0].id, resumeId1);
    pass('User A resumes list contains Resume 1');

    // ------------------------------------------------------------------------
    // PHASE 3: Add Another Resume for User A (Resume 2: Machine Learning)
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 3: Add Another Resume (Resume 2) & Overwrite Protection ---');

    const resume2Payload = {
      createNew: true,
      filename: 'Alexa_ML_Research_Resume.pdf',
      resumeData: {
        personalInfo: {
          fullName: 'Alexa Candidate',
          email: studentAEmail,
          phone: '(555) 234-5678',
          location: 'San Francisco, CA',
        },
        summary: 'AI & Machine Learning Researcher focused on Large Language Model inference acceleration.',
        skills: {
          technical: ['Python', 'PyTorch', 'CUDA', 'Transformers', 'vLLM'],
          tools: ['Weights & Biases', 'Ray', 'Linux'],
          soft: ['Research Writing', 'Collaboration'],
        },
        experience: [
          {
            id: 'exp-2',
            company: 'OpenAI',
            position: 'ML Research Intern',
            startDate: 'Jan 2025',
            endDate: 'May 2025',
            description: 'Trained sparse attention models achieving 2.1x speedup with zero perplexity loss.',
          },
        ],
        education: [
          {
            id: 'edu-2',
            institution: 'Stanford University',
            degree: 'M.S. in Artificial Intelligence',
            graduationYear: '2026',
          },
        ],
      },
    };

    const saveRes2 = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-forwarded-for': testIp1,
      },
      body: JSON.stringify(resume2Payload),
    });
    const saveData2 = await saveRes2.json();
    assert.equal(saveRes2.status, 200, `Save Resume 2 HTTP status: ${saveRes2.status}`);
    assert.ok(saveData2.resumeId, 'Saved response must return resumeId');
    resumeId2 = saveData2.resumeId;
    assert.notEqual(resumeId2, resumeId1, 'Resume 2 must receive a new distinct resumeId');
    pass('User A creates second resume (Resume 2)', `ID: ${resumeId2}`);

    // Verify User A now has 2 distinct saved resumes
    const listRes2 = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const listData2 = await listRes2.json();
    assert.equal(listRes2.status, 200);
    assert.equal(listData2.resumes.length, 2, 'Should have exactly 2 resumes in list');
    const ids = listData2.resumes.map((r) => r.id);
    assert.ok(ids.includes(resumeId1), 'List must include Resume 1');
    assert.ok(ids.includes(resumeId2), 'List must include Resume 2');
    pass('User A resumes list contains both Resume 1 and Resume 2');

    // CRITICAL DATA INTEGRITY CHECK: Verify Resume 1 was NOT overwritten by Resume 2
    const fetchRes1Check = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId1)}`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const fetchRes1Data = await fetchRes1Check.json();
    assert.equal(fetchRes1Check.status, 200);
    const resume1Obj = fetchRes1Data.resume || fetchRes1Data;
    assert.equal(resume1Obj.id, resumeId1);
    assert.ok(
      resume1Obj.resumeData.summary.includes('Full Stack Software Engineer'),
      'Resume 1 must retain its original Software Engineer summary'
    );
    assert.ok(
      resume1Obj.resumeData.experience[0].company === 'Stripe',
      'Resume 1 must retain Stripe experience'
    );
    pass('Data Integrity: Resume 1 content completely preserved without accidental overwriting');

    // ------------------------------------------------------------------------
    // PHASE 4: Resume Switching & Independent Updating
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 4: Resume Switching & Selective Updating ---');

    // Fetch Resume 2 explicitly
    const fetchRes2Check = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId2)}`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const fetchRes2Data = await fetchRes2Check.json();
    assert.equal(fetchRes2Check.status, 200);
    const resume2Obj = fetchRes2Data.resume || fetchRes2Data;
    assert.equal(resume2Obj.id, resumeId2);
    assert.ok(
      resume2Obj.resumeData.summary.includes('AI & Machine Learning Researcher'),
      'Resume 2 must have distinct ML summary'
    );
    assert.ok(
      resume2Obj.resumeData.experience[0].company === 'OpenAI',
      'Resume 2 must have distinct OpenAI experience'
    );
    pass('Resume Switching: Distinct content successfully loaded for each resume ID');

    // Update Resume 1 only
    const updatedResume1Payload = {
      resumeId: resumeId1,
      filename: 'Alexa_SWE_Resume_Updated.pdf',
      resumeData: {
        ...resume1Obj.resumeData,
        summary: 'Updated Senior Software Engineer specializing in Next.js and distributed systems.',
      },
    };

    const updateRes1 = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-forwarded-for': testIp1,
      },
      body: JSON.stringify(updatedResume1Payload),
    });
    assert.equal(updateRes1.status, 200);
    pass('Updated Resume 1 specifically using resumeId');

    // Verify Resume 2 was NOT touched by the update to Resume 1
    const verifyRes2Unchanged = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId2)}`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const dataRes2Unchanged = await verifyRes2Unchanged.json();
    const resume2UnchangedObj = dataRes2Unchanged.resume || dataRes2Unchanged;
    assert.ok(
      resume2UnchangedObj.resumeData.summary.includes('AI & Machine Learning Researcher'),
      'Resume 2 summary must remain unchanged'
    );
    pass('Selective Isolation: Updating Resume 1 did not modify Resume 2');

    // ------------------------------------------------------------------------
    // PHASE 5: Upload Another Resume Directly (PDF Multipart Upload)
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 5: Direct Resume Upload (Multipart Form Data) ---');

    const pdfTextContent = `
Alex Candidate
alexa.resume@stanford.edu | (555) 234-5678 | San Francisco, CA

PROFESSIONAL SUMMARY
Quantitative Developer with expertise in algorithmic trading, C++, and financial modeling.

EDUCATION
Stanford University - B.S. Mathematics & Computer Science, 2025

TECHNICAL SKILLS
Languages: C++, Python, Rust, SQL
Frameworks: Boost, NumPy, Pandas, QuantLib

EXPERIENCE
Jane Street - Quantitative Trader Intern
June 2024 - August 2024
- Built automated ETF arbitrage market maker generating $1.2M simulated volume.
- Developed low-latency order execution book in modern C++20.

PROJECTS
High Frequency Trading Backtester
- Implemented tick-level limit order book simulator processing 500,000 events/second.
`;

    const samplePdfBuffer = buildTestResumePdf(pdfTextContent);
    assert.ok(samplePdfBuffer.length > 100, 'PDF buffer must be valid');

    // Create multipart form data using Node's native FormData and Blob
    const formData = new FormData();
    const pdfBlob = new Blob([samplePdfBuffer], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'Alexa_Quant_Resume.pdf');

    const uploadRes = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: {
        Cookie: cookieA,
        'x-forwarded-for': testIp1,
      },
      body: formData,
    });

    const uploadData = await uploadRes.json();
    assert.equal(uploadRes.status, 200, `Upload response status: ${uploadRes.status}`);
    assert.ok(uploadData.resumeId, 'Upload response must include new resumeId');
    resumeId3 = uploadData.resumeId;
    assert.notEqual(resumeId3, resumeId1, 'Uploaded resume must be a new record');
    assert.notEqual(resumeId3, resumeId2, 'Uploaded resume must be distinct from Resume 2');
    pass('Multipart resume PDF uploaded and parsed into structured fields', `ID: ${resumeId3}`);

    // Verify User A now has 3 resumes
    const listRes3 = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const listData3 = await listRes3.json();
    assert.equal(listData3.resumes.length, 3, 'User A should now have 3 saved resumes');
    pass('User A now manages 3 concurrent resumes in workspace');

    // ------------------------------------------------------------------------
    // PHASE 6: Upload Validation & Graceful Rejection
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 6: Upload Validation & Format Protection ---');

    // Test rejection of non-PDF/DOCX file
    const invalidFormData = new FormData();
    const textBlob = new Blob(['Random text without proper resume structure or binary header.'], {
      type: 'text/plain',
    });
    invalidFormData.append('file', textBlob, 'notes.txt');

    const badUploadRes = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
      body: invalidFormData,
    });
    assert.ok(
      badUploadRes.status === 400 || badUploadRes.status === 422,
      `Invalid upload must be rejected (got ${badUploadRes.status})`
    );
    const badUploadJson = await badUploadRes.json();
    assert.ok(badUploadJson.message, 'Rejection response must contain descriptive error message');
    pass('Invalid file format correctly rejected with user-friendly error');

    // Verify User A still has exactly 3 resumes
    const listRes4 = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const listData4 = await listRes4.json();
    assert.equal(listData4.resumes.length, 3, 'Resume count must remain unchanged after failed upload');
    pass('Failed upload does not pollute workspace or database');

    // ------------------------------------------------------------------------
    // PHASE 7: Cross-User Security & Authorization Boundaries
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 7: Cross-User Security & Authorization Boundaries ---');

    // User B attempts to access User A's Resume 1
    const crossFetchRes = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId1)}`, {
      headers: { Cookie: cookieB, 'x-forwarded-for': testIp2 },
    });
    assert.ok(
      crossFetchRes.status === 404 || crossFetchRes.status === 403,
      `User B fetching User A resume must return 404/403 (got ${crossFetchRes.status})`
    );
    pass('Cross-User: User B cannot fetch User A resume');

    // User B attempts to delete User A's Resume 1
    const crossDeleteRes = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId1)}`, {
      method: 'DELETE',
      headers: { Cookie: cookieB, 'x-forwarded-for': testIp2 },
    });
    assert.ok(
      crossDeleteRes.status === 404 || crossDeleteRes.status === 403,
      `User B deleting User A resume must return 404/403 (got ${crossDeleteRes.status})`
    );
    pass('Cross-User: User B cannot delete User A resume');

    // User B list resumes: User B sees 0 resumes
    const listResB = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieB, 'x-forwarded-for': testIp2 },
    });
    const listDataB = await listResB.json();
    assert.equal(listDataB.resumes.length, 0, 'User B must see 0 resumes');
    pass('Cross-User: Complete data isolation between student workspaces');

    // ------------------------------------------------------------------------
    // PHASE 8: Remove Active Resume (Safe Controlled Deletion)
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 8: Remove Active Resume (Controlled Removal) ---');

    // User A removes Resume 1
    const deleteRes1 = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId1)}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const deleteData1 = await deleteRes1.json();
    assert.equal(deleteRes1.status, 200, `Delete status: ${deleteRes1.status}`);
    assert.equal(deleteData1.success, true);
    pass('User A safely removes active resume (Resume 1)');

    // Verify Resume 1 is gone from list
    const listResAfterDelete = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const listDataAfterDelete = await listResAfterDelete.json();
    assert.equal(listDataAfterDelete.resumes.length, 2, 'User A should now have 2 resumes left');
    const remainingIds = listDataAfterDelete.resumes.map((r) => r.id);
    assert.ok(!remainingIds.includes(resumeId1), 'Resume 1 must no longer be present');
    assert.ok(remainingIds.includes(resumeId2), 'Resume 2 must still be present');
    assert.ok(remainingIds.includes(resumeId3), 'Resume 3 must still be present');
    pass('Resume 1 removed; Resume 2 and Resume 3 strictly preserved');

    // Verify Resume 1 directly returns 404 now
    const verify404 = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId1)}`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    assert.equal(verify404.status, 404, 'Direct fetch of removed resume must return 404');
    pass('Removed resume cannot be queried via API');

    // Verify User A account & profile still intact
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const meData = await meRes.json();
    assert.equal(meRes.status, 200);
    assert.equal(meData.user?.id, userAId);
    assert.equal(meData.user?.email, studentAEmail);
    pass('User profile and account completely preserved after resume removal');

    // Verify remaining resumes still load their full data
    const fetchRes2Final = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId2)}`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const dataRes2Final = await fetchRes2Final.json();
    assert.equal(fetchRes2Final.status, 200);
    const resume2FinalObj = dataRes2Final.resume || dataRes2Final;
    assert.ok(
      resume2FinalObj.resumeData.summary.includes('AI & Machine Learning Researcher'),
      'Resume 2 content remains fully functional'
    );
    pass('Remaining resumes are fully operational and accessible');

    // ------------------------------------------------------------------------
    // PHASE 9: Active Resume Setting & Switching
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 9: Active Resume Setting & Switching ---');

    // Set Resume 2 as active
    const setActiveRes = await fetch(`${BASE_URL}/api/user/resumes?action=set_active&id=${encodeURIComponent(resumeId2)}`, {
      method: 'POST',
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const setActiveData = await setActiveRes.json();
    assert.equal(setActiveRes.status, 200, `Set active status: ${setActiveRes.status}`);
    assert.equal(setActiveData.success, true);
    assert.equal(setActiveData.activeResumeId, resumeId2);
    pass('Explicitly set Resume 2 as active via API');

    // Verify GET /api/user/resumes lists Resume 2 as active and Resume 3 as not active
    const listResAfterActive = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const listDataAfterActive = await listResAfterActive.json();
    const resume2Card = listDataAfterActive.resumes.find((r) => r.id === resumeId2);
    const resume3Card = listDataAfterActive.resumes.find((r) => r.id === resumeId3);
    assert.equal(resume2Card?.isActive, true, 'Resume 2 must have isActive: true');
    assert.equal(resume3Card?.isActive, false, 'Resume 3 must have isActive: false');
    pass('Verified Resume 2 is active and other resumes are inactive');

    // Cross-user test: User B cannot set User A's resume as active
    const crossSetActive = await fetch(`${BASE_URL}/api/user/resumes?action=set_active&id=${encodeURIComponent(resumeId2)}`, {
      method: 'POST',
      headers: { Cookie: cookieB, 'x-forwarded-for': testIp2 },
    });
    assert.ok(
      crossSetActive.status === 404 || crossSetActive.status === 403,
      `User B cannot set User A's resume active (got ${crossSetActive.status})`
    );
    pass('Cross-User: User B cannot set User A resume active');

    // ------------------------------------------------------------------------
    // PHASE 10: Languages, Achievements & Section Order Persistence
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 10: Languages, Achievements & Section Order Persistence ---');

    const richResumePayload = {
      action: 'save',
      resumeId: resumeId2,
      resumeData: {
        ...resume2FinalObj.resumeData,
        languages: ['English (Fluent)', 'Spanish (Professional)', 'German (Basic)'],
        achievements: [
          'First Place - Stanford AI Hackathon 2025',
          'Co-authored paper accepted at NeurIPS Workshop',
        ],
        sectionOrder: ['summary', 'skills', 'experience', 'projects', 'education', 'achievements', 'languages', 'certifications'],
      },
    };

    const updateRichRes = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-forwarded-for': testIp1,
      },
      body: JSON.stringify(richResumePayload),
    });
    assert.equal(updateRichRes.status, 200);
    pass('Saved resume with languages, achievements, and custom section order');

    // Fetch and verify fields are retrieved accurately
    const fetchRichRes = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId2)}`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const fetchRichData = await fetchRichRes.json();
    const loadedData = fetchRichData.resume?.resumeData || fetchRichData.resumeData;
    assert.deepEqual(loadedData.languages, ['English (Fluent)', 'Spanish (Professional)', 'German (Basic)']);
    assert.deepEqual(loadedData.achievements, [
      'First Place - Stanford AI Hackathon 2025',
      'Co-authored paper accepted at NeurIPS Workshop',
    ]);
    assert.deepEqual(loadedData.sectionOrder, ['summary', 'skills', 'experience', 'projects', 'education', 'achievements', 'languages', 'certifications']);
    pass('Retrieved languages, achievements, and section order matching saved payload');

    // ------------------------------------------------------------------------
    // PHASE 11: Fallback Active Assignment Upon Active Resume Deletion
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 11: Fallback Active Assignment on Active Resume Deletion ---');

    // Currently Resume 2 is active. Delete Resume 2.
    const deleteActiveRes = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(resumeId2)}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    assert.equal(deleteActiveRes.status, 200);
    pass('Deleted active resume (Resume 2)');

    // Verify remaining resume (Resume 3) automatically became active
    const listResFallback = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const listDataFallback = await listResFallback.json();
    assert.equal(listDataFallback.resumes.length, 1, 'Only 1 resume should remain');
    const fallbackResume = listDataFallback.resumes[0];
    assert.equal(fallbackResume.id, resumeId3, 'Remaining resume should be Resume 3');
    assert.equal(fallbackResume.isActive, true, 'Remaining resume must automatically be promoted to active');
    pass('Automatic fallback: Remaining resume promoted to active after deletion');

    // ------------------------------------------------------------------------
    // PHASE 12: Multi-Resume Active Promotion (3 Resumes -> Delete Active)
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 12: Multi-Resume Active Promotion (3 Resumes) ---');

    const createResA = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-forwarded-for': testIp1,
      },
      body: JSON.stringify({
        createNew: true,
        setActive: true,
        filename: 'Multi_Promotion_A.pdf',
        resumeData: {
          ...resume1Payload.resumeData,
          personalInfo: { ...resume1Payload.resumeData.personalInfo, fullName: 'Multi Promotion A' },
        },
      }),
    });
    assert.equal(createResA.status, 200);
    const dataResA = await createResA.json();
    const multiIdA = dataResA.resumeId;
    assert.ok(multiIdA);

    const createResB = await fetch(`${BASE_URL}/api/user/resumes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieA,
        'x-forwarded-for': testIp1,
      },
      body: JSON.stringify({
        createNew: true,
        setActive: true,
        filename: 'Multi_Promotion_B.pdf',
        resumeData: {
          ...resume1Payload.resumeData,
          personalInfo: { ...resume1Payload.resumeData.personalInfo, fullName: 'Multi Promotion B' },
        },
      }),
    });
    assert.equal(createResB.status, 200);
    const dataResB = await createResB.json();
    const multiIdB = dataResB.resumeId;
    assert.ok(multiIdB);

    // Delete active Resume B while 2 other resumes remain
    const delMultiBRes = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(multiIdB)}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    assert.equal(delMultiBRes.status, 200);
    const delMultiBData = await delMultiBRes.json();
    assert.equal(delMultiBData.success, true);
    assert.ok(delMultiBData.nextActiveResumeId && delMultiBData.nextActiveResumeId !== multiIdB, 'nextActiveResumeId must point to remaining resume');

    const activeAfterMultiDelRes = await fetch(`${BASE_URL}/api/user/resumes?active=true`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    assert.equal(activeAfterMultiDelRes.status, 200);
    const activeAfterMultiDelData = await activeAfterMultiDelRes.json();
    assert.equal(
      activeAfterMultiDelData.resume?.id,
      delMultiBData.nextActiveResumeId,
      'DB active resume must match promoted nextActiveResumeId with 2 remaining resumes'
    );

    const listAfterMultiDelRes = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const listAfterMultiDelData = await listAfterMultiDelRes.json();
    assert.equal(listAfterMultiDelData.resumes.length, 2, '2 resumes should remain after deleting 1 of 3');
    const activeItems = listAfterMultiDelData.resumes.filter((r) => r.isActive);
    assert.equal(activeItems.length, 1, 'Exactly 1 remaining resume must be active');
    assert.equal(activeItems[0].id, delMultiBData.nextActiveResumeId, 'Listed active resume must match promoted ID');
    pass('Multi-resume active promotion verified with 3 -> 2 resumes');

    // ------------------------------------------------------------------------
    // PHASE 13: Analyzer Upload Removal (resume_data = NULL) & Empty Cleanup
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 13: Analyzer Upload Removal & Last-Resume Cleanup ---');

    const analyzerForm = new FormData();
    analyzerForm.append('file', new Blob([samplePdfBuffer], { type: 'application/pdf' }), 'Analyzer_Only_CV.pdf');
    const analyzeRes = await fetch(`${BASE_URL}/api/resume/analyze`, {
      method: 'POST',
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
      body: analyzerForm,
    });
    assert.equal(analyzeRes.status, 200, `Analyzer upload failed with status ${analyzeRes.status}`);

    const listWithAnalyzerRes = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const listWithAnalyzerData = await listWithAnalyzerRes.json();
    const analyzerEntry = listWithAnalyzerData.resumes.find((r) => r.filename === 'Analyzer_Only_CV.pdf');
    assert.ok(analyzerEntry?.id, 'Analyzer upload should appear in user resumes list');

    const delAnalyzerRes = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(analyzerEntry.id)}`, {
      method: 'DELETE',
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    assert.equal(delAnalyzerRes.status, 200);
    const delAnalyzerData = await delAnalyzerRes.json();
    assert.equal(delAnalyzerData.success, true);

    const checkDeletedAnalyzer = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(analyzerEntry.id)}`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    assert.equal(checkDeletedAnalyzer.status, 404, 'Deleted analyzer resume must return 404');

    // Delete all remaining resumes and confirm empty state
    for (const rem of [multiIdA, resumeId3]) {
      const delRemRes = await fetch(`${BASE_URL}/api/user/resumes?id=${encodeURIComponent(rem)}`, {
        method: 'DELETE',
        headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
      });
      assert.equal(delRemRes.status, 200);
    }

    const finalEmptyListRes = await fetch(`${BASE_URL}/api/user/resumes`, {
      headers: { Cookie: cookieA, 'x-forwarded-for': testIp1 },
    });
    const finalEmptyListData = await finalEmptyListRes.json();
    assert.equal(finalEmptyListData.resumes.length, 0, 'All User A resumes removed cleanly');
    pass('Analyzer upload removal and complete last-resume cleanup verified');

    console.log('\n================================================================');
    console.log(`🎉 ALL ${passed} RESUME MANAGEMENT & REMOVAL TESTS PASSED!`);
    console.log('================================================================\n');
  } catch (err) {
    fail('Resume Management Audit Suite', err);
    throw err;
  }
}

runResumeManagementAudit().catch((err) => {
  console.error('\n❌ Resume management audit encountered fatal error:', err);
  process.exit(1);
});
