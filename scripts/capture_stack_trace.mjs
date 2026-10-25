import { spawn } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((r, j) => http.get(url, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
  }).on('error', j));
}

async function captureStackTrace() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const proc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--user-data-dir=d:\\projects\\builder\\scripts\\.edge_stack_' + Date.now(),
    'about:blank'
  ], { stdio: 'ignore' });

  await wait(1000);
  try {
    const raw = await getJson('http://localhost:9222/json');
    const target = raw.find(t => t.type === 'page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(r => ws.on('open', r));

    let id = 1;
    const send = (method, params = {}) => new Promise(r => {
      const i = id++;
      const h = d => { const j = JSON.parse(d); if (j.id === i) { ws.off('message', h); r(j.result); } };
      ws.on('message', h);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

    ws.on('message', d => {
      const m = JSON.parse(d.toString());
      if (m.method === 'Runtime.consoleAPICalled') {
        const text = m.params.args.map(a => a.value || a.description).join(' ');
        if (text.includes('script tag') || text.includes('Script') || m.params.type === 'error' || m.params.type === 'warning') {
          console.log(`[${m.params.type.toUpperCase()}]:`, text);
          if (m.params.stackTrace) {
            console.log('[STACK TRACE]:', JSON.stringify(m.params.stackTrace, null, 2));
          }
        }
      }
    });

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('Navigating to http://localhost:3000...');
    await send('Page.navigate', { url: 'http://localhost:3000' });

    await wait(4000);
    ws.close();
  } finally {
    proc.kill();
  }
}

captureStackTrace().catch(console.error);
