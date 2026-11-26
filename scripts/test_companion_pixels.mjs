import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../src/components/assistant/companionPixels.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { companionPixelSize, posterizeCompanionPixels } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

assert.deepEqual(companionPixelSize(120, 156), { width: 96, height: 125 });
assert.deepEqual(companionPixelSize(72, 93.6), { width: 72, height: 94 });
assert.deepEqual(companionPixelSize(32, 41.6), { width: 32, height: 42 });
assert.deepEqual(companionPixelSize(0, 0), { width: 1, height: 1 });
const pixels = new Uint8ClampedArray([137, 173, 255, 255, 140, 229, 243, 128, 38, 56, 116, 127]);
posterizeCompanionPixels(pixels);
assert.deepEqual(Array.from(pixels), [128, 160, 255, 255, 128, 224, 255, 255, 38, 56, 116, 0]);
const gradient = new Uint8ClampedArray(256 * 4);
for (let value = 0; value < 256; value++) gradient.set([value, value, value, value], value * 4);
posterizeCompanionPixels(gradient);
assert.ok(Array.from(gradient).every((value) => Number.isInteger(value) && value >= 0 && value <= 255));
for (let index = 0; index < gradient.length; index += 4) {
  assert.ok(gradient[index + 3] === 0 || gradient[index + 3] === 255);
  if (gradient[index + 3]) assert.ok(gradient[index] === 255 || gradient[index] % 32 === 0);
}
console.log('Companion pixels: 7 checks passed, 0 failed (responsive pixel grids, preserved small avatars, stepped shades and hard alpha edges).');
