import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from '@playwright/test';

const PORT = 3195;
const BASE_URL = `http://localhost:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), 'scripts', 'visual-qa', 'typography', 'before');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function waitForServer(url, timeoutMs = 35000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 500) {
        return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Server at ${url} failed to respond within ${timeoutMs}ms.`);
}

async function main() {
  console.log('Capturing typography baseline screenshots...');
  const testDbDir = path.join(process.cwd(), 'data', 'test_sandboxes');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }

  const baseDb = path.join(process.cwd(), 'data', 'smart_resume.db');
  const testDbPath = path.join(testDbDir, `typo_baseline_${Date.now()}.db`);
  if (fs.existsSync(baseDb)) {
    try { fs.copyFileSync(baseDb, testDbPath); } catch {}
  }

  const serverEnv = {
    PORT: String(PORT),
    NODE_ENV: 'test',
    DB_PROVIDER: 'sqlite',
    SQLITE_PATH: testDbPath,
    STAGING_DB_PATH: testDbPath,
    ADMIN_SESSION_SECRET: 'a_very_secure_long_staging_session_secret_32_characters_min',
    SESSION_SECRET: 'a_very_secure_long_staging_session_secret_32_characters_min',
  };

  const serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT), '-H', 'localhost'], {
    cwd: process.cwd(),
    env: { ...process.env, ...serverEnv },
    stdio: 'ignore',
    shell: true,
  });

  let browser;
  try {
    await waitForServer(`${BASE_URL}/`, 35000);
    console.log(`Server ready on port ${PORT}`);

    // Register test user
    const email = `typo.test.${Date.now()}@example.com`;
    const password = 'Password@123456';
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Typography Auditor',
        email,
        password,
        confirmPassword: password,
      }),
    });
    let sessionCookie = '';
    if (regRes.ok) {
      const cookies = regRes.headers.getSetCookie ? regRes.headers.getSetCookie() : [regRes.headers.get('set-cookie') || ''];
      sessionCookie = cookies.join('; ');
    }

    browser = await chromium.launch({ headless: true });

    const viewports = [
      { name: '1366x768', width: 1366, height: 768 },
      { name: '1440x900', width: 1440, height: 900 },
      { name: '390x844', width: 390, height: 844, isMobile: true, hasTouch: true },
    ];

    const routes = [
      { path: '/', name: 'landing' },
      { path: '/dashboard', name: 'dashboard', auth: true },
      { path: '/ats-score', name: 'ats-score' },
      { path: '/builder', name: 'builder' },
      { path: '/jobs', name: 'jobs' },
    ];

    for (const vp of viewports) {
      console.log(`Capturing for viewport: ${vp.name}...`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile || false,
        hasTouch: vp.hasTouch || false,
      });

      if (sessionCookie) {
        const tokenMatch = sessionCookie.match(/sra_user_session=([^;]+)/) || sessionCookie.match(/session_token=([^;]+)/);
        if (tokenMatch) {
          const cookieName = sessionCookie.includes('sra_user_session') ? 'sra_user_session' : 'session_token';
          await context.addCookies([
            {
              name: cookieName,
              value: tokenMatch[1],
              domain: 'localhost',
              path: '/',
              httpOnly: true,
              sameSite: 'Lax',
            },
          ]);
        }
      }

      const page = await context.newPage();

      for (const r of routes) {
        try {
          await page.goto(`${BASE_URL}${r.path}`, { waitUntil: 'networkidle', timeout: 15000 });
          await page.waitForTimeout(600);
          const outPath = path.join(SCREENSHOT_DIR, `${r.name}_${vp.name}.png`);
          await page.screenshot({ path: outPath, fullPage: false });
          console.log(`Saved: ${r.name}_${vp.name}.png`);
        } catch (err) {
          console.warn(`Could not capture ${r.path} at ${vp.name}: ${err.message}`);
        }
      }

      await context.close();
    }

    console.log('All baseline screenshots captured successfully!');
  } finally {
    if (browser) await browser.close();
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/T', '/F']);
      } else {
        serverProcess.kill('SIGKILL');
      }
    } catch {}
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

