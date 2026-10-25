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

export async function captureExact({ url, outputPath, width = 1024, height = 684, theme = 'light', port = 9223 }) {
  console.log(`Starting capture: ${outputPath} (${width}x${height}, theme=${theme}, port=${port})...`);
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const userDataDir = path.join(os.tmpdir(), `.edge_exact_${Date.now()}_${Math.random().toString(36).substring(7)}`);

  const proc = spawn(
    edgePath,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
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
        targets = await getJson(`http://localhost:${port}/json`);
        if (targets && targets.length > 0) break;
      } catch {}
    }

    if (!targets || targets.length === 0) {
      throw new Error(`Edge DevTools target not available on port ${port}`);
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

    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send('Page.navigate', { url });
    await wait(3500);

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
    }

    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, Buffer.from(data, 'base64'));
    console.log(`✓ Saved screenshot to ${outputPath}`);

    ws.close();
  } finally {
    proc.kill();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
  }
}

async function run() {
  const outputPath = 'C:/Users/SAI/.gemini/antigravity-ide/brain/b9142b0b-dd3f-40c5-9cc6-d0acca78c124/screenshots/exact_1024x684_dark.png';
  await captureExact({
    url: 'http://localhost:3000',
    outputPath,
    width: 1024,
    height: 684,
    theme: 'dark',
  });
}

if (process.argv[1] && process.argv[1].endsWith('capture_exact_reference.mjs')) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
