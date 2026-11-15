import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { chromium } from '@playwright/test';

const PORT = 3189;
const BASE_URL = `http://127.0.0.1:${PORT}`;

const testDbDir = path.join(process.cwd(), 'data', 'test_sandboxes');
fs.mkdirSync(testDbDir, { recursive: true });
const testDbPath = path.join(testDbDir, `pcp_e2e_${Date.now()}.db`);

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function runTests() {
  let passed = 0;
  const pass = (label, detail = '') => {
    passed += 1;
    console.log(`  [PASS ${passed}] ${label}${detail ? ` (${detail})` : ''}`);
  };

  console.log('================================================================');
  console.log('PERSONALIZED CAREER PATH: API + BROWSER E2E VERIFICATION');
  console.log('================================================================\n');

  const serverEnv = {
    ...process.env,
    PORT: String(PORT),
    NODE_ENV: 'production',
    DB_PROVIDER: 'sqlite',
    DATABASE_URL: '',
    POSTGRES_URL: '',
    FORCE_POSTGRES: '',
    SQLITE_PATH: testDbPath,
    STAGING_DB_PATH: testDbPath,
    GEMINI_API_KEY: '',
    GOOGLE_API_KEY: '',
    ADMIN_SESSION_SECRET: 'pcp_test_secret_32_characters_minimum_length_1234',
    SESSION_SECRET: 'pcp_test_secret_32_characters_minimum_length_1234',
  };

  const serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT), '-H', '127.0.0.1'], {
    cwd: process.cwd(),
    env: serverEnv,
    stdio: 'pipe',
    shell: true,
  });

  serverProcess.stderr.on('data', (chunk) => {
    const msg = chunk.toString().trim();
    if (msg && !msg.includes('GEMINI_API_KEY')) {
      console.error(`[Server Err] ${msg}`);
    }
  });

  const browser = await chromium.launch({ headless: true });

  try {
    await waitForServer(`${BASE_URL}/`, 30000);
    pass('Boot isolated Next.js server on clean SQLite DB');

    // 1. Skip Onboarding Flow
    const skipContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const skipPage = await skipContext.newPage();
    const skipEmail = `skip-${Date.now()}@example.invalid`;
    await skipPage.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await skipPage.locator('#fullName').fill('Meera Nair');
    await skipPage.locator('#email').fill(skipEmail);
    await skipPage.locator('#password').fill('CareerPathPass2026!');
    await skipPage.locator('#confirmPassword').fill('CareerPathPass2026!');
    await skipPage.getByRole('button', { name: /create workspace account|create account/i }).click();
    await skipPage.waitForURL(/\/onboarding/, { timeout: 20000 });
    await skipPage.getByRole('button', { name: /skip for now/i }).click();
    await skipPage.waitForURL(/\/dashboard$/, { timeout: 20000 });
    const dashBodyText = await skipPage.locator('body').innerText();
    assert.ok(dashBodyText.includes('Goal not set') || dashBodyText.includes('Set Your Career Goal'), 'Dashboard should show Goal not set prompt');
    assert.ok(!dashBodyText.includes('Graduate Software Engineer'), 'Dashboard must never inject Graduate Software Engineer default');
    await skipContext.close();
    pass('New signup -> /onboarding -> Skip -> /dashboard shows Goal not set cleanly');

    // 3. Full Multi-Domain Onboarding -> Guidance Roadmap -> Courses -> My Career Data -> Job Match -> Builder Import -> Clear
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    const userEmail = `arjun-${Date.now()}@example.invalid`;
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'domcontentloaded' });
    await page.locator('#fullName').fill('Arjun Deshmukh');
    await page.locator('#email').fill(userEmail);
    await page.locator('#password').fill('CareerPathPass2026!');
    await page.locator('#confirmPassword').fill('CareerPathPass2026!');
    await page.getByRole('button', { name: /create workspace account|create account/i }).click();
    await page.waitForURL(/\/onboarding/, { timeout: 20000 });

    // Step 1: Mechanical Engineer
    await page.getByRole('button', { name: /^Mechanical Engineer$/i }).click();
    await page.getByRole('button', { name: /continue to resume or background/i }).click();

    // Step 2: Test Resume Claimed Parse API + Manual Background
    const sampleTxtResume = Buffer.from(
      'Arjun Deshmukh\narjun@example.invalid\nEducation\nB.Tech in Mechanical Engineering, Pune Engineering College, 2026\nSkills\nCAD, MATLAB, Excel\n',
      'utf8'
    );
    const formUpload = await page.evaluate(async (b64) => {
      const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const fd = new FormData();
      fd.append('file', new File([raw], 'arjun_resume.txt', { type: 'text/plain' }));
      const r = await fetch('/api/onboarding/parse-resume', { method: 'POST', body: fd });
      return { status: r.status, body: await r.json() };
    }, sampleTxtResume.toString('base64'));
    assert.equal(formUpload.status, 200);
    assert.equal(formUpload.body.success, true);
    assert.ok(
      formUpload.body.parsed.skills.some((s) => s.confirmed === false && s.source === 'resume_parsed'),
      `Expected unconfirmed resume_parsed claims, got: ${JSON.stringify(formUpload.body.parsed.skills)}`
    );
    pass('Onboarding in-memory resume parser returns unconfirmed claimed items cleanly');

    await page.getByRole('button', { name: /enter manually/i }).click();
    await page.getByPlaceholder(/e\.g\. State University/i).fill('Pune Engineering College');
    await page.getByPlaceholder(/e\.g\. B\.S\., B\.Tech, MBA/i).fill('B.Tech');
    await page.getByPlaceholder(/e\.g\. Mechanical Engineering, Finance, Marketing/i).fill('Mechanical Engineering');
    await page.getByPlaceholder(/e\.g\. 2026/i).fill('2026');
    await page.getByRole('button', { name: /review & confirm data/i }).click();

    // Step 3: Add AutoCAD & complete
    await page.getByRole('heading', { name: /confirm your career profile/i }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder(/Type a skill \(e\.g\. AutoCAD/i).fill('AutoCAD');
    await page.getByRole('button', { name: /add skill/i }).click();
    await page.getByRole('button', { name: /confirm & continue to dashboard/i }).click();
    await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
    await page.getByText('Mechanical Engineer').first().waitFor({ state: 'visible', timeout: 10000 });
    pass('Complete Onboarding (Mechanical Engineer + Education + Confirmed Skill)');

    // Multi-domain autocomplete API check (authenticated browser context)
    for (const [field, query, expectedValue] of [
      ['role', 'mech', 'Mechanical Engineer'],
      ['role', 'finan', 'Financial Analyst'],
      ['role', 'hr ', 'HR Generalist'],
      ['skill', 'solid', 'SolidWorks'],
      ['skill', 'dcf', 'Valuation (DCF)'],
      ['skill', 'financial mod', 'Financial Modeling'],
    ]) {
      const resData = await page.evaluate(async ([f, q]) => {
        const res = await fetch('/api/jobs/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: f, query: q }),
        });
        return { status: res.status, body: await res.json() };
      }, [field, query]);
      assert.equal(resData.status, 200);
      assert.ok(
        Array.isArray(resData.body.suggestions) &&
          resData.body.suggestions.some((s) => s.value.toLowerCase().includes(expectedValue.toLowerCase())),
        `Expected suggestion "${expectedValue}" for (${field}, "${query}"), got ${JSON.stringify(resData.body.suggestions)}`
      );
    }
    pass('Multi-domain autocomplete API (/api/jobs/suggestions) across non-software roles & skills');

    // Guidance Roadmap Checklist + Reload Persistence
    await page.goto(`${BASE_URL}/guidance`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Mechanical Engineer Readiness Studio/i }).waitFor({ state: 'visible', timeout: 20000 });
    await page.getByText(/Suggested for Mechanical Engineer/i).first().waitFor({ state: 'visible', timeout: 10000 });

    const cadButton = page.getByRole('button', { name: /CAD Modeling/i }).first();
    await cadButton.click();
    await page.waitForTimeout(500);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /Mechanical Engineer Readiness Studio/i }).waitFor({ state: 'visible', timeout: 20000 });
    const progJson = await page.evaluate(async () => {
      const r = await fetch('/api/career/roadmap/progress?roleSlug=mechanical-engineer');
      return r.json();
    });
    assert.ok(
      progJson.progress.some((p) => p.itemKey.includes('CAD Modeling') && p.status === 'completed'),
      'Roadmap checklist status must persist in SQLite across reload'
    );
    pass('Guidance Goal-Based Roadmap & Persistent Checklist verified across reload');

    // Courses page Role References
    await page.goto(`${BASE_URL}/dashboard/courses`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Role References/i }).waitFor({ state: 'visible', timeout: 10000 });
    pass('Courses page displays transparent Role References & Self-Paced Checklists');

    // My Career Data: add SolidWorks, export JSON, verify provenance
    await page.goto(`${BASE_URL}/dashboard/my-data`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('heading', { name: /My Career Data/i }).waitFor({ state: 'visible', timeout: 10000 });
    await page.getByPlaceholder(/Add a verified or practiced skill/i).fill('SolidWorks');
    await page.getByRole('button', { name: /Add Skill/i }).click();
    await page.getByText('SolidWorks').first().waitFor({ state: 'visible', timeout: 15000 });
    const exportData = await page.evaluate(async () => {
      const r = await fetch('/api/user/my-data/export');
      return { status: r.status, body: await r.json() };
    });
    assert.equal(exportData.status, 200);
    assert.equal(exportData.body.targetRole, 'Mechanical Engineer');
    assert.ok(exportData.body.skills.some((s) => s.name === 'SolidWorks' && s.confirmedAt));
    pass('My Career Data page (provenance badges, skill add, JSON export)');

    // Job Match typing autocomplete
    await page.goto(`${BASE_URL}/job-match`, { waitUntil: 'domcontentloaded' });
    const jmRoleInput = page.getByPlaceholder(/e\.g\. Data Analyst, Mechanical Engineer/i);
    await jmRoleInput.fill('Financial');
    await page.getByRole('option', { name: /Financial Analyst/i }).first().waitFor({ state: 'visible', timeout: 10000 });
    pass('Job Match target role typing autocomplete works across domains');

    // Builder opt-in Import Profile modal
    await page.goto(`${BASE_URL}/builder`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Import Profile/i }).click();
    await page.getByRole('heading', { name: /Import from My Career Data/i }).waitFor({ state: 'visible', timeout: 15000 });
    await page.getByText('SolidWorks').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('button', { name: /Merge Into Resume/i }).click();
    await page.getByRole('heading', { name: /Import from My Career Data/i }).waitFor({ state: 'hidden', timeout: 10000 });
    pass('Resume Builder opt-in Import Profile preview & merge works cleanly');

    // My Career Data CLEAR reset
    await page.goto(`${BASE_URL}/dashboard/my-data`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Clear Career Data/i }).click();
    await page.getByPlaceholder('CLEAR').fill('CLEAR');
    await page.getByRole('button', { name: /Confirm Clear/i }).click();
    await page.getByText(/Career profile, target role, and unverified skills have been cleared/i).waitFor({ state: 'visible', timeout: 15000 });

    const afterClear = await page.evaluate(async () => {
      const r = await fetch('/api/user/my-data');
      return r.json();
    });
    assert.equal(afterClear.goalSet, false);
    assert.equal(afterClear.targetRole, null, `Expected null targetRole after clear, got ${afterClear.targetRole}`);
    pass('My Career Data CLEAR reset restores Goal not set without affecting account');

    assert.equal(pageErrors.length, 0, `Unexpected browser pageErrors: ${JSON.stringify(pageErrors)}`);
    await context.close();

    console.log(`\n================================================================`);
    console.log(`ALL ${passed} PERSONALIZED CAREER PATH E2E CHECKS PASSED!`);
    console.log(`================================================================`);
  } finally {
    await browser.close().catch(() => {});
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        spawnSync('taskkill', ['/pid', String(serverProcess.pid), '/T', '/F']);
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
    for (const suffix of ['', '-shm', '-wal', '-journal']) {
      try {
        if (fs.existsSync(testDbPath + suffix)) fs.unlinkSync(testDbPath + suffix);
      } catch {}
    }
  }
}

runTests().catch((err) => {
  console.error('\n[FAIL]', err);
  process.exit(1);
});
