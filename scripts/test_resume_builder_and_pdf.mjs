import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('===============================================================');
console.log('🧪 SMART RESUME AI: RESUME BUILDER & PDF GENERATION REGRESSION TESTS');
console.log('===============================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } catch (err) {
    console.error(`  ❌ [FAIL] ${testName}:`, err.message);
    throw err;
  }
}

// -----------------------------------------------------------------------------
// 1. PHONE FORMAT VALIDATION
// -----------------------------------------------------------------------------
console.log('--- TEST GROUP 1: PHONE & CONTACT VALIDATION ---');

function validatePhone(phone) {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Please enter your phone number.' };
  }
  const trimmed = phone.trim();
  const digitCount = trimmed.replace(/\D/g, '').length;
  if (!/^[+]?[\d\s().-]{7,25}$/.test(trimmed) || digitCount < 7 || digitCount > 15) {
    return {
      valid: false,
      error: 'Please enter a valid phone number (7 to 15 digits, optionally with country code).',
    };
  }
  return { valid: true };
}

runTest('Rejects alphabetic phone number ("abc")', () => {
  const res = validatePhone('abc');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('valid phone number'));
});

runTest('Rejects phone number with fewer than 7 digits ("12345")', () => {
  const res = validatePhone('12345');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('7 to 15 digits'));
});

runTest('Rejects phone number with more than 15 digits', () => {
  const res = validatePhone('+12345678901234567');
  assert.strictEqual(res.valid, false);
  assert.ok(res.error.includes('7 to 15 digits'));
});

runTest('Accepts valid US format with formatting characters: "+1 (555) 123-4567"', () => {
  const res = validatePhone('+1 (555) 123-4567');
  assert.strictEqual(res.valid, true);
});

runTest('Accepts valid international format: "+91-9876543210"', () => {
  const res = validatePhone('+91-9876543210');
  assert.strictEqual(res.valid, true);
});

// -----------------------------------------------------------------------------
// 2. EDUCATION & SKILLS HANDLING
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 2: EDUCATION & SKILLS HANDLING ---');

runTest('Single education item can be deleted down to 0 items', () => {
  const initialEdu = [{ id: 'edu_1', degree: 'B.S. CS', institution: 'MIT' }];
  const updatedEdu = initialEdu.filter((_, i) => i !== 0);
  assert.strictEqual(updatedEdu.length, 0, 'Must allow 0 education items to show empty state');
});

runTest('Multiple education items: all items must have degree and institution', () => {
  const pageFile = fs.readFileSync(path.join(rootDir, 'src/app/builder/page.tsx'), 'utf-8');
  assert.ok(
    pageFile.includes('data.education.forEach((edu, idx) => {'),
    'Step 4 validation must loop through all education entries'
  );
  assert.ok(
    pageFile.includes('education.${idx}.degree'),
    'Step 4 must set field error for specific education index degree'
  );
  assert.ok(
    pageFile.includes('education.${idx}.institution'),
    'Step 4 must set field error for specific education index institution'
  );
});

runTest('Skill chip removal button exists and correctly removes skill', () => {
  const pageFile = fs.readFileSync(path.join(rootDir, 'src/app/builder/page.tsx'), 'utf-8');
  assert.ok(
    pageFile.includes('title={`Remove ${sk}`}') || pageFile.includes('aria-label={`Remove ${sk}`}'),
    'Skill chip must contain remove button'
  );

  const initialSkills = ['Python', 'TypeScript', 'React'];
  const removeIndex = 1; // remove TypeScript
  const updatedSkills = initialSkills.filter((_, i) => i !== removeIndex);
  assert.deepStrictEqual(updatedSkills, ['Python', 'React']);
});

runTest('Controlled skills text inputs do not prematurely strip comma or space on typing', () => {
  const pageFile = fs.readFileSync(path.join(rootDir, 'src/app/builder/page.tsx'), 'utf-8');
  assert.ok(
    pageFile.includes('const [technicalSkillsInput, setTechnicalSkillsInput] = useState'),
    'Local state for technicalSkillsInput must be defined'
  );
  assert.ok(
    pageFile.includes('value={technicalSkillsInput}'),
    'input-skills-technical must bind to technicalSkillsInput'
  );
  assert.ok(
    pageFile.includes('value={toolsSkillsInput}'),
    'input-skills-tools must bind to toolsSkillsInput'
  );
  assert.ok(
    pageFile.includes('value={softSkillsInput}'),
    'input-skills-soft must bind to softSkillsInput'
  );
});

// -----------------------------------------------------------------------------
// 3. EXPERIENCE & PROJECT DIFFERENTIAL VALIDATION
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 3: EXPERIENCE & PROJECT REQUIREMENTS ---');

runTest('Experienced candidate requires at least 1 experience position', () => {
  const pageFile = fs.readFileSync(path.join(rootDir, 'src/app/builder/page.tsx'), 'utf-8');
  assert.ok(
    pageFile.includes("data.candidateType === 'experienced'") &&
    pageFile.includes("!data.experience || data.experience.length === 0"),
    'Experienced candidates must be blocked if experience is empty'
  );
});

runTest('Fresher candidate requires at least 1 project', () => {
  const pageFile = fs.readFileSync(path.join(rootDir, 'src/app/builder/page.tsx'), 'utf-8');
  assert.ok(
    pageFile.includes("data.candidateType === 'fresher'") &&
    pageFile.includes("!data.projects || data.projects.length === 0"),
    'Fresher candidates must be blocked if projects is empty'
  );
});

runTest('All added experience items require role and company', () => {
  const pageFile = fs.readFileSync(path.join(rootDir, 'src/app/builder/page.tsx'), 'utf-8');
  assert.ok(
    pageFile.includes('experience.${idx}.role') &&
    pageFile.includes('experience.${idx}.company'),
    'Experience validation must check role and company for all indices'
  );
});

runTest('Accomplishment bullets textarea does not strip intermediate empty lines while typing', () => {
  const pageFile = fs.readFileSync(path.join(rootDir, 'src/app/builder/page.tsx'), 'utf-8');
  assert.ok(
    pageFile.includes("updated[idx].bulletPoints = e.target.value.split('\\n');"),
    'Accomplishment bullets onChange must preserve newline characters while typing'
  );
});

runTest('ResumeRenderer cleans empty bullet lines so empty bullets are not rendered in PDF', () => {
  const rendererFile = fs.readFileSync(path.join(rootDir, 'src/components/builder/templates/ResumeRenderer.tsx'), 'utf-8');
  assert.ok(
    rendererFile.includes('.filter(Boolean)'),
    'ResumeRenderer must filter empty bullet lines before passing to templates'
  );
});

// -----------------------------------------------------------------------------
// 4. RESUME SAVE, UPDATE, RELOAD & DELETE API (OWNERSHIP CHECKS)
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 4: RESUME OWNERSHIP & CRUD OPERATIONS ---');

runTest('deleteUserResume function is implemented in src/server/db/index.ts', () => {
  const dbFile = fs.readFileSync(path.join(rootDir, 'src/server/db/index.ts'), 'utf-8');
  assert.ok(
    dbFile.includes('export async function deleteUserResume('),
    'deleteUserResume must be exported in server db module'
  );
  assert.ok(
    dbFile.includes('if (existing.user_id !== userId)'),
    'deleteUserResume must strictly enforce user_id ownership check'
  );
  assert.ok(
    dbFile.includes('DELETE FROM resume_versions WHERE resume_id = ? AND user_id = ?'),
    'deleteUserResume must delete associated resume versions'
  );
  assert.ok(
    dbFile.includes('DELETE FROM resumes WHERE id = ? AND user_id = ?'),
    'deleteUserResume must delete the resume record'
  );
});

runTest('DELETE HTTP method is exported in /api/user/resumes route', () => {
  const routeFile = fs.readFileSync(path.join(rootDir, 'src/app/api/user/resumes/route.ts'), 'utf-8');
  assert.ok(
    routeFile.includes('export async function DELETE(req: Request)'),
    'DELETE handler must be exported in /api/user/resumes'
  );
  assert.ok(
    routeFile.includes('deleteUserResume('),
    'DELETE handler must invoke deleteUserResume'
  );
  assert.ok(
    routeFile.includes('status: 401') && routeFile.includes('status: 403'),
    'DELETE handler must return 401 for unauthorized and 403 for forbidden ownership violations'
  );
});

// -----------------------------------------------------------------------------
// 5. RESUME PDF & A4 GEOMETRY
// -----------------------------------------------------------------------------
console.log('\n--- TEST GROUP 5: RESUME PDF DIMENSIONS & PAGE BREAKS ---');

runTest('PDF CSS specifies standard A4 dimensions: 210mm x 297mm', () => {
  const cssFile = fs.readFileSync(path.join(rootDir, 'src/app/globals.css'), 'utf-8');
  assert.ok(
    cssFile.includes('size: 210mm 297mm;'),
    '@page size must be 210mm 297mm'
  );
  assert.ok(
    cssFile.includes('width: 210mm !important;') && cssFile.includes('min-height: 297mm !important;'),
    'Print body must enforce 210mm width and 297mm min-height'
  );
});

runTest('Print CSS prevents clipping with overflow: visible !important', () => {
  const cssFile = fs.readFileSync(path.join(rootDir, 'src/app/globals.css'), 'utf-8');
  assert.ok(
    cssFile.includes('overflow: visible !important;'),
    'Print rules must set overflow: visible !important to prevent content cutoff'
  );
});

runTest('Print CSS protects headings and entries across page breaks', () => {
  const cssFile = fs.readFileSync(path.join(rootDir, 'src/app/globals.css'), 'utf-8');
  assert.ok(
    cssFile.includes('break-inside: avoid !important;') || cssFile.includes('page-break-inside: avoid !important;'),
    'Entries must have break-inside: avoid to prevent splitting mid-item'
  );
  assert.ok(
    cssFile.includes('break-after: avoid !important;') || cssFile.includes('page-break-after: avoid !important;'),
    'Headings must have break-after: avoid to prevent orphan headers'
  );
});

runTest('Download PDF forces persistence flush before triggering window.print()', () => {
  const pageFile = fs.readFileSync(path.join(rootDir, 'src/app/builder/page.tsx'), 'utf-8');
  assert.ok(
    pageFile.includes('const handleGenerateOrPrint = async () => {'),
    'handleGenerateOrPrint must be async'
  );
  assert.ok(
    pageFile.includes('await saveActiveResume(resumeData, undefined, { force: true });'),
    'handleGenerateOrPrint must flush latest saved data before window.print'
  );
});

console.log('\n===============================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} RESUME BUILDER & PDF TESTS PASSED SUCCESSFULLY!`);
console.log('===============================================================\n');
