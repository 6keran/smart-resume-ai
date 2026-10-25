import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import WebSocket from 'ws';

async function wait(ms) {
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

export async function loginAdmin() {
  const res = await fetch('http://localhost:3000/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'kiran81232@gmail.com', password: 'kiran@69' }),
  });
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/sra_admin_session=([^;]+)/);
  return match ? match[1] : null;
}

export async function loginUser() {
  const email = 'candidate_showcase@career.test';
  const password = 'Password123!';
  let res = await fetch('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Candidate Test',
        email,
        password,
        confirmPassword: password,
      }),
    });
  }
  const setCookie = res.headers.get('set-cookie') || '';
  const match = setCookie.match(/sra_user_session=([^;]+)/);
  return match ? match[1] : null;
}

export async function captureScreenshot({ url, outputPath, width = 1440, height = 900, theme = 'dark', cookies = [], action }) {
  console.log(`Starting capture: ${outputPath} (${width}x${height}, theme=${theme})...`);
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(os.tmpdir(), `.edge_profile_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  const proc = spawn(
    edgePath,
    [
      '--headless=new',
      `--remote-debugging-port=9222`,
      `--user-data-dir=${userDataDir}`,
      `--window-size=${width},${height}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    let targets = null;
    for (let i = 0; i < 30; i++) {
      await wait(300);
      try {
        targets = await getJson('http://localhost:9222/json');
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error('Edge DevTools target not available on port 9222');
    }

    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
    });

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

    await send('Page.enable');
    await send('Network.enable');

    for (const c of cookies) {
      await send('Network.setCookie', {
        name: c.name,
        value: c.value,
        url: 'http://localhost:3000',
        domain: 'localhost',
        path: '/',
      });
    }

    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send('Page.navigate', { url });
    await wait(4000);

    if (theme === 'light') {
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const btn = document.querySelector('#theme-toggle-light') || document.querySelector('button[data-theme="light"]') || document.querySelector('button[aria-label*="light" i]');
            if (btn) {
              btn.click();
            } else {
              document.documentElement.classList.remove('dark');
              document.documentElement.classList.add('light');
              document.documentElement.setAttribute('data-theme', 'light');
              if (document.body) {
                document.body.classList.remove('dark');
                document.body.classList.add('light');
                document.body.setAttribute('data-theme', 'light');
              }
              try { localStorage.setItem('smart_resume_theme', 'light'); } catch {}
            }
          })()
        `,
      });
      await wait(800);
    } else {
      await send('Runtime.evaluate', {
        expression: `
          (() => {
            const btn = document.querySelector('#theme-toggle-dark') || document.querySelector('button[data-theme="dark"]') || document.querySelector('button[aria-label*="dark" i]');
            if (btn) {
              btn.click();
            } else {
              document.documentElement.classList.remove('light');
              document.documentElement.classList.add('dark');
              document.documentElement.setAttribute('data-theme', 'dark');
              if (document.body) {
                document.body.classList.remove('light');
                document.body.classList.add('dark');
                document.body.setAttribute('data-theme', 'dark');
              }
              try { localStorage.setItem('smart_resume_theme', 'dark'); } catch {}
            }
          })()
        `,
      });
      await wait(800);
    }

    if (action) {
      await action(send);
      await wait(1000);
    }

    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
    console.log(`✓ Saved screenshot to ${outputPath} (${data.length} bytes base64)`);

    ws.close();
  } finally {
    proc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

async function main() {
  const screenshotsDir = 'C:\\Users\\SAI\\.gemini\\antigravity-ide\\brain\\b9142b0b-dd3f-40c5-9cc6-d0acca78c124\\screenshots';
  
  console.log('Logging in user & admin...');
  const userCookie = await loginUser();
  const adminCookie = await loginAdmin();
  console.log(`User cookie: ${Boolean(userCookie)}, Admin cookie: ${Boolean(adminCookie)}`);

  const userCookies = userCookie ? [{ name: 'sra_user_session', value: userCookie }] : [];
  const adminCookies = adminCookie ? [{ name: 'sra_admin_session', value: adminCookie }] : [];

  const pages = [
    { name: '1_landing', url: 'http://localhost:3000/', cookies: [] },
    {
      name: '1_landing_overview',
      url: 'http://localhost:3000/',
      cookies: [],
      height: 1600,
    },
    {
      name: '1_landing_mobile',
      url: 'http://localhost:3000/',
      cookies: [],
      width: 390,
      height: 844,
    },
    { name: '2_dashboard', url: 'http://localhost:3000/dashboard', cookies: userCookies },
    { name: '3_builder', url: 'http://localhost:3000/builder', cookies: userCookies },
    { name: '4_analyzer', url: 'http://localhost:3000/analyzer', cookies: userCookies },
    { name: '5_jobs', url: 'http://localhost:3000/jobs', cookies: userCookies },
    { name: '6_admin', url: 'http://localhost:3000/admin/users', cookies: adminCookies },
  ];

  const targetFilter = process.argv[2];
  const pagesToCapture = targetFilter ? pages.filter(p => p.name.includes(targetFilter)) : pages;

  for (const p of pagesToCapture) {
    for (const theme of ['dark', 'light']) {
      await captureScreenshot({
        url: p.url,
        outputPath: path.join(screenshotsDir, `${p.name}_${theme}.png`),
        width: p.width || 1440,
        height: p.height || 900,
        theme,
        cookies: p.cookies,
      });
      await wait(500);
    }
  }

  console.log('All 6 pages captured in dark and light themes!');
}

if (process.argv[1]?.endsWith('capture_real_ui.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
