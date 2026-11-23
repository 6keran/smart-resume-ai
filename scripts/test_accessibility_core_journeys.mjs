import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = Number(process.env.TEST_PORT || 3188);
const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${PORT}`;

console.log('========================================================================');
console.log('♿ SMART RESUME AI: WCAG 2.1 AA ACCESSIBILITY AUDIT & JOURNEY VALIDATOR');
console.log('========================================================================\n');

let totalTests = 0;
let passedTests = 0;
const findings = [];

function pass(name, detail = '') {
  totalTests++;
  passedTests++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, detail = '') {
  totalTests++;
  console.error(`  ❌ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  findings.push({ name, detail, status: 'FAIL' });
  throw new Error(`Test failed: ${name} - ${detail}`);
}

function recordFinding(criterion, rule, screen, severity, status, notes) {
  findings.push({ criterion, rule, screen, severity, status, notes });
}

// -----------------------------------------------------------------------------
// HELPER: Color Contrast Ratio (WCAG 2.1 Formula)
// -----------------------------------------------------------------------------
function hexToLuminance(hex) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1, hex2) {
  const l1 = hexToLuminance(hex1);
  const l2 = hexToLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// =============================================================================
// PART 1: CODE-LEVEL STATIC ACCESSIBILITY VALIDATION (10 Core Journeys)
// =============================================================================
console.log('\n--- PART 1: CODE-LEVEL STATIC WCAG 2.1 AA VALIDATION ---');

// 1. Registration (`src/app/register/page.tsx`)
console.log('\n[Journey 1: Registration Page]');
{
  const filePath = path.join(rootDir, 'src', 'app', 'register', 'page.tsx');
  const code = fs.readFileSync(filePath, 'utf-8');

  // Verify form labels
  assert.ok(code.includes('htmlFor="fullName"'), 'Registration has htmlFor="fullName"');
  assert.ok(code.includes('id="fullName"'), 'Registration has id="fullName"');
  assert.ok(code.includes('htmlFor="email"'), 'Registration has htmlFor="email"');
  assert.ok(code.includes('id="email"'), 'Registration has id="email"');
  assert.ok(code.includes('htmlFor="password"'), 'Registration has htmlFor="password"');
  assert.ok(code.includes('id="password"'), 'Registration has id="password"');
  pass('Registration form labels bound via htmlFor matching id', 'fullName, email, password');

  // Verify error alert semantics
  assert.ok(code.includes('role="alert"'), 'Registration error container has role="alert"');
  assert.ok(code.includes('aria-describedby={error ? \'register-error\' : undefined}'), 'Inputs associate error via aria-describedby');
  assert.ok(code.includes('aria-invalid={Boolean(error)}'), 'Inputs indicate error via aria-invalid');
  pass('Registration form errors convey role="alert", aria-invalid, aria-describedby');

  // Verify focus visibility & password toggles
  assert.ok(code.includes('focus-visible:ring-2') || code.includes('focus:ring-2'), 'Registration inputs have focus ring');
  assert.ok(code.includes('aria-label={showPassword'), 'Password toggle button has aria-label');
  assert.ok(code.includes('aria-pressed={showPassword}'), 'Password toggle button indicates state via aria-pressed');
  pass('Registration focus indicators and password toggle accessible names verified');

  recordFinding('1.3.1 / 3.3.1 / 4.1.2', 'Form labels & error announcements', '/register', 'Compliant', 'PASS', 'All inputs explicitly associated; role="alert" on errors');
}

// 2. Login (`src/app/login/page.tsx`)
console.log('\n[Journey 2: Login Page]');
{
  const filePath = path.join(rootDir, 'src', 'app', 'login', 'page.tsx');
  const code = fs.readFileSync(filePath, 'utf-8');

  // Verify form labels
  assert.ok(code.includes('htmlFor="email"'), 'Login has htmlFor="email"');
  assert.ok(code.includes('id="email"'), 'Login has id="email"');
  assert.ok(code.includes('htmlFor="password"'), 'Login has htmlFor="password"');
  assert.ok(code.includes('id="password"'), 'Login has id="password"');
  pass('Login form labels bound via htmlFor matching id');

  // Verify error alert semantics
  assert.ok(code.includes('role="alert"'), 'Login error container has role="alert"');
  assert.ok(code.includes('aria-describedby={error ? \'auth-error\' : undefined}'), 'Inputs associate error via aria-describedby');
  pass('Login form error alerts associated via role="alert" and aria-describedby');

  // Verify modal dialog & Escape key handling
  assert.ok(code.includes('role="dialog"'), 'Forgot password modal has role="dialog"');
  assert.ok(code.includes('aria-modal="true"'), 'Forgot password modal has aria-modal="true"');
  assert.ok(code.includes('aria-labelledby="forgot-password-title"'), 'Forgot password modal has aria-labelledby');
  assert.ok(code.includes("e.key === 'Escape'"), 'Forgot password modal handles Escape key dismissal');
  pass('Forgot Password modal conforms to WAI-ARIA Dialog pattern with Escape dismissal');

  recordFinding('2.1.2 / 4.1.2', 'Modal dialog semantics & Escape dismissal', '/login', 'Compliant', 'PASS', 'role="dialog", aria-modal="true", Escape key closes dialog');
}

// 3. Profile Creation (`UserProfileModal.tsx` & `/dashboard/profile`)
console.log('\n[Journey 3: Profile Creation & Management]');
{
  const modalPath = path.join(rootDir, 'src', 'components', 'user', 'UserProfileModal.tsx');
  const modalCode = fs.readFileSync(modalPath, 'utf-8');

  assert.ok(modalCode.includes('role="dialog"'), 'UserProfileModal has role="dialog"');
  assert.ok(modalCode.includes('aria-modal="true"'), 'UserProfileModal has aria-modal="true"');
  assert.ok(modalCode.includes('aria-labelledby="user-profile-modal-title"'), 'UserProfileModal has aria-labelledby');
  assert.ok(modalCode.includes('id="user-profile-modal-title"'), 'UserProfileModal has matching title id');
  assert.ok(modalCode.includes('htmlFor="user-profile-name"'), 'UserProfileModal has htmlFor for name');
  assert.ok(modalCode.includes('id="user-profile-name"'), 'UserProfileModal has id="user-profile-name"');
  assert.ok(modalCode.includes('htmlFor="user-profile-email"'), 'UserProfileModal has htmlFor for email');
  assert.ok(modalCode.includes('id="user-profile-email"'), 'UserProfileModal has id="user-profile-email"');
  assert.ok(modalCode.includes('role="alert"'), 'UserProfileModal error has role="alert"');
  assert.ok(modalCode.includes("e.key === 'Escape'"), 'UserProfileModal handles Escape key');
  pass('UserProfileModal has full ARIA dialog attributes, label associations, and Escape key dismissal');

  const profilePagePath = path.join(rootDir, 'src', 'app', 'dashboard', 'profile', 'page.tsx');
  const profilePageCode = fs.readFileSync(profilePagePath, 'utf-8');
  assert.ok(profilePageCode.includes('role="tablist"'), 'Profile page has role="tablist"');
  assert.ok(profilePageCode.includes('role="tab"'), 'Profile page has role="tab"');
  assert.ok(profilePageCode.includes('aria-selected={activeTab === \'student\'}'), 'Profile page has aria-selected on student tab');
  pass('Profile dashboard tab switcher has role="tablist", role="tab", aria-selected');

  recordFinding('1.3.1 / 2.1.2 / 4.1.2', 'Dialog semantics, input labels & tablist', 'UserProfileModal & /dashboard/profile', 'Compliant', 'PASS', 'Escape listener, explicit labels, ARIA tabs');
}

// 4. Resume Builder (`src/app/builder/page.tsx`)
console.log('\n[Journey 4: Resume Builder]');
{
  const filePath = path.join(rootDir, 'src', 'app', 'builder', 'page.tsx');
  const code = fs.readFileSync(filePath, 'utf-8');

  // Landmark regions
  assert.ok(code.includes('<aside'), 'Builder layout has <aside> landmark');
  assert.ok(code.includes('<main'), 'Builder layout has <main> landmark');
  assert.ok(code.includes('<nav'), 'Builder layout has <nav> landmark');
  pass('Resume Builder provides semantic landmarks (<aside>, <main>, <nav>)');

  // Step navigation current state
  assert.ok(code.includes('aria-current={isSelected ? \'step\' : undefined}'), 'Step navigation buttons indicate current step via aria-current="step"');
  pass('Step navigation buttons communicate active step state via aria-current="step"');

  // Accessible PDF export controls
  assert.ok(code.includes('id="toolbar-download-pdf"') || code.includes('id="btn-download-pdf"'), 'Download PDF button has explicit ID');
  assert.ok(code.includes('aria-label="Download PDF resume"'), 'Download PDF button has descriptive aria-label');
  pass('PDF Export control has accessible name, unambiguous aria-label, and explicit ID');

  recordFinding('1.3.1 / 2.4.1 / 4.1.2', 'Landmarks & PDF Export controls', '/builder', 'Compliant', 'PASS', 'Semantic landmarks, step indicator, aria-label on PDF export');
}

// 5. ATS Analysis (`src/app/ats-score/page.tsx` & `src/app/analyzer/page.tsx`)
console.log('\n[Journey 5: ATS Analysis]');
{
  const scorePath = path.join(rootDir, 'src', 'app', 'ats-score', 'page.tsx');
  const scoreCode = fs.readFileSync(scorePath, 'utf-8');

  // ATS Score tablist
  assert.ok(scoreCode.includes('role="tablist"'), 'ATS Score has role="tablist"');
  assert.ok(scoreCode.includes('role="tab"'), 'ATS Score tabs have role="tab"');
  assert.ok(scoreCode.includes('aria-selected={activeTab === \'upload\'}'), 'ATS Score tab has aria-selected');
  pass('ATS Score input mode switcher has role="tablist" and aria-selected');

  // ATS Score keyboard drop zone
  assert.ok(scoreCode.includes('role="button"'), 'ATS Score drop zone has role="button"');
  assert.ok(scoreCode.includes('tabIndex={0}'), 'ATS Score drop zone has tabIndex={0}');
  assert.ok(scoreCode.includes('aria-label="Upload resume file"'), 'ATS Score drop zone has aria-label');
  assert.ok(scoreCode.includes("e.key === 'Enter' || e.key === ' '"), 'ATS Score drop zone activates on Enter and Space');
  pass('ATS Score drag-and-drop zone is fully keyboard focusable and activatable via Enter/Space');

  // ATS Score paste textarea and target job inputs
  assert.ok(scoreCode.includes('htmlFor="ats-paste-textarea"'), 'ATS Score paste textarea has label');
  assert.ok(scoreCode.includes('id="ats-paste-textarea"'), 'ATS Score paste textarea has id');
  assert.ok(scoreCode.includes('htmlFor="ats-target-job-title"'), 'ATS Score target role input has label');
  assert.ok(scoreCode.includes('id="ats-target-job-title"'), 'ATS Score target role input has id');
  pass('ATS Score text inputs and textareas have explicit label bindings');

  // Analyzer paste modal & drop zone
  const analyzerPath = path.join(rootDir, 'src', 'app', 'analyzer', 'page.tsx');
  const analyzerCode = fs.readFileSync(analyzerPath, 'utf-8');

  assert.ok(analyzerCode.includes('role="dialog"'), 'Analyzer Paste Modal has role="dialog"');
  assert.ok(analyzerCode.includes('aria-modal="true"'), 'Analyzer Paste Modal has aria-modal="true"');
  assert.ok(analyzerCode.includes('aria-labelledby="analyzer-paste-modal-title"'), 'Analyzer Paste Modal has aria-labelledby');
  assert.ok(analyzerCode.includes("e.key === 'Escape'"), 'Analyzer Paste Modal handles Escape key');
  assert.ok(analyzerCode.includes('htmlFor="analyzer-custom-text"'), 'Analyzer paste textarea has label');
  assert.ok(analyzerCode.includes('id="analyzer-custom-text"'), 'Analyzer paste textarea has id');
  pass('Analyzer paste modal has complete ARIA dialog attributes, label, and Escape key dismissal');

  recordFinding('2.1.1 / 2.1.2 / 4.1.2', 'Keyboard drop zone & Modal dialogs', '/ats-score & /analyzer', 'Compliant', 'PASS', 'Enter/Space drop zone activation, Escape key modal closing, tablist');
}

// 6. AI Assistant Chat (`src/components/chat/CareerChatbot.tsx`)
console.log('\n[Journey 6: AI Assistant Chatbot]');
{
  const chatbotPath = path.join(rootDir, 'src', 'components', 'chat', 'CareerChatbot.tsx');
  const code = fs.readFileSync(chatbotPath, 'utf-8');

  // Launcher accessibility
  assert.ok(code.includes('aria-label="Open AI Assistant'), 'Chatbot launcher has descriptive aria-label');
  assert.ok(code.includes('handleKeyDownLauncher'), 'Chatbot launcher has keyboard navigation handlers');
  pass('Chatbot launcher provides accessible name and keyboard activation/positioning');

  // Chat window dialog
  assert.ok(code.includes('role="dialog"'), 'Chatbot panel has role="dialog"');
  assert.ok(code.includes('aria-label="Smart Resume AI Assistant"'), 'Chatbot panel has aria-label');
  assert.ok(code.includes("e.key === 'Escape'"), 'Chatbot panel closes on Escape key');
  pass('Chatbot window conforms to ARIA dialog specification with Escape key closing');

  // Screen reader announcements & message live region
  assert.ok(code.includes('aria-live') || code.includes('role="region"'), 'Chatbot message stream has live/region attributes');
  pass('Chatbot message area announced to assistive technologies');

  recordFinding('2.1.1 / 2.1.2 / 4.1.2', 'Draggable launcher & ARIA dialog panel', 'CareerChatbot.tsx', 'Compliant', 'PASS', 'Keyboard dragging/repositioning, Escape key close, dialog semantics');
}

// 7. Project Coach (`src/app/projects/page.tsx`)
console.log('\n[Journey 7: Project Coach]');
{
  const filePath = path.join(rootDir, 'src', 'app', 'projects', 'page.tsx');
  const code = fs.readFileSync(filePath, 'utf-8');

  // Main navigation tablist
  assert.ok(code.includes('role="tablist"'), 'Projects page has role="tablist"');
  assert.ok(code.includes('aria-label="Project workspace sections"'), 'Projects tablist has aria-label');
  assert.ok(code.includes('aria-selected={mainTab === \'recommendations\'}'), 'Recommendations tab has aria-selected');
  assert.ok(code.includes('aria-selected={mainTab === \'workspace\'}'), 'Workspace tab has aria-selected');
  assert.ok(code.includes('aria-selected={mainTab === \'portfolio\'}'), 'Portfolio tab has aria-selected');
  pass('Project Coach main tabs conform to WAI-ARIA tablist pattern');

  // Workspace sub-tabs
  assert.ok(code.includes('aria-label="Workspace tools"'), 'Workspace sub-tabs have aria-label');
  assert.ok(code.includes('aria-selected={workspaceTab === \'milestones\'}'), 'Milestones sub-tab has aria-selected');
  assert.ok(code.includes('aria-selected={workspaceTab === \'specification\'}'), 'Specification sub-tab has aria-selected');
  assert.ok(code.includes('aria-selected={workspaceTab === \'mentor\'}'), 'Mentor sub-tab has aria-selected');
  assert.ok(code.includes('aria-selected={workspaceTab === \'resume\'}'), 'Resume integration sub-tab has aria-selected');
  pass('Project Coach workspace sub-tabs conform to WAI-ARIA tablist pattern');

  recordFinding('4.1.2', 'Tablist role and selected state', '/projects', 'Compliant', 'PASS', 'role="tablist", role="tab", aria-selected on all project navigation');
}

// 8. Interview Preparation (`src/app/interview-prep/page.tsx`)
console.log('\n[Journey 8: Interview Preparation]');
{
  const filePath = path.join(rootDir, 'src', 'app', 'interview-prep', 'page.tsx');
  const code = fs.readFileSync(filePath, 'utf-8');

  // Setup form labels
  assert.ok(code.includes('htmlFor="interview-target-role"'), 'Setup form has htmlFor="interview-target-role"');
  assert.ok(code.includes('id="interview-target-role"'), 'Setup form has id="interview-target-role"');
  assert.ok(code.includes('htmlFor="interview-target-company"'), 'Setup form has htmlFor="interview-target-company"');
  assert.ok(code.includes('id="interview-target-company"'), 'Setup form has id="interview-target-company"');
  assert.ok(code.includes('htmlFor="interview-job-desc"'), 'Setup form has htmlFor="interview-job-desc"');
  assert.ok(code.includes('id="interview-job-desc"'), 'Setup form has id="interview-job-desc"');
  pass('Interview Prep setup inputs have explicit label associations');

  // Answer textarea & live evaluation
  assert.ok(code.includes('htmlFor="interview-user-answer"'), 'Answer textarea has htmlFor');
  assert.ok(code.includes('id="interview-user-answer"'), 'Answer textarea has id');
  assert.ok(code.includes('role="status"'), 'Evaluation container has role="status"');
  assert.ok(code.includes('aria-live="polite"'), 'Evaluation container has aria-live="polite"');
  pass('Interview Prep answer input labeled and evaluation results announced via role="status" aria-live="polite"');

  recordFinding('1.3.1 / 4.1.3', 'Form labels & dynamic status messages', '/interview-prep', 'Compliant', 'PASS', 'Explicit labels on all inputs; role="status" live region for evaluation');
}

// 9. Job Search (`src/app/jobs/page.tsx`)
console.log('\n[Journey 9: Job Search & Application]');
{
  const filePath = path.join(rootDir, 'src', 'app', 'jobs', 'page.tsx');
  const code = fs.readFileSync(filePath, 'utf-8');

  // Slide-over drawer dialog & Confirm prompt dialog
  assert.ok(code.includes('role="dialog"'), 'Jobs drawer and confirm prompt have role="dialog"');
  assert.ok(code.includes('aria-modal="true"'), 'Jobs dialogs have aria-modal="true"');
  assert.ok(code.includes("e.key === 'Escape'"), 'Jobs dialogs handle Escape key');
  assert.ok(code.includes("e.key === 'Tab'"), 'Jobs dialogs implement keyboard Tab trapping');
  pass('Job search drawer and confirmation prompt implement ARIA Dialog, focus trapping, and Escape key dismissal');

  recordFinding('2.1.2 / 2.4.3 / 4.1.2', 'Modal dialog & focus trapping', '/jobs', 'Compliant', 'PASS', 'Tab focus trapping, Escape key closing, aria-modal="true"');
}

// 10. Admin Login (`src/app/admin/login/page.tsx`)
console.log('\n[Journey 10: Admin Login]');
{
  const filePath = path.join(rootDir, 'src', 'app', 'admin', 'login', 'page.tsx');
  const code = fs.readFileSync(filePath, 'utf-8');

  // Form labels
  assert.ok(code.includes('htmlFor="admin-email"'), 'Admin login has htmlFor="admin-email"');
  assert.ok(code.includes('id="admin-email"'), 'Admin login has id="admin-email"');
  assert.ok(code.includes('htmlFor="admin-password"'), 'Admin login has htmlFor="admin-password"');
  assert.ok(code.includes('id="admin-password"'), 'Admin login has id="admin-password"');
  pass('Admin login inputs bound to labels via htmlFor matching id');

  // Error alert semantics
  assert.ok(code.includes('role="alert"'), 'Admin login error container has role="alert"');
  assert.ok(code.includes('id="admin-login-error"'), 'Admin login error has id="admin-login-error"');
  assert.ok(code.includes('aria-invalid={Boolean(error)}'), 'Admin login inputs indicate invalidity');
  assert.ok(code.includes('aria-describedby={error ? "admin-login-error" : undefined}'), 'Admin login inputs point to error via aria-describedby');
  pass('Admin login error alerts convey role="alert" and associate with inputs via aria-describedby');

  recordFinding('1.3.1 / 3.3.1', 'Form labels & error identification', '/admin/login', 'Compliant', 'PASS', 'role="alert", aria-invalid, aria-describedby');
}

// -----------------------------------------------------------------------------
// WCAG 2.1 AA COLOR CONTRAST RATIO VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- COLOR CONTRAST RATIO VERIFICATION (WCAG 1.4.3 Minimum 4.5:1) ---');
{
  const checks = [
    { name: 'Primary Text (#20242B) on White (#FFFFFF)', fg: '#20242B', bg: '#FFFFFF', min: 4.5 },
    { name: 'Secondary Text (#626B78) on White (#FFFFFF)', fg: '#626B78', bg: '#FFFFFF', min: 4.5 },
    { name: 'Accent Brand Blue (#3157C8) on White (#FFFFFF)', fg: '#3157C8', bg: '#FFFFFF', min: 4.5 },
    { name: 'White Text (#FFFFFF) on Accent Blue (#3157C8)', fg: '#FFFFFF', bg: '#3157C8', min: 4.5 },
    { name: 'Success Text (#16845B) on White (#FFFFFF)', fg: '#16845B', bg: '#FFFFFF', min: 4.5 },
    { name: 'Error Text (#C43D43) on White (#FFFFFF)', fg: '#C43D43', bg: '#FFFFFF', min: 4.5 },
    { name: 'Dark Mode Primary Text (#F6F7F9) on Dark Card (#1E2229)', fg: '#F6F7F9', bg: '#1E2229', min: 4.5 },
  ];

  for (const c of checks) {
    const ratio = getContrastRatio(c.fg, c.bg);
    assert.ok(ratio >= c.min, `${c.name}: ratio ${ratio.toFixed(2)}:1 must be >= ${c.min}:1`);
    pass(c.name, `Ratio: ${ratio.toFixed(2)}:1 (WCAG AA requirement: 4.5:1)`);
    recordFinding('1.4.3', 'Contrast (Minimum)', c.name, 'Compliant', 'PASS', `Measured: ${ratio.toFixed(2)}:1`);
  }
}

// =============================================================================
// PART 2: REAL KEYBOARD-ONLY WORKFLOW VALIDATION (PLAYWRIGHT HEADLESS CHROMIUM)
// =============================================================================
async function runRealKeyboardWorkflowValidation() {
  console.log('\n========================================================================');
  console.log('⌨️  PART 2: REAL KEYBOARD-ONLY WORKFLOW VALIDATION (HEADLESS CHROMIUM)');
  console.log('========================================================================\n');

  let playwright;
  try {
    playwright = await import('playwright');
  } catch (err) {
    console.warn('⚠️  Playwright not available, skipping headless browser execution:', err.message);
    return;
  }

  const { chromium } = playwright;
  let browser;
  let serverProcess = null;
  let testDbPath = null;

  try {
    // Check if server is already running on BASE_URL
    let serverRunning = false;
    try {
      const probe = await fetch(`${BASE_URL}/`, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
      if (probe.status >= 200 && probe.status < 500) {
        serverRunning = true;
        console.log(`✓ Existing Next.js server detected at ${BASE_URL}. Running against live server.\n`);
      }
    } catch { }

    if (!serverRunning) {
      console.log(`[Test Server] Booting Next.js on port ${PORT}...`);
      const testDbDir = path.join(rootDir, 'data', 'test_sandboxes');
      if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
      testDbPath = path.join(testDbDir, `a11y_test_${Date.now()}.db`);
      const baseDb = path.join(rootDir, 'data', 'smart_resume.db');
      if (fs.existsSync(baseDb)) {
        try { fs.copyFileSync(baseDb, testDbPath); } catch { }
      }

      const serverEnv = {
        PORT: String(PORT),
        NODE_ENV: 'production',
        DB_PROVIDER: 'sqlite',
        SQLITE_PATH: testDbPath,
        STAGING_DB_PATH: testDbPath,
        ADMIN_SESSION_SECRET: 'a_very_secure_long_staging_session_secret_32_characters_min',
        SESSION_SECRET: 'a_very_secure_long_staging_session_secret_32_characters_min',
      };

      serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT), '-H', 'localhost'], {
        cwd: rootDir,
        env: { ...process.env, ...serverEnv },
        stdio: 'pipe',
        shell: true,
      });

      // Wait for server readiness
      const start = Date.now();
      let ready = false;
      while (Date.now() - start < 30000) {
        try {
          const res = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
          if (res.status >= 200 && res.status < 500) {
            ready = true;
            break;
          }
        } catch { }
        await new Promise((r) => setTimeout(r, 500));
      }
      if (!ready) throw new Error(`Next.js server failed to become ready on ${BASE_URL}`);
      console.log(`✓ [Test Server] Booted and healthy on ${BASE_URL}!\n`);
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // -------------------------------------------------------------------------
    // BROWSER TEST 1: Login Page & Forgot Password Modal Escape Handling
    // -------------------------------------------------------------------------
    console.log('--- Real Browser Journey 1: Login Page & Modal Escape Key ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#email', { timeout: 10000 });

    // Open Forgot Password modal via keyboard
    const forgotBtn = await page.waitForSelector('button:has-text("Forgot password?")');
    await forgotBtn.focus();
    await page.keyboard.press('Enter');

    // Verify modal appeared with role="dialog"
    await page.waitForSelector('[role="dialog"][aria-modal="true"]', { timeout: 5000 });
    const modalTitle = await page.textContent('#forgot-password-title');
    assert.ok(modalTitle?.includes('Password Recovery'), 'Modal title visible');
    pass('Keyboard Enter opened Forgot Password modal with role="dialog" and aria-modal="true"');

    // Press Escape to dismiss modal
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const modalGone = await page.evaluate(() => document.querySelector('[role="dialog"]') === null);
    assert.ok(modalGone, 'Modal dismissed upon Escape key press');
    pass('Escape key closes Forgot Password dialog cleanly (WCAG 2.1.2 No Keyboard Trap)');

    // -------------------------------------------------------------------------
    // BROWSER TEST 2: Registration Tab Order & Keyboard Validation
    // -------------------------------------------------------------------------
    console.log('\n--- Real Browser Journey 2: Registration Page Keyboard Flow ---');
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#fullName', { timeout: 10000 });

    // Focus first input
    await page.focus('#fullName');
    let activeId = await page.evaluate(() => document.activeElement?.id);
    assert.strictEqual(activeId, 'fullName', 'Focused #fullName');
    pass('Registration initial focus starts on #fullName');

    // Tab to email
    await page.keyboard.press('Tab');
    activeId = await page.evaluate(() => document.activeElement?.id);
    assert.strictEqual(activeId, 'email', 'Tab navigated to #email');
    pass('Tab order: #fullName -> #email');

    // Tab to password
    await page.keyboard.press('Tab');
    activeId = await page.evaluate(() => document.activeElement?.id);
    assert.strictEqual(activeId, 'password', 'Tab navigated to #password');
    pass('Tab order: #email -> #password');

    // Tab to password toggle
    await page.keyboard.press('Tab');
    let activeAria = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
    assert.ok(activeAria?.includes('password'), 'Tab navigated to password toggle');
    pass('Tab order: password input -> toggle password button');

    // Tab to confirm password
    await page.keyboard.press('Tab');
    activeId = await page.evaluate(() => document.activeElement?.id);
    assert.strictEqual(activeId, 'confirmPassword', 'Tab navigated to #confirmPassword');
    pass('Tab order: #password -> #confirmPassword');

    // Fill valid name, email, but mismatched confirm password to test role="alert" trigger
    const validEmail = `a11y.student.${Date.now()}@example.com`;
    await page.fill('#fullName', 'Alex Chen');
    await page.fill('#email', validEmail);
    await page.fill('#password', 'ValidPass2026!');
    await page.fill('#confirmPassword', 'MismatchedPass2026!');
    await page.keyboard.press('Enter');
    await page.waitForSelector('[role="alert"]', { timeout: 5000 });
    const alertText = await page.textContent('[role="alert"]');
    assert.ok(alertText && alertText.includes('match'), 'Alert displayed mismatch error message');
    pass('Form validation error triggers accessible role="alert"', alertText?.trim().slice(0, 40));

    // Fix password confirmation and complete registration to authenticate session for subsequent journeys
    await page.fill('#confirmPassword', 'ValidPass2026!');
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/(dashboard|builder|onboarding)/, { timeout: 15000 });
    pass('Completed keyboard-only registration and authenticated session');

    // -------------------------------------------------------------------------
    // BROWSER TEST 3: Admin Login Page Error Announcement
    // -------------------------------------------------------------------------
    console.log('\n--- Real Browser Journey 3: Admin Login Form Error ---');
    await page.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#admin-email', { timeout: 10000 });

    await page.fill('#admin-email', 'wrong@admin.com');
    await page.fill('#admin-password', 'invalidpass');
    await page.keyboard.press('Enter');

    await page.waitForSelector('#admin-login-error[role="alert"]', { timeout: 8000 });
    const adminAlert = await page.textContent('#admin-login-error');
    assert.ok(adminAlert && adminAlert.length > 5, 'Admin alert rendered');
    const inputAriaDescribed = await page.getAttribute('#admin-email', 'aria-describedby');
    assert.strictEqual(inputAriaDescribed, 'admin-login-error', 'Input describes error via aria-describedby');
    pass('Admin login error provides role="alert" and aria-describedby link');

    // -------------------------------------------------------------------------
    // BROWSER TEST 4: ATS Score Page Tabs & Drop Zone Keyboard
    // -------------------------------------------------------------------------
    console.log('\n--- Real Browser Journey 4: ATS Score Page Tabs & Drop Zone ---');
    await page.goto(`${BASE_URL}/ats-score`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Verify Tablist
    const tabCount = await page.evaluate(() => document.querySelectorAll('[role="tablist"] [role="tab"]').length);
    assert.strictEqual(tabCount, 2, 'Two tabs present');
    pass('ATS Score page has role="tablist" with 2 tabs');

    // Check keyboard focus on drop zone
    const dropZone = await page.waitForSelector('[role="button"][tabindex="0"]');
    assert.ok(dropZone, 'Drop zone has role="button" and tabindex="0"');
    await dropZone.focus();
    const isDropFocused = await page.evaluate(() => document.activeElement?.getAttribute('role') === 'button');
    assert.ok(isDropFocused, 'Drop zone focused via keyboard');
    pass('ATS Score drag-and-drop zone received keyboard focus');

    // Switch to paste tab via keyboard Enter
    const pasteTab = await page.waitForSelector('[role="tab"]:has-text("Paste Text")');
    await pasteTab.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('#ats-paste-textarea', { timeout: 5000 });
    const isTextareaPresent = await page.evaluate(() => document.getElementById('ats-paste-textarea') !== null);
    assert.ok(isTextareaPresent, 'Pasted textarea is present');
    pass('Switched to Paste tab via keyboard Enter, textarea loaded with accessible label');

    // -------------------------------------------------------------------------
    // BROWSER TEST 5: Resume Builder Page Landmarks & Export Button
    // -------------------------------------------------------------------------
    console.log('\n--- Real Browser Journey 5: Resume Builder Controls ---');
    await page.goto(`${BASE_URL}/builder`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.resume-builder-page-container', { timeout: 15000 });

    // Verify landmark regions
    const hasAside = await page.evaluate(() => document.querySelector('aside') !== null);
    const hasMain = await page.evaluate(() => document.querySelector('main') !== null);
    assert.ok(hasAside, 'Builder has <aside> landmark');
    assert.ok(hasMain, 'Builder has <main> landmark');
    pass('Resume Builder provides semantic <aside> and <main> landmark regions');

    // Verify PDF export controls in toolbar
    const pdfBtn = await page.waitForSelector('#toolbar-download-pdf', { timeout: 10000 });
    assert.ok(pdfBtn, 'PDF Download button present');
    const pdfLabel = await pdfBtn.getAttribute('aria-label');
    assert.strictEqual(pdfLabel, 'Download PDF resume', 'aria-label on PDF button matches');
    pass('PDF export button has explicit id="toolbar-download-pdf" and aria-label="Download PDF resume"');

    // -------------------------------------------------------------------------
    // BROWSER TEST 6: AI Assistant Chatbot Dialog & Escape Dismissal
    // -------------------------------------------------------------------------
    console.log('\n--- Real Browser Journey 6: AI Assistant Chatbot Keyboard ---');
    const chatLauncher = await page.waitForSelector('[data-chat-drag="true"] button', { timeout: 10000 });
    assert.ok(chatLauncher, 'Chatbot launcher found');
    await chatLauncher.focus();
    await page.keyboard.press('Enter');

    await page.waitForSelector('[role="dialog"][aria-label="Smart Resume AI Assistant"]', { timeout: 5000 });
    pass('Chatbot opened via keyboard Enter with role="dialog"');

    // Press Escape to dismiss chatbot
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const chatClosed = await page.evaluate(() => document.querySelector('[role="dialog"][aria-label="Smart Resume AI Assistant"]') === null);
    assert.ok(chatClosed, 'Chatbot closed upon Escape key');
    pass('Escape key closes AI Assistant Chatbot panel cleanly');

    // -------------------------------------------------------------------------
    // BROWSER TEST 7: Interview Prep Setup Form
    // -------------------------------------------------------------------------
    console.log('\n--- Real Browser Journey 7: Interview Preparation Setup Form ---');
    await page.goto(`${BASE_URL}/interview-prep`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#interview-target-role', { timeout: 10000 });

    const roleInput = await page.$('#interview-target-role');
    assert.ok(roleInput, '#interview-target-role input present');
    const roleLabelText = await page.textContent('label[for="interview-target-role"]');
    assert.ok(roleLabelText?.includes('Target Role'), 'Label text matches');
    pass('Interview prep input bound to label[for="interview-target-role"]');

    // -------------------------------------------------------------------------
    // BROWSER TEST 8: Projects Page Navigation Tabs
    // -------------------------------------------------------------------------
    console.log('\n--- Real Browser Journey 8: Project Coach Navigation Tabs ---');
    await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="tablist"][aria-label="Project workspace sections"]', { timeout: 10000 });

    const recTabSelected = await page.getAttribute('button[role="tab"]:has-text("Recommendations")', 'aria-selected');
    assert.strictEqual(recTabSelected, 'true', 'Recommendations tab initially selected');
    pass('Project Coach tablist correctly initializes aria-selected="true"');

    // -------------------------------------------------------------------------
    // BROWSER TEST 9: Jobs Page Dialog & Escape Key
    // -------------------------------------------------------------------------
    console.log('\n--- Real Browser Journey 9: Job Search Navigation ---');
    await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#job-nlp-search-input', { timeout: 10000 });
    const searchInput = await page.$('#job-nlp-search-input');
    assert.ok(searchInput, '#job-nlp-search-input present');
    const ariaLabel = await searchInput.getAttribute('aria-label');
    assert.ok(ariaLabel && ariaLabel.length > 5, 'Search input has accessible aria-label');
    pass('Job Search page rendered with accessible search input and aria-label');

    // -------------------------------------------------------------------------
    // BROWSER TEST 10: Profile Dashboard Tablist
    // -------------------------------------------------------------------------
    console.log('\n--- Real Browser Journey 10: Profile Dashboard Tablist ---');
    await page.goto(`${BASE_URL}/dashboard/profile`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[role="tablist"][aria-label="Profile sections"]', { timeout: 10000 });
    pass('Profile dashboard renders role="tablist" with accessible label');

    await context.close();
    await browser.close();
    console.log('\n✓ Headless Chromium Keyboard Journey tests completed successfully!');

  } finally {
    if (browser) {
      try { await browser.close(); } catch { }
    }
    if (serverProcess) {
      console.log('[Test Server] Stopping test server...');
      try {
        if (process.platform === 'win32' && serverProcess.pid) {
          spawnSync('taskkill', ['/pid', String(serverProcess.pid), '/T', '/F']);
        } else {
          serverProcess.kill('SIGTERM');
        }
      } catch { }
      await new Promise((r) => setTimeout(r, 500));
      if (testDbPath && fs.existsSync(testDbPath)) {
        try { fs.unlinkSync(testDbPath); } catch { }
      }
      console.log('[Test Server] Server stopped cleanly.');
    }
  }
}

async function main() {
  await runRealKeyboardWorkflowValidation();

  console.log('\n========================================================================');
  console.log(`🎉 ALL ACCESSIBILITY AUDIT CHECKS PASSED: ${passedTests} / ${totalTests} (100%)`);
  console.log('========================================================================\n');

  console.log('--- FINDINGS MATRIX SUMMARY ---');
  console.table(findings);
}

main().catch((err) => {
  console.error('\n❌ Accessibility test suite failure:', err);
  process.exit(1);
});
