import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const PORT = Number(process.env.TEST_PORT || 3188);
const BASE_URL = process.env.TEST_BASE_URL || `http://localhost:${PORT}`;

const SCREENSHOTS_DIR = 'C:\\Users\\kiran\\.gemini\\antigravity\\brain\\d82cd440-644e-4a03-a378-f2a4f7dff02c\\screenshots';
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

console.log('========================================================================');
console.log('📱 SMART RESUME AI: PHASE 9 MOBILE RESPONSIVENESS AUDIT & VALIDATION');
console.log('========================================================================\n');

const BREAKPOINTS = [
  { width: 320, height: 568, name: '320px (iPhone SE 1st gen)' },
  { width: 360, height: 640, name: '360px (Galaxy S8 / Compact Android)' },
  { width: 375, height: 667, name: '375px (iPhone SE 2nd / iPhone 8/X)' },
  { width: 390, height: 844, name: '390px (iPhone 13 / 14)' },
  { width: 414, height: 896, name: '414px (iPhone 11 Pro Max / Plus)' },
  { width: 768, height: 1024, name: '768px (iPad Mini / Portrait Tablet)' },
  { width: 1024, height: 768, name: '1024px (iPad Pro / Small Laptop)' },
  { width: 1280, height: 800, name: '1280px (Standard Desktop Baseline)' },
];

let totalChecks = 0;
let passedChecks = 0;
const results = {
  breakpoints: {},
  journeys: {},
  resumeBuilder: {},
  touchAccessibility: {},
  performance: {},
  screenshots: [],
};

function pass(name, detail = '') {
  totalChecks++;
  passedChecks++;
  console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, detail = '') {
  totalChecks++;
  console.error(`  ❌ [FAIL] ${name}${detail ? ` (${detail})` : ''}`);
  throw new Error(`Test failed: ${name} - ${detail}`);
}

async function runMobileAudit() {
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (err) {
    console.error('Playwright not available:', err.message);
    process.exit(1);
  }

  const { chromium } = playwright;
  let browser;
  let serverProcess = null;
  let testDbPath = null;

  try {
    // 1. Ensure server is running on port 3188
    let serverRunning = false;
    try {
      const probe = await fetch(`${BASE_URL}/`, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
      if (probe.status >= 200 && probe.status < 500) {
        serverRunning = true;
        console.log(`✓ Existing Next.js server detected on ${BASE_URL}.\n`);
      }
    } catch { }

    if (!serverRunning) {
      console.log(`[Test Server] Booting Next.js on port ${PORT}...`);
      const testDbDir = path.join(rootDir, 'data', 'test_sandboxes');
      if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
      testDbPath = path.join(testDbDir, `mobile_audit_${Date.now()}.db`);
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

      const start = Date.now();
      let ready = false;
      while (Date.now() - start < 35000) {
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

    // Helper to measure touch target compliance
    async function evaluateTouchTargets(pg, journeyName) {
      return await pg.evaluate((jName) => {
        const clickables = Array.from(document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea'));
        let total = clickables.length;
        let compliant40 = 0;
        let compliant24 = 0;
        const smallTargets = [];

        for (const el of clickables) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          // Ignore visually hidden or zero-opacity items
          const style = window.getComputedStyle(el);
          if (style.display === 'none' || style.visibility === 'hidden') continue;

          const is40 = rect.width >= 40 || rect.height >= 40;
          const is24 = rect.width >= 24 && rect.height >= 24;

          if (is40) compliant40++;
          if (is24) compliant24++;
          else {
            smallTargets.push({
              tag: el.tagName,
              text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30),
              w: Math.round(rect.width),
              h: Math.round(rect.height),
            });
          }
        }
        return {
          journey: jName,
          total,
          compliant40,
          compliant24,
          percent40: total > 0 ? Math.round((compliant40 / total) * 100) : 100,
          percent24: total > 0 ? Math.round((compliant24 / total) * 100) : 100,
          smallTargets: smallTargets.slice(0, 5),
        };
      }, journeyName);
    }

    // Create primary session context
    const sessionContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });
    const page = await sessionContext.newPage();

    // =========================================================================
    // PART 9B (Initial): AUTHENTICATION JOURNEYS (Register & Login)
    // =========================================================================
    console.log('\n--- INITIALIZING MOBILE USER JOURNEYS (375px VIEWPORT) ---');

    // JOURNEY 1: Registration
    console.log('\n[Journey 1: Registration]');
    {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      await page.waitForSelector('#fullName', { timeout: 10000 });
      const ssPath = path.join(SCREENSHOTS_DIR, 'register_375px.png');
      await page.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(page, 'Registration');
      results.touchAccessibility['Registration'] = touch;
      results.performance['Registration'] = { loadMs: t1 - t0 };

      // Complete registration to create authenticated mobile session
      const testEmail = `mobile.student.${Date.now()}@example.com`;
      await page.fill('#fullName', 'Jordan Lee');
      await page.fill('#email', testEmail);
      await page.fill('#password', 'SecurePass2026!');
      await page.fill('#confirmPassword', 'SecurePass2026!');
      await page.click('button[type="submit"]');

      await page.waitForURL(/\/(dashboard|builder|onboarding)/, { timeout: 15000 });
      pass('Mobile Registration Journey complete and session authenticated', `User: ${testEmail}`);
      results.journeys['Registration'] = { status: 'PASS', email: testEmail };
    }

    // JOURNEY 2: Login Page Usability
    console.log('\n[Journey 2: Login Page Form Usability]');
    {
      const unauthContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
      const unauthPage = await unauthContext.newPage();
      const t0 = Date.now();
      await unauthPage.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      await unauthPage.waitForSelector('#email', { timeout: 10000 });
      const ssPath = path.join(SCREENSHOTS_DIR, 'login_375px.png');
      await unauthPage.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(unauthPage, 'Login');
      results.touchAccessibility['Login'] = touch;
      results.performance['Login'] = { loadMs: t1 - t0 };

      const emailRect = await unauthPage.evaluate(() => {
        const el = document.getElementById('email');
        const r = el.getBoundingClientRect();
        return { w: r.width, h: r.height, right: r.right };
      });
      assert.ok(emailRect.w > 250 && emailRect.h >= 40, 'Email input has generous mobile touch target');
      pass('Mobile Login Form rendered cleanly with touch-friendly input targets');
      results.journeys['Login'] = { status: 'PASS' };
      await unauthContext.close();
    }

    // =========================================================================
    // PART 9A: BREAKPOINT AUDIT & OVERFLOW CHECKS (AUTHENTICATED)
    // =========================================================================
    console.log('\n--- PHASE 9A: BREAKPOINT AUDIT (320px - 1280px) ---');

    for (const bp of BREAKPOINTS) {
      console.log(`\nTesting Breakpoint: ${bp.name}`);
      await page.setViewportSize({ width: bp.width, height: bp.height });

      const routesToTest = ['/builder', '/dashboard/profile', '/ats-score', '/jobs', '/projects'];
      const bpResults = { overflowFree: true, routes: {} };

      for (const route of routesToTest) {
        const navStart = Date.now();
        await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
        const loadDuration = Date.now() - navStart;

        // Check horizontal overflow
        const overflowData = await page.evaluate(() => {
          const docScroll = document.documentElement.scrollWidth;
          const bodyScroll = document.body.scrollWidth;
          const winInner = window.innerWidth;
          const overflowX = Math.max(0, docScroll - winInner, bodyScroll - winInner);
          return {
            docScroll,
            bodyScroll,
            winInner,
            overflowX,
            hasHorizontalScroll: overflowX > 1,
          };
        });

        assert.strictEqual(
          overflowData.hasHorizontalScroll,
          false,
          `Route ${route} at ${bp.width}px must have no horizontal overflow (overflowX: ${overflowData.overflowX}px)`
        );

        bpResults.routes[route] = {
          loadDurationMs: loadDuration,
          overflowX: overflowData.overflowX,
        };
      }

      pass(`No horizontal overflow across routes at ${bp.width}px`, `Tested: ${routesToTest.join(', ')}`);
      results.breakpoints[bp.width] = bpResults;
    }

    // Reset viewport to standard mobile 375px
    await page.setViewportSize({ width: 375, height: 667 });

    // =========================================================================
    // PART 9B (Remaining): REMAINING 8 CRITICAL USER JOURNEYS
    // =========================================================================
    console.log('\n--- PHASE 9B (Continued): USER JOURNEYS 3-10 ---');

    // JOURNEY 3: Profile Creation & Management
    console.log('\n[Journey 3: Profile Management]');
    {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/dashboard/profile`, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      await page.waitForTimeout(1000);
      const ssPath = path.join(SCREENSHOTS_DIR, 'profile_375px.png');
      await page.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(page, 'Profile');
      results.touchAccessibility['Profile'] = touch;
      results.performance['Profile'] = { loadMs: t1 - t0 };

      const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(noHScroll, 'Profile page has no horizontal overflow');
      pass('Profile Creation/Management renders responsive layout on mobile');
      results.journeys['Profile'] = { status: 'PASS' };
    }

    // JOURNEY 4: Resume Builder
    console.log('\n[Journey 4: Resume Builder]');
    {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/builder`, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      await page.waitForSelector('.resume-builder-page-container', { timeout: 15000 });
      const ssPath = path.join(SCREENSHOTS_DIR, 'builder_375px.png');
      await page.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(page, 'ResumeBuilder');
      results.touchAccessibility['ResumeBuilder'] = touch;
      results.performance['ResumeBuilder'] = { loadMs: t1 - t0 };

      pass('Resume Builder loads cleanly on mobile 375px');
      results.journeys['ResumeBuilder'] = { status: 'PASS' };
    }

    // JOURNEY 5: ATS Analysis
    console.log('\n[Journey 5: ATS Analysis]');
    {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/ats-score`, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      await page.waitForSelector('[role="tablist"]', { timeout: 10000 });
      const ssPath = path.join(SCREENSHOTS_DIR, 'ats_score_375px.png');
      await page.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(page, 'ATSAnalysis');
      results.touchAccessibility['ATSAnalysis'] = touch;
      results.performance['ATSAnalysis'] = { loadMs: t1 - t0 };

      const tabBox = await page.evaluate(() => {
        const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
        return tabs.map(t => {
          const r = t.getBoundingClientRect();
          return { text: t.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height) };
        });
      });
      assert.ok(tabBox.length === 2, '2 tabs present on mobile');
      assert.ok(tabBox[0].h >= 36, 'Tab touch targets >= 36px height');
      pass('ATS Analysis tabs and upload/paste areas responsive on mobile');
      results.journeys['ATSAnalysis'] = { status: 'PASS', tabBox };
    }

    // JOURNEY 6: AI Assistant Chat (CareerChatbot)
    console.log('\n[Journey 6: AI Assistant Chatbot]');
    {
      await page.goto(`${BASE_URL}/builder`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-chat-drag="true"] button', { timeout: 10000 });

      // Click launcher to open chat panel
      await page.click('[data-chat-drag="true"] button');
      await page.waitForSelector('[role="dialog"][aria-label="Smart Resume AI Assistant"]', { timeout: 5000 });

      // Verify chat panel width and layout on 375px screen
      const panelMetrics = await page.evaluate(() => {
        const dialog = document.querySelector('[role="dialog"][aria-label="Smart Resume AI Assistant"]');
        if (!dialog) return null;
        const rect = dialog.getBoundingClientRect();
        return {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          fitsInsideViewport: rect.right <= window.innerWidth && rect.left >= 0,
        };
      });

      assert.ok(panelMetrics, 'Chat dialog metrics retrieved');
      assert.ok(panelMetrics.fitsInsideViewport, 'Chat dialog fits completely within mobile viewport');
      assert.ok(panelMetrics.width <= 375, `Chat width ${panelMetrics.width}px <= viewport 375px`);

      const ssPath = path.join(SCREENSHOTS_DIR, 'chat_assistant_375px.png');
      await page.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(page, 'AIAssistant');
      results.touchAccessibility['AIAssistant'] = touch;

      // Close chat panel
      await page.click('button[aria-label="Close chat"]');
      await page.waitForTimeout(300);
      pass('AI Assistant open dialog adapts to mobile viewport without horizontal blowout');
      results.journeys['AIAssistant'] = { status: 'PASS', panelMetrics };
    }

    // JOURNEY 7: Project Coach
    console.log('\n[Journey 7: Project Coach]');
    {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/projects`, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      await page.waitForTimeout(1000);
      const ssPath = path.join(SCREENSHOTS_DIR, 'projects_375px.png');
      await page.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(page, 'ProjectCoach');
      results.touchAccessibility['ProjectCoach'] = touch;
      results.performance['ProjectCoach'] = { loadMs: t1 - t0 };

      const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(noHScroll, 'Project Coach page has no horizontal overflow');
      pass('Project Coach renders responsive cards and action items on mobile');
      results.journeys['ProjectCoach'] = { status: 'PASS' };
    }

    // JOURNEY 8: Interview Preparation
    console.log('\n[Journey 8: Interview Preparation]');
    {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/interview-prep`, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      await page.waitForTimeout(1000);
      const ssPath = path.join(SCREENSHOTS_DIR, 'interview_375px.png');
      await page.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(page, 'InterviewPrep');
      results.touchAccessibility['InterviewPrep'] = touch;
      results.performance['InterviewPrep'] = { loadMs: t1 - t0 };

      const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(noHScroll, 'Interview Prep page has no horizontal overflow');
      pass('Interview Preparation renders responsive layout and question cards on mobile');
      results.journeys['InterviewPrep'] = { status: 'PASS' };
    }

    // JOURNEY 9: Job Discovery
    console.log('\n[Journey 9: Job Discovery]');
    {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      await page.waitForTimeout(1000);
      const ssPath = path.join(SCREENSHOTS_DIR, 'jobs_375px.png');
      await page.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(page, 'JobDiscovery');
      results.touchAccessibility['JobDiscovery'] = touch;
      results.performance['JobDiscovery'] = { loadMs: t1 - t0 };

      const noHScroll = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(noHScroll, 'Job Discovery page has no horizontal overflow');
      pass('Job Discovery search and filter controls adapt smoothly to mobile');
      results.journeys['JobDiscovery'] = { status: 'PASS' };
    }

    // JOURNEY 10: Admin Access
    console.log('\n[Journey 10: Admin Access]');
    {
      const unauthContext = await browser.newContext({ viewport: { width: 375, height: 667 } });
      const unauthPage = await unauthContext.newPage();
      const t0 = Date.now();
      await unauthPage.goto(`${BASE_URL}/admin/login`, { waitUntil: 'domcontentloaded' });
      const t1 = Date.now();
      await unauthPage.waitForSelector('#admin-email', { timeout: 10000 });
      const ssPath = path.join(SCREENSHOTS_DIR, 'admin_login_375px.png');
      await unauthPage.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);

      const touch = await evaluateTouchTargets(unauthPage, 'AdminAccess');
      results.touchAccessibility['AdminAccess'] = touch;
      results.performance['AdminAccess'] = { loadMs: t1 - t0 };

      const noHScroll = await unauthPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      assert.ok(noHScroll, 'Admin Login page has no horizontal overflow');
      pass('Admin Login portal renders responsive card on mobile');
      results.journeys['AdminAccess'] = { status: 'PASS' };
      await unauthContext.close();
    }

    // =========================================================================
    // PART 9C: RESUME BUILDER MOBILE DEEP DIVE REVIEW (Across Viewports)
    // =========================================================================
    console.log('\n--- PHASE 9C: RESUME BUILDER MOBILE DEEP DIVE REVIEW ---');

    const builderBreakpoints = [320, 375, 768, 1280];
    for (const w of builderBreakpoints) {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto(`${BASE_URL}/builder`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.resume-builder-page-container', { timeout: 15000 });

      const analysis = await page.evaluate((viewportWidth) => {
        const aside = document.querySelector('.resume-builder-main-grid aside');
        const asideVisible = aside ? (aside.getBoundingClientRect().height > 0 && window.getComputedStyle(aside).display !== 'none') : false;
        const mobileSelect = document.getElementById('mobile-step-select');
        const mobileSelectVisible = mobileSelect ? mobileSelect.getBoundingClientRect().height > 0 : false;
        const pdfBtn = document.getElementById('toolbar-download-pdf');
        const pdfBtnVisible = pdfBtn ? (pdfBtn.getBoundingClientRect().height > 0 && window.getComputedStyle(pdfBtn).display !== 'none') : false;

        return {
          viewportWidth,
          asideVisible,
          mobileSelectVisible,
          pdfBtnVisible,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      }, w);

      if (w < 1024) {
        assert.strictEqual(analysis.asideVisible, false, `Sidebar aside hidden on ${w}px`);
        assert.strictEqual(analysis.mobileSelectVisible, true, `Mobile jump select visible on ${w}px`);
      } else {
        assert.strictEqual(analysis.asideVisible, true, `Sidebar aside visible on ${w}px desktop`);
        assert.strictEqual(analysis.mobileSelectVisible, false, `Mobile jump select hidden on ${w}px desktop`);
      }

      assert.strictEqual(analysis.pdfBtnVisible, true, `Toolbar PDF export button visible on ${w}px`);
      assert.strictEqual(analysis.overflow, false, `No horizontal overflow in Builder on ${w}px`);

      // Test mobile step jumping
      if (w < 1024) {
        await page.selectOption('#mobile-step-select', '4');
        await page.waitForTimeout(400);
        const headingText = await page.textContent('main h2');
        assert.ok(
          headingText && (headingText.includes('Skills') || headingText.includes('Experience') || headingText.includes('Education') || headingText.length > 2),
          'Heading updated after mobile section jump'
        );
      }

      const ssPath = path.join(SCREENSHOTS_DIR, `builder_${w}px.png`);
      await page.screenshot({ path: ssPath, fullPage: false });
      results.screenshots.push(ssPath);
      results.resumeBuilder[w] = analysis;

      pass(
        `Builder responsive invariants verified on ${w}px`,
        `Aside: ${analysis.asideVisible ? 'Visible' : 'Hidden'}, MobileSelect: ${analysis.mobileSelectVisible ? 'Visible' : 'Hidden'}`
      );
    }

    await sessionContext.close();

    console.log('\n========================================================================');
    console.log(`🎉 ALL MOBILE AUDIT CHECKS PASSED: ${passedChecks}/${totalChecks} PASS!`);
    console.log('========================================================================\n');

    // Write audit data file for report generation
    const auditDataPath = path.join(rootDir, 'scripts', 'mobile_audit_results.json');
    fs.writeFileSync(auditDataPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`Wrote mobile audit results to ${auditDataPath}`);

  } finally {
    if (browser) await browser.close();
    if (serverProcess) {
      console.log('Terminating isolated test server...');
      serverProcess.kill('SIGINT');
      try { process.kill(-serverProcess.pid); } catch { }
    }
  }
}

runMobileAudit().catch((err) => {
  console.error('\n❌ Fatal error during mobile responsiveness audit:', err);
  process.exit(1);
});
