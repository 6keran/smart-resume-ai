import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { chromium } from '@playwright/test';

const recording = 'C:/Users/kiran/OneDrive/Videos/Screen Recordings/Screen Recording 2026-11-23 194730.mp4';
const outputRoot = path.resolve('scripts/visual-qa/reference-video');
const frameRoot = path.join(outputRoot, 'frames');
await mkdir(frameRoot, { recursive: true });

const recordingSize = (await stat(recording)).size;
const server = createServer((request, response) => {
  if (request.url === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><html><body><video src="/reference.mp4" preload="auto" muted></video></body></html>');
    return;
  }
  if (request.url !== '/reference.mp4') {
    response.writeHead(404).end();
    return;
  }
  const range = request.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
  const start = range ? Number(range[1]) : 0;
  const end = range?.[2] ? Math.min(Number(range[2]), recordingSize - 1) : recordingSize - 1;
  response.writeHead(range ? 206 : 200, {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${recordingSize}` } : {}),
  });
  createReadStream(recording, { start, end }).pipe(response);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'domcontentloaded' });
  const video = page.locator('video');
  await video.waitFor();
  const metadata = await video.evaluate(async (element) => {
    element.pause();
    element.muted = true;
    if (element.readyState < 1) {
      await new Promise((resolve, reject) => {
        element.addEventListener('loadedmetadata', resolve, { once: true });
        element.addEventListener('error', () => reject(new Error('Unable to decode recording')), { once: true });
      });
    }
    return { duration: element.duration, width: element.videoWidth, height: element.videoHeight };
  });

  const sampleTimes = [];
  for (let time = 0; time < metadata.duration; time += 0.5) sampleTimes.push(time);
  sampleTimes.push(Math.max(0, metadata.duration - 0.035));

  const frames = [];
  for (const time of sampleTimes) {
    const dataUrl = await video.evaluate(async (element, targetTime) => {
      if (Math.abs(element.currentTime - targetTime) > 0.005) {
        const seeked = new Promise((resolve) => element.addEventListener('seeked', resolve, { once: true }));
        element.currentTime = targetTime;
        await seeked;
      }
      if (element.readyState < 2) {
        await new Promise((resolve) => element.addEventListener('loadeddata', resolve, { once: true }));
      }
      const canvas = document.createElement('canvas');
      canvas.width = element.videoWidth;
      canvas.height = element.videoHeight;
      canvas.getContext('2d').drawImage(element, 0, 0);
      return canvas.toDataURL('image/png');
    }, time);
    const filename = `frame-${time.toFixed(3).padStart(7, '0')}.png`;
    await writeFile(path.join(frameRoot, filename), Buffer.from(dataUrl.split(',')[1], 'base64'));
    frames.push({ time, filename });
    if (frames.length % 10 === 0) console.log(`Captured ${frames.length}/${sampleTimes.length} frames`);
  }
  await writeFile(path.join(outputRoot, 'metadata.json'), JSON.stringify({ recording, ...metadata, frames }, null, 2));
  console.log(JSON.stringify({ ...metadata, frameCount: frames.length, outputRoot }));
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
