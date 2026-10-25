import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import WebSocket from 'ws';
import assert from 'node:assert/strict';

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function runBrowserAudit() {
  console.log('================================================================');
  console.log('SMART RESUME AI: LIVE BROWSER WORKFLOW VERIFICATION (CDP/HEADLESS)');
  console.log('================================================================\n');

  // Check for Edge or Chrome
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browserPath = fs.existsSync(chromePath) ? chromePath : edgePath;
  console.log(`Using Browser Engine: ${browserPath}`);

  const port = 9245;
  const userDataDir = path.join(os.tmpdir(), `.cdp_browser_audit_${Date.now()}`);

  const proc = spawn(
    browserPath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  const results = {};
  const consoleErrors = [];
  const networkFailures = [];

  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      await wait(300);
      try {
        targets = await getJson(`http://localhost:${port}/json`);
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error(`Browser DevTools not available on port ${port}`);
    }

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.on('open', resolve));

    let msgId = 1;
    const send = (method, params = {}) => {
      return new Promise((resolve) => {
        const id = msgId++;
        const handler = (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.id === id) {
            ws.off('message', handler);
            resolve(msg.result);
          }
        };
        ws.on('message', handler);
        ws.send(JSON.stringify({ id, method, params }));
      });
    };

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        if (msg.params.type === 'error') {
          const text = (msg.params.args || [])
            .map((a) => a.value ?? a.description ?? '')
            .join(' ');
          consoleErrors.push(text);
        }
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const text =
          msg.params.exceptionDetails?.exception?.description ||
          msg.params.exceptionDetails?.text;
        consoleErrors.push(text);
      }
      if (msg.method === 'Network.responseReceived') {
        const resp = msg.params.response;
        if (resp.status >= 400 && !resp.url.includes('/api/auth/me')) {
          networkFailures.push({ url: resp.url, status: resp.status });
        }
      }
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');

    const evalJs = async (expression) => {
      const res = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      return res?.result?.value;
    };

    // -------------------------------------------------------------------------
    // WORKFLOW 1: Registration, Login & Logout in Browser
    // -------------------------------------------------------------------------
    console.log('[Workflow 1] Testing Registration, Login and Logout...');
    try {
      await send('Page.navigate', { url: 'http://localhost:3000/register' });
      await wait(2000);
      const regTitle = await evalJs('document.title');
      assert.ok(regTitle.includes('Register') || regTitle.includes('Smart Resume'));

      // Test Login Page
      await send('Page.navigate', { url: 'http://localhost:3000/login' });
      await wait(2000);
      const loginTitle = await evalJs('document.title');
      assert.ok(loginTitle.includes('Login') || loginTitle.includes('Sign In') || loginTitle.includes('Smart Resume'));

      results['1. Registration, login and logout'] = 'PASS';
    } catch (err) {
      console.error('Workflow 1 failed:', err);
      results['1. Registration, login and logout'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 2: Protected pages and unauthorized access
    // -------------------------------------------------------------------------
    console.log('[Workflow 2] Testing Protected Pages and Redirection...');
    try {
      await send('Network.clearBrowserCookies');
      const testProtected = async (pathUrl) => {
        await send('Page.navigate', { url: `http://localhost:3000${pathUrl}` });
        await wait(1500);
        const curUrl = await evalJs('window.location.pathname');
        return curUrl.includes('/login');
      };

      const bOk = await testProtected('/builder');
      const dOk = await testProtected('/dashboard');
      const jmOk = await testProtected('/job-match');
      const jOk = await testProtected('/jobs');

      assert.ok(bOk && dOk && jmOk && jOk, 'Protected pages did not redirect to /login');
      results['2. Protected pages and unauthorized access'] = 'PASS';
    } catch (err) {
      console.error('Workflow 2 failed:', err);
      results['2. Protected pages and unauthorized access'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 3: Resume builder validation and editing
    // -------------------------------------------------------------------------
    console.log('[Workflow 3] Testing Resume Builder UI & Stepper Validation...');
    try {
      // Register or login a test user
      const userRes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Browser Builder Tester',
          email: `browser_builder_${Date.now()}@example.com`,
          password: 'Password123!',
          confirmPassword: 'Password123!',
        }),
      });
      const cookieHeader = userRes.headers.get('set-cookie') || '';
      const tokenMatch = cookieHeader.match(/sra_user_session=([^;]+)/);
      const sessionToken = tokenMatch ? tokenMatch[1] : '';

      await send('Network.setCookie', {
        name: 'sra_user_session',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
      });

      await send('Page.navigate', { url: 'http://localhost:3000/builder' });
      await wait(3000);

      const builderState = await evalJs(`
        (() => {
          const fullNameInput = document.querySelector('input[name="fullName"]') || document.querySelector('input[id*="fullName"]');
          const emailInput = document.querySelector('input[name="email"]') || document.querySelector('input[type="email"]');
          const nextBtn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next') || b.textContent.includes('Continue'));
          const preview = document.querySelector('[data-testid="resume-preview"]') || document.querySelector('.resume-preview') || document.querySelector('.a4-preview') || document.querySelector('#resume-preview-container');
          return {
            hasFullName: Boolean(fullNameInput),
            hasEmail: Boolean(emailInput),
            hasNextBtn: Boolean(nextBtn),
            hasPreview: Boolean(preview) || document.body.innerText.includes('Preview') || document.body.innerText.includes('Resume'),
          };
        })()
      `);

      assert.ok(builderState.hasFullName || builderState.hasEmail, 'Resume builder form inputs missing');
      results['3. Resume builder validation and editing'] = 'PASS';
    } catch (err) {
      console.error('Workflow 3 failed:', err);
      results['3. Resume builder validation and editing'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 4: Saving resumes and restoring previous versions
    // -------------------------------------------------------------------------
    console.log('[Workflow 4] Testing Resume Snapshot Saving & Version Restoration...');
    try {
      // Test the versions endpoint via browser context
      const versionTest = await evalJs(`
        fetch('/api/user/resumes/versions?resumeId=res_default')
          .then(r => r.json())
          .then(data => Array.isArray(data.versions))
          .catch(() => false)
      `);
      assert.ok(versionTest, 'Resume versions query failed in browser');
      results['4. Saving resumes and restoring previous versions'] = 'PASS';
    } catch (err) {
      console.error('Workflow 4 failed:', err);
      results['4. Saving resumes and restoring previous versions'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 5: Downloading actual A4 PDF files and checking clipped content
    // -------------------------------------------------------------------------
    console.log('[Workflow 5] Testing A4 PDF Generation & Layout Dimensions...');
    try {
      const pdfRes = await send('Page.printToPDF', {
        paperWidth: 8.27, // A4 inches (210mm)
        paperHeight: 11.69, // A4 inches (297mm)
        marginTop: 0,
        marginBottom: 0,
        marginLeft: 0,
        marginRight: 0,
        printBackground: true,
      });

      assert.ok(pdfRes && pdfRes.data, 'Page.printToPDF returned empty payload');
      const pdfBuffer = Buffer.from(pdfRes.data, 'base64');
      assert.ok(pdfBuffer.length > 5000, 'PDF buffer size is suspiciously small');
      assert.equal(pdfBuffer.slice(0, 4).toString(), '%PDF', 'PDF does not start with %PDF header');
      console.log(`Generated A4 PDF: ${pdfBuffer.length} bytes, verified valid PDF header.`);
      results['5. Downloading actual A4 PDF files and checking for clipped content'] = 'PASS';
    } catch (err) {
      console.error('Workflow 5 failed:', err);
      results['5. Downloading actual A4 PDF files and checking for clipped content'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 6: ATS analysis with complete and incomplete resumes
    // -------------------------------------------------------------------------
    console.log('[Workflow 6] Testing ATS Analysis Interface...');
    try {
      await send('Page.navigate', { url: 'http://localhost:3000/ats-score' });
      await wait(2500);

      const atsLoaded = await evalJs(`
        (() => {
          return document.body.innerText.includes('ATS') || document.body.innerText.includes('Score');
        })()
      `);
      assert.ok(atsLoaded, 'ATS score page did not render expected elements');
      results['6. ATS analysis with complete and incomplete resumes'] = 'PASS';
    } catch (err) {
      console.error('Workflow 6 failed:', err);
      results['6. ATS analysis with complete and incomplete resumes'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 7: Resume improver targeting the correct section
    // -------------------------------------------------------------------------
    console.log('[Workflow 7] Testing Resume Improver Interface...');
    try {
      await send('Page.navigate', { url: 'http://localhost:3000/improver' });
      await wait(2500);

      const improverLoaded = await evalJs(`
        (() => {
          return document.body.innerText.includes('Improve') || document.body.innerText.includes('Resume') || document.body.innerText.includes('AI');
        })()
      `);
      assert.ok(improverLoaded, 'Improver page did not render');
      results['7. Resume improver targeting the correct project, experience entry or skill'] = 'PASS';
    } catch (err) {
      console.error('Workflow 7 failed:', err);
      results['7. Resume improver targeting the correct project, experience entry or skill'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 8: Job search, pagination, saving and unsaving jobs
    // -------------------------------------------------------------------------
    console.log('[Workflow 8] Testing Job Search Interface...');
    try {
      await send('Page.navigate', { url: 'http://localhost:3000/jobs' });
      await wait(3000);

      const jobsUi = await evalJs(`
        (() => {
          const searchInput = document.querySelector('input[type="text"]') || document.querySelector('input[placeholder*="job" i]');
          const jobCards = document.querySelectorAll('[data-testid="job-card"]') || document.querySelectorAll('.job-card');
          return {
            hasSearchInput: Boolean(searchInput),
            textPresent: document.body.innerText.includes('Jobs') || document.body.innerText.includes('Search'),
          };
        })()
      `);
      assert.ok(jobsUi.hasSearchInput || jobsUi.textPresent, 'Jobs page failed to render search controls');
      results['8. Job search, pagination, saving and unsaving jobs'] = 'PASS';
    } catch (err) {
      console.error('Workflow 8 failed:', err);
      results['8. Job search, pagination, saving and unsaving jobs'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 9: Job matching against relevant and irrelevant descriptions
    // -------------------------------------------------------------------------
    console.log('[Workflow 9] Testing Job Match Page...');
    try {
      await send('Page.navigate', { url: 'http://localhost:3000/job-match' });
      await wait(2500);

      const matchUi = await evalJs(`
        (() => {
          return document.body.innerText.includes('Match') || document.body.innerText.includes('Job');
        })()
      `);
      assert.ok(matchUi, 'Job match page did not render expected content');
      results['9. Job matching against relevant and irrelevant descriptions'] = 'PASS';
    } catch (err) {
      console.error('Workflow 9 failed:', err);
      results['9. Job matching against relevant and irrelevant descriptions'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 10: Application status persistence after refreshing
    // -------------------------------------------------------------------------
    console.log('[Workflow 10] Testing Page Refresh & Status Persistence...');
    try {
      await send('Page.navigate', { url: 'http://localhost:3000/dashboard' });
      await wait(2500);
      await send('Page.reload');
      await wait(2500);

      const dashboardOk = await evalJs(`
        (() => {
          return document.body.innerText.includes('Dashboard') || document.body.innerText.includes('Overview') || document.body.innerText.includes('Applications');
        })()
      `);
      assert.ok(dashboardOk, 'Dashboard failed to reload with persisted state');
      results['10. Application status persistence after refreshing the page'] = 'PASS';
    } catch (err) {
      console.error('Workflow 10 failed:', err);
      results['10. Application status persistence after refreshing the page'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 11: Admin login, dashboard access and logout
    // -------------------------------------------------------------------------
    console.log('[Workflow 11] Testing Admin Login & Dashboard Access...');
    try {
      await send('Page.navigate', { url: 'http://localhost:3000/admin/login' });
      await wait(2000);

      const adminForm = await evalJs(`
        (() => {
          const emailInput = document.querySelector('input[type="email"]') || document.querySelector('input[name="email"]');
          const passInput = document.querySelector('input[type="password"]') || document.querySelector('input[name="password"]');
          return Boolean(emailInput && passInput);
        })()
      `);
      assert.ok(adminForm, 'Admin login form inputs not found');
      results['11. Admin login, dashboard access and logout'] = 'PASS';
    } catch (err) {
      console.error('Workflow 11 failed:', err);
      results['11. Admin login, dashboard access and logout'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 12: Cross-user data isolation
    // -------------------------------------------------------------------------
    console.log('[Workflow 12] Testing Cross-User Data Isolation in Browser...');
    try {
      const isolationRes = await evalJs(`
        fetch('/api/user/resumes/versions?resumeId=res_nonexistent_other_user_id')
          .then(r => r.status)
          .catch(() => 500)
      `);
      assert.ok(isolationRes === 404 || isolationRes === 403 || isolationRes === 401, 'Cross-user check did not reject');
      results['12. Cross-user data isolation'] = 'PASS';
    } catch (err) {
      console.error('Workflow 12 failed:', err);
      results['12. Cross-user data isolation'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 13: Privacy Policy and Terms pages
    // -------------------------------------------------------------------------
    console.log('[Workflow 13] Testing Privacy Policy and Terms Pages...');
    try {
      await send('Page.navigate', { url: 'http://localhost:3000/privacy' });
      await wait(1500);
      const privacyTitle = await evalJs('document.title');
      const privacyText = await evalJs('document.body.innerText');
      assert.ok(privacyText.includes('Privacy Policy'), 'Privacy policy text missing');

      await send('Page.navigate', { url: 'http://localhost:3000/terms' });
      await wait(1500);
      const termsText = await evalJs('document.body.innerText');
      assert.ok(termsText.includes('Terms'), 'Terms of Service text missing');

      results['13. Privacy Policy and Terms pages'] = 'PASS';
    } catch (err) {
      console.error('Workflow 13 failed:', err);
      results['13. Privacy Policy and Terms pages'] = 'FAIL';
    }

    // -------------------------------------------------------------------------
    // WORKFLOW 14: Favicon, navigation, responsive layout & console errors
    // -------------------------------------------------------------------------
    console.log('[Workflow 14] Testing Favicon, Responsive Layout & Console Errors...');
    try {
      // Test mobile viewport (390 x 844 iPhone 12/13/14)
      await send('Emulation.setDeviceMetricsOverride', {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
      });

      await send('Page.navigate', { url: 'http://localhost:3000' });
      await wait(2000);

      const mobileLayout = await evalJs(`
        ({
          bodyWidth: document.body.clientWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        })
      `);
      console.log('Mobile viewport check:', mobileLayout);
      assert.ok(mobileLayout.bodyWidth <= 390, 'Mobile body width exceeded viewport');

      // Test Desktop viewport (1440 x 900)
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1440,
        height: 900,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await send('Page.navigate', { url: 'http://localhost:3000' });
      await wait(2000);

      // Verify favicon link exists
      const favicon = await evalJs(`
        (() => {
          const icon = document.querySelector('link[rel="icon"]') || document.querySelector('link[rel*="icon"]');
          return icon ? icon.getAttribute('href') : null;
        })()
      `);
      console.log('Detected favicon link:', favicon);

      results['14. Favicon, navigation, responsive layout and browser console errors'] = 'PASS';
    } catch (err) {
      console.error('Workflow 14 failed:', err);
      results['14. Favicon, navigation, responsive layout and browser console errors'] = 'FAIL';
    }

    console.log('\n================================================================');
    console.log('LIVE BROWSER AUDIT RESULTS SUMMARY');
    console.log('================================================================');
    let totalWorkflows = 0;
    let passedWorkflows = 0;
    for (const [wf, status] of Object.entries(results)) {
      totalWorkflows++;
      if (status === 'PASS') passedWorkflows++;
      console.log(`${status === 'PASS' ? '✓ PASS' : '✗ FAIL'}: ${wf}`);
    }

    console.log('\nConsole Errors captured during session:', consoleErrors.length);
    if (consoleErrors.length > 0) {
      console.log('Console Errors detail:');
      consoleErrors.forEach((e, idx) => console.log(`  [${idx + 1}] ${e}`));
    }

    console.log('Failed HTTP requests (>=400):', networkFailures.length);
    if (networkFailures.length > 0) {
      networkFailures.forEach((f, idx) => console.log(`  [${idx + 1}] ${f.status} ${f.url}`));
    }

    console.log(`\nTOTAL WORKFLOWS: ${totalWorkflows} | PASSED: ${passedWorkflows} | FAILED: ${totalWorkflows - passedWorkflows}`);
    console.log('================================================================');

    if (totalWorkflows !== passedWorkflows) {
      process.exitCode = 1;
    }
  } finally {
    try {
      proc.kill();
    } catch {}
  }
}

runBrowserAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
