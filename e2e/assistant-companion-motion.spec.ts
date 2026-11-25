import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type Page } from '@playwright/test';
import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH, video: 'on' });
const launcher = (page: Page) => page.locator('[data-assistant-mode="collapsed"]');
const robot = (page: Page) => launcher(page).locator('[data-companion-state]');

async function ready(page: Page) {
  await page.addInitScript(() => localStorage.setItem('sra_nimbus_greeting_shown', '1'));
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(launcher(page)).toHaveAttribute('data-placement-ready', 'true');
  await expect(robot(page)).toHaveAttribute('data-active', '1');
  const box = (await launcher(page).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function move(page: Page, from: { x: number; y: number }, to: { x: number; y: number }, steps = 18) {
  for (let step = 1; step <= steps; step++) {
    await page.mouse.move(from.x + (to.x - from.x) * step / steps, from.y + (to.y - from.y) * step / steps);
    await page.waitForTimeout(17); // Sample a continuous gesture, rather than instantaneous synthetic events.
  }
  return to;
}

test('repeated cardinal/diagonal dragging, reversals, jitter and edge stops keep the robot upright', async ({ page, diagnostics }, info) => {
  const start = await ready(page);
  // Record every displayed transform while moving, not just the final direction.
  await robot(page).evaluate((element) => {
    const samples: unknown[] = [];
    (window as unknown as { robotMotionSamples: unknown[] }).robotMotionSamples = samples;
    const observer = new MutationObserver(() => {
      const svg = element as SVGSVGElement;
      const body = svg.querySelector<SVGGElement>('[data-rig="body"]')!;
      const turn = svg.querySelector<SVGGElement>('[data-rig="turn"]')!;
      const m = turn.transform.baseVal.consolidate()?.matrix;
      const b = body.transform.baseVal.consolidate()?.matrix;
      const box = svg.getBoundingClientRect();
      samples.push({ time: performance.now(), speed: Number(svg.dataset.speed), phase: Number(svg.dataset.phase), motion: svg.dataset.motion,
        direction: svg.dataset.direction, width: box.width, height: box.height,
        svg: svg.outerHTML,
        determinant: m ? m.a * m.d - m.b * m.c : 1, angle: b ? Math.atan2(b.b, b.a) * 180 / Math.PI : 0,
        leftHip: svg.querySelector('[data-rig="leftHip"]')?.getAttribute('transform'),
        rightHip: svg.querySelector('[data-rig="rightHip"]')?.getAttribute('transform') });
    });
    observer.observe(element, { attributes: true, subtree: true, attributeFilter: ['transform', 'data-phase'] });
  });
  await page.mouse.move(start.x, start.y); await page.mouse.down();
  const viewport = page.viewportSize()!;
  const initialDirection = start.x > viewport.width * .5 ? -1 : 1;
  let cursor = await move(page, start, { x: start.x + initialDirection * 100, y: start.y });
  await expect(robot(page)).toHaveAttribute('data-direction', initialDirection < 0 ? 'left' : 'right');
  cursor = await move(page, cursor, { x: viewport.width * .5, y: viewport.height * .5 });
  await expect.poll(() => robot(page).getAttribute('data-motion')).toBe('walking');
  const folder = path.join(process.cwd(), 'scripts/visual-qa/mascot/gait-fix', info.project.name);
  await mkdir(folder, { recursive: true });
  await launcher(page).screenshot({ path: path.join(folder, 'walking.png'), animations: 'allow' });
  const poses = [await robot(page).evaluate((svg) => svg.outerHTML)];
  for (const [dx, dy] of [[60, 0], [0, -70], [-60, 0], [0, 70], [60, -60], [-60, 60], [60, 60], [-60, -60], [60, 0], [-60, 0]]) {
    cursor = await move(page, cursor, { x: cursor.x + dx, y: cursor.y + dy });
    if (dx) await expect(robot(page)).toHaveAttribute('data-direction', dx < 0 ? 'left' : 'right');
    poses.push(await robot(page).evaluate((svg) => svg.outerHTML));
  }
  // Pause first so tiny noisy horizontal samples cannot be mistaken for residual travel.
  await expect.poll(() => robot(page).getAttribute('data-motion')).not.toBe('walking');
  const facing = await robot(page).getAttribute('data-direction');
  for (let index = 0; index < 20; index++) {
    await page.mouse.move(cursor.x + (index % 2 ? 1 : -1), cursor.y - index);
    await page.waitForTimeout(17);
  }
  await expect(robot(page)).toHaveAttribute('data-direction', facing!);
  cursor = await move(page, cursor, { x: 1, y: 1 });
  await expect.poll(() => robot(page).getAttribute('data-motion')).not.toBe('walking');
  const edge = await launcher(page).boundingBox();
  const phase = await robot(page).getAttribute('data-phase');
  // Pointer still moves outside the useful bounds, while actual position cannot move.
  for (let index = 0; index < 12; index++) { await page.mouse.move(index % 2 ? 2 : 1, index % 2 ? 1 : 2); await page.waitForTimeout(17); }
  expect(await robot(page).getAttribute('data-phase')).toBe(phase);
  const edgeAfter = (await launcher(page).boundingBox())!;
  expect(Math.abs(edgeAfter.x - edge!.x)).toBeLessThan(.3);
  expect(Math.abs(edgeAfter.y - edge!.y)).toBeLessThan(.3);
  expect(edgeAfter.x).toBeGreaterThanOrEqual(15); expect(edgeAfter.y).toBeGreaterThanOrEqual(15);
  await page.mouse.up();
  await expect(page.getByRole('dialog', { name: 'Smart Resume AI Assistant', exact: true })).toHaveCount(0);
  await expect.poll(() => robot(page).getAttribute('data-motion')).not.toBe('walking');
  const samples = await page.evaluate(() => (window as unknown as { robotMotionSamples: Array<{ determinant: number; angle: number; width: number; height: number; motion: string; leftHip: string; rightHip: string }> }).robotMotionSamples);
  expect(samples.length).toBeGreaterThan(50);
  expect(samples.every((sample) => Math.abs(sample.determinant - 1) < .0001 && Math.abs(sample.angle) < 5)).toBe(true);
  expect(Math.max(...samples.map((sample) => sample.width)) - Math.min(...samples.map((sample) => sample.width))).toBeLessThan(.1);
  expect(new Set(samples.filter((sample) => sample.motion === 'walking').map((sample) => sample.leftHip)).size).toBeGreaterThan(12);
  expect(new Set(samples.filter((sample) => sample.motion === 'walking').map((sample) => sample.rightHip)).size).toBeGreaterThan(12);
  await writeFile(path.join(folder, 'motion-samples.json'), JSON.stringify(samples, null, 2));
  await writeFile(path.join(folder, 'walking-poses.json'), JSON.stringify(poses));
  await launcher(page).screenshot({ path: path.join(folder, 'settled.png'), animations: 'allow' });
  await page.getByRole('button', { name: /open ai assistant/i }).click();
  await expect(page.getByRole('dialog', { name: 'Smart Resume AI Assistant', exact: true })).toBeVisible();
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('touch reversal, release and cancellation preserve position and the next tap', async ({ page, context, diagnostics }, info) => {
  test.skip(!info.project.name.startsWith('mobile'), 'Native touch is covered on both mobile viewports.');
  const start = await ready(page);
  const session = await context.newCDPSession(page);
  const touch = async (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', x = 0, y = 0) => {
    await session.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y, id: 1 }] });
    await page.waitForTimeout(20);
  };
  await touch('touchStart', start.x, start.y);
  for (let index = 1; index <= 20; index++) await touch('touchMove', start.x - index * 5, start.y - index * 5);
  await expect(robot(page)).toHaveAttribute('data-direction', 'left');
  for (let index = 1; index <= 15; index++) await touch('touchMove', start.x - 100 + index * 4, start.y - 100 - index * 3);
  await expect(robot(page)).toHaveAttribute('data-direction', 'right');
  await touch('touchEnd');
  await expect(launcher(page)).toHaveAttribute('data-placement-ready', 'true');
  const box = (await launcher(page).boundingBox())!;
  await touch('touchStart', box.x + box.width / 2, box.y + box.height / 2);
  await touch('touchMove', box.x + box.width / 2 - 40, box.y + box.height / 2 - 30);
  await touch('touchCancel');
  await expect(launcher(page)).toHaveAttribute('data-dragging', 'false');
  await expect.poll(() => robot(page).getAttribute('data-motion')).not.toBe('walking');
  await expect(page.getByRole('dialog', { name: 'Smart Resume AI Assistant', exact: true })).toHaveCount(0);
  await expect(launcher(page)).toHaveAttribute('data-placement-ready', 'true');
  const settled = (await launcher(page).boundingBox())!;
  await page.touchscreen.tap(settled.x + settled.width / 2, settled.y + settled.height / 2);
  await expect(page.getByRole('dialog', { name: 'Smart Resume AI Assistant', exact: true })).toBeVisible();
  await session.detach();
  expect(diagnostics.consoleErrors).toEqual([]);
});
