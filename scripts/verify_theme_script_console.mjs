import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import WebSocket from 'ws';

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

async function runBrowserVerification() {
  console.log('========================================================');
  console.log('BROWSER VERIFICATION: SCRIPT WARNING & THEME INIT AUDIT');
  console.log('========================================================');

  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = `d:\\projects\\builder-github\\scripts\\.edge_theme_audit_${Date.now()}`;

  const proc = spawn(
    edgePath,
    [
      '--headless=new',
      '--remote-debugging-port=9229',
      `--user-data-dir=${userDataDir}`,
      '--window-size=1440,900',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      await wait(300);
      try {
        targets = await getJson('http://localhost:9229/json');
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Edge DevTools target not available on port 9229');
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

    const recordedConsoleLogs = [];
    const recordedErrors = [];

    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = (msg.params.args || [])
          .map((a) => a.value ?? a.description ?? '')
          .join(' ');
        recordedConsoleLogs.push({ type: msg.params.type, text });
      }
      if (msg.method === 'Log.entryAdded') {
        recordedConsoleLogs.push({
          type: msg.params.entry.level,
          text: msg.params.entry.text,
        });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        const text =
          msg.params.exceptionDetails?.exception?.description ||
          msg.params.exceptionDetails?.text;
        recordedErrors.push(text);
      }
    });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');

    // ---------------------------------------------------------------
    // TEST 1: Default initial load (no saved preference in localStorage)
    // ---------------------------------------------------------------
    console.log('\n[Test 1] Testing Default Initial Load (Fresh profile, no saved preference)...');
    await send('Page.navigate', { url: 'http://localhost:3000' });
    await wait(3000);

    const defaultThemeState = await send('Runtime.evaluate', {
      expression: `
        ({
          htmlClasses: document.documentElement.className,
          isDarkClass: document.documentElement.classList.contains('dark'),
          isLightClass: document.documentElement.classList.contains('light'),
          dataTheme: document.documentElement.getAttribute('data-theme'),
          colorScheme: document.documentElement.style.colorScheme,
          bodyBg: getComputedStyle(document.body).backgroundColor,
          bodyColor: getComputedStyle(document.body).color,
          localStorageTheme: localStorage.getItem('smart_resume_theme') || localStorage.getItem('theme'),
        })
      `,
      returnByValue: true,
    });
    console.log('Default initial theme state:', defaultThemeState.result.value);

    // ---------------------------------------------------------------
    // TEST 2: Hard reload with Light theme pre-set in localStorage
    // ---------------------------------------------------------------
    console.log('\n[Test 2] Testing Pre-paint Light Theme Initialization on Hard Reload...');
    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('smart_resume_theme', 'light');
        localStorage.setItem('theme', 'light');
      `,
    });

    // Reload the page
    await send('Page.reload');
    await wait(3000);

    const lightInitState = await send('Runtime.evaluate', {
      expression: `
        ({
          htmlClasses: document.documentElement.className,
          isDarkClass: document.documentElement.classList.contains('dark'),
          isLightClass: document.documentElement.classList.contains('light'),
          dataTheme: document.documentElement.getAttribute('data-theme'),
          colorScheme: document.documentElement.style.colorScheme,
          bodyBg: getComputedStyle(document.body).backgroundColor,
          bodyColor: getComputedStyle(document.body).color,
          localStorageTheme: localStorage.getItem('smart_resume_theme'),
        })
      `,
      returnByValue: true,
    });
    console.log('Light theme state after hard reload:', lightInitState.result.value);

    // ---------------------------------------------------------------
    // TEST 3: Hard reload with Dark theme pre-set in localStorage
    // ---------------------------------------------------------------
    console.log('\n[Test 3] Testing Pre-paint Dark Theme Initialization on Hard Reload...');
    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('smart_resume_theme', 'dark');
        localStorage.setItem('theme', 'dark');
      `,
    });

    await send('Page.reload');
    await wait(3000);

    const darkInitState = await send('Runtime.evaluate', {
      expression: `
        ({
          htmlClasses: document.documentElement.className,
          isDarkClass: document.documentElement.classList.contains('dark'),
          isLightClass: document.documentElement.classList.contains('light'),
          dataTheme: document.documentElement.getAttribute('data-theme'),
          colorScheme: document.documentElement.style.colorScheme,
          bodyBg: getComputedStyle(document.body).backgroundColor,
          bodyColor: getComputedStyle(document.body).color,
          localStorageTheme: localStorage.getItem('smart_resume_theme'),
        })
      `,
      returnByValue: true,
    });
    console.log('Dark theme state after hard reload:', darkInitState.result.value);

    // ---------------------------------------------------------------
    // TEST 4: Fallback to old 'theme' localStorage key
    // ---------------------------------------------------------------
    console.log('\n[Test 4] Testing Fallback to legacy "theme" key in localStorage...');
    await send('Runtime.evaluate', {
      expression: `
        localStorage.removeItem('smart_resume_theme');
        localStorage.setItem('theme', 'light');
      `,
    });

    await send('Page.reload');
    await wait(3000);

    const fallbackInitState = await send('Runtime.evaluate', {
      expression: `
        ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          isLightClass: document.documentElement.classList.contains('light'),
          colorScheme: document.documentElement.style.colorScheme,
          legacyTheme: localStorage.getItem('theme'),
        })
      `,
      returnByValue: true,
    });
    console.log('Fallback theme state after hard reload:', fallbackInitState.result.value);

    // ---------------------------------------------------------------
    // TEST 5: System preference test
    // ---------------------------------------------------------------
    console.log('\n[Test 5] Testing "system" preference mode...');
    await send('Runtime.evaluate', {
      expression: `
        localStorage.setItem('smart_resume_theme', 'system');
      `,
    });

    await send('Page.reload');
    await wait(3000);

    const systemInitState = await send('Runtime.evaluate', {
      expression: `
        ({
          dataTheme: document.documentElement.getAttribute('data-theme'),
          colorScheme: document.documentElement.style.colorScheme,
          prefersLight: window.matchMedia('(prefers-color-scheme: light)').matches,
        })
      `,
      returnByValue: true,
    });
    console.log('System preference state after hard reload:', systemInitState.result.value);

    // ---------------------------------------------------------------
    // TEST 6: Client-side route navigations
    // ---------------------------------------------------------------
    console.log('\n[Test 6] Testing client-side navigation across multiple routes...');
    const routesToTest = ['/login', '/register', '/jobs', '/analyzer', '/builder', '/'];
    for (const route of routesToTest) {
      console.log(`Navigating to ${route}...`);
      await send('Runtime.evaluate', {
        expression: `window.__next_router?.push?.('${route}') || window.location.assign('${route}')`,
      });
      await wait(2000);
    }

    // ---------------------------------------------------------------
    // TEST 7: Scan for React Script warning and hydration errors
    // ---------------------------------------------------------------
    console.log('\n========================================================');
    console.log('ANALYZING CONSOLE LOGS FOR REACT SCRIPT WARNING & HYDRATION ISSUES');
    console.log('========================================================');

    console.log(`Total console entries captured: ${recordedConsoleLogs.length}`);

    const targetWarningMatches = recordedConsoleLogs.filter((l) =>
      l.text &&
      (l.text.includes('Encountered a script tag while rendering React component') ||
       l.text.includes('Scripts inside React components are never executed when rendering on the client'))
    );

    const hydrationErrorMatches = recordedConsoleLogs.filter((l) =>
      l.text &&
      (l.text.includes('Hydration failed') ||
       l.text.includes('Text content does not match server-rendered HTML') ||
       l.text.includes('did not match'))
    );

    console.log('\n[Result] "Encountered a script tag" warning occurrences:', targetWarningMatches.length);
    console.log('[Result] Hydration error occurrences:', hydrationErrorMatches.length);
    console.log('[Result] Runtime unhandled exceptions:', recordedErrors.length);

    const passDefaultDark = defaultThemeState.result.value.dataTheme === 'dark';
    const passLightInit = lightInitState.result.value.dataTheme === 'light';
    const passDarkInit = darkInitState.result.value.dataTheme === 'dark';
    const passFallbackLight = fallbackInitState.result.value.dataTheme === 'light';
    const passSystem = Boolean(systemInitState.result.value.dataTheme);
    const passNoScriptWarning = targetWarningMatches.length === 0;
    const passNoHydrationError = hydrationErrorMatches.length === 0;

    console.log('\nVERIFICATION SUMMARY:');
    console.log('- Default to Dark without preference:', passDefaultDark ? 'PASS' : 'FAIL');
    console.log('- Light theme pre-paint init:', passLightInit ? 'PASS' : 'FAIL');
    console.log('- Dark theme pre-paint init:', passDarkInit ? 'PASS' : 'FAIL');
    console.log('- Legacy "theme" key fallback:', passFallbackLight ? 'PASS' : 'FAIL');
    console.log('- System preference resolution:', passSystem ? 'PASS' : 'FAIL');
    console.log('- Exact React script tag warning eliminated:', passNoScriptWarning ? 'PASS' : 'FAIL');
    console.log('- Hydration safe across all navigations:', passNoHydrationError ? 'PASS' : 'FAIL');

    const allPassed =
      passDefaultDark &&
      passLightInit &&
      passDarkInit &&
      passFallbackLight &&
      passSystem &&
      passNoScriptWarning &&
      passNoHydrationError;

    if (!allPassed) {
      throw new Error('Theme verification failed!');
    }

    console.log('\n>>> ALL AUDIT CHECKS PASSED SUCCESSFULLY! <<<');
    ws.close();
  } finally {
    proc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

runBrowserVerification().catch((err) => {
  console.error('Browser verification failed:', err);
  process.exit(1);
});
