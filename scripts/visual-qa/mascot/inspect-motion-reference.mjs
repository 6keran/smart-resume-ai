import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const recording = process.argv[2];
if (!recording) throw new Error('Provide the local reference video path.');
const output = path.resolve('scripts/visual-qa/mascot/gait-reference');
await mkdir(path.join(output, 'frames'), { recursive: true });
const size = (await stat(recording)).size;
const server = createServer((request, response) => {
  if (request.url === '/') { response.setHeader('Content-Type', 'text/html'); response.end('<video src="/clip" muted preload="auto"></video>'); return; }
  if (request.url !== '/clip') { response.writeHead(404).end(); return; }
  const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const start = range ? Number(range[1]) : 0;
  const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  response.writeHead(range ? 206 : 200, { 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1, ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
  createReadStream(recording, { start, end }).pipe(response);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  const video = page.locator('video');
  const metadata = await video.evaluate(async (element) => {
    if (element.readyState < 1) await new Promise((resolve, reject) => { element.addEventListener('loadedmetadata', resolve, { once: true }); element.addEventListener('error', () => reject(new Error('Video decoding failed')), { once: true }); });
    return { duration: element.duration, width: element.videoWidth, height: element.videoHeight };
  });
  console.log(JSON.stringify(metadata));
  const step = Number(process.argv[3] || .25);
  const start = Number(process.argv[4] || 0);
  const finish = Math.min(metadata.duration - .025, Number(process.argv[5] || metadata.duration));
  const frames = [];
  for (let time = start; time <= finish + .0001; time += step) {
    const data = await video.evaluate(async (element, target) => {
      if (Math.abs(element.currentTime - target) > .002) { const done = new Promise((resolve) => element.addEventListener('seeked', resolve, { once: true })); element.currentTime = target; await done; }
      if (element.readyState < 2) await new Promise((resolve) => element.addEventListener('loadeddata', resolve, { once: true }));
      const canvas = document.createElement('canvas'); canvas.width = element.videoWidth; canvas.height = element.videoHeight;
      canvas.getContext('2d').drawImage(element, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    }, time);
    const name = `frame-${time.toFixed(3)}.png`;
    await writeFile(path.join(output, 'frames', name), Buffer.from(data, 'base64'));
    frames.push({ time: Number(time.toFixed(3)), name });
  }
  await writeFile(path.join(output, `metadata-${start}-${step}.json`), JSON.stringify({ recording, ...metadata, step, frames }, null, 2));
  const selected = frames.filter((_, index) => index % Math.max(1, Math.round(1 / step)) === 0);
  for (let offset = 0; offset < selected.length; offset += 20) {
    const tiles = [];
    for (const [index, frame] of selected.slice(offset, offset + 20).entries()) {
      const thumb = await sharp(path.join(output, 'frames', frame.name)).resize(320, 180, { fit: 'contain' }).png().toBuffer();
      const label = Buffer.from(`<svg width="320" height="24"><rect width="320" height="24" fill="#ffffff"/><text x="8" y="17" font-family="sans-serif" font-size="13">${frame.time.toFixed(2)}s</text></svg>`);
      tiles.push({ input: thumb, left: (index % 4) * 320, top: Math.floor(index / 4) * 204 }, { input: label, left: (index % 4) * 320, top: Math.floor(index / 4) * 204 + 180 });
    }
    await sharp({ create: { width: 1280, height: 1020, channels: 4, background: '#e9edf2' } }).composite(tiles).png().toFile(path.join(output, `overview-${start}-${offset / 20}.png`));
  }
  console.log(`Decoded ${frames.length} samples across ${start.toFixed(2)}–${finish.toFixed(2)}s; saved in ${output}`);
} finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
