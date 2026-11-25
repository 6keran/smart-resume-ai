// Offline visual QA for the project-authored robot, using installed React/TypeScript/sharp.
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const output = path.join(root, 'scripts/visual-qa/mascot/reference-robot');
const require = createRequire(import.meta.url);
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const code = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const localRequire = (name) => name.startsWith('.') ? load(path.resolve(path.dirname(filename), `${name}${name.endsWith('.tsx') || name.endsWith('.ts') ? '' : name.endsWith('Artwork') ? '.tsx' : '.ts'}`)) : require(name);
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
  cache.set(filename, module.exports);
  return module.exports;
}
const { CompanionArtwork } = load(path.join(root, 'src/components/assistant/CompanionArtwork.tsx'));
const { REST_POSE, staticCompanionPose } = load(path.join(root, 'src/components/assistant/companionMotion.ts'));
const { ROBOT_RIG } = load(path.join(root, 'src/components/assistant/companionRig.ts'));
function transform(svg, joint, value) {
  return svg.replace(new RegExp(`<g([^>]*data-rig="${joint}"[^>]*)>`), (_, attrs) => `<g${attrs.replace(/ transform="[^"]*"/, '')} transform="${value}">`);
}
await mkdir(output, { recursive: true });
for (const state of ['idle', 'walking', 'thinking', 'answering', 'success', 'error']) {
  const pose = state === 'idle' ? REST_POSE : staticCompanionPose(state);
  let svg = renderToStaticMarkup(React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: 160, height: 208, viewBox: '0 0 160 208' }, React.createElement(CompanionArtwork, { id: 'robot-preview', state: state === 'walking' ? 'idle' : state })));
  svg = transform(svg, 'body', `translate(0 ${pose.bodyY}) rotate(${pose.bodyR} 80 170)`);
  svg = transform(svg, 'breath', `translate(80 170) scale(1 ${pose.breath}) translate(-80 -170)`);
  for (const [joint, center] of Object.entries(ROBOT_RIG)) svg = transform(svg, joint === 'headR' ? 'head' : joint, `rotate(${pose[joint]} ${center})`);
  svg = transform(svg, 'gaze', `translate(${pose.lookX} ${pose.lookY})`);
  svg = transform(svg, 'eyes', `translate(0 90) scale(1 ${pose.eyes}) translate(0 -90)`);
  await writeFile(path.join(output, `${state}.svg`), svg);
  await sharp(Buffer.from(svg)).resize(320, 416).png().toFile(path.join(output, `${state}.png`));
}
if (process.argv[2]) {
  const source = sharp(process.argv[2]);
  const { data, info } = await source.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width, top = info.height, right = 0, bottom = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] > 100 && data[i + 2] > 85 && data[i + 2] > data[i] * 1.12 && data[i + 2] >= data[i + 1]) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
  }
  if (right <= left || bottom <= top) throw new Error('Reference foreground was not found; no comparison produced.');
  const reference = await source.clone().extract({ left, top, width: right - left + 1, height: bottom - top + 1 }).resize(280, 360, { fit: 'contain', kernel: 'nearest', background: '#171717' }).png().toBuffer();
  const robot = await sharp(path.join(output, 'idle.png')).trim().resize(280, 360, { fit: 'contain', background: '#171717' }).flatten({ background: '#171717' }).png().toBuffer();
  const labels = Buffer.from('<svg width="600" height="420"><rect width="600" height="420" fill="#171717"/><g fill="#eeeeee" font-family="Segoe UI, sans-serif" font-size="16"><text x="80" y="28">Attached reference</text><text x="378" y="28">Project robot</text></g></svg>');
  await sharp(labels).composite([{ input: reference, left: 10, top: 48 }, { input: robot, left: 310, top: 48 }]).png().toFile(path.join(output, 'reference-comparison.png'));
  console.log(`Reference robot bounds: ${right - left + 1}x${bottom - top + 1}; authored artwork and comparison saved in ${output}.`);
} else console.log(`Six original project robot poses saved in ${output}.`);
