import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH, video: 'off', trace: 'off' });
const launcher = (page: Page) => page.locator('[data-assistant-mode="collapsed"]');
const robot = (page: Page) => launcher(page).locator('svg');
const panel = (page: Page) => page.getByRole('dialog', { name: 'Smart Resume AI Assistant', exact: true });

async function ready(page: Page) {
  await page.addInitScript(() => localStorage.setItem('sra_nimbus_greeting_shown', '1'));
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(launcher(page)).toHaveAttribute('data-placement-ready', 'true');
  await expect(launcher(page).locator('canvas')).toHaveAttribute('data-pixel-ready', '1');
}

test('scrolling pins both default and dragged positions; client navigation resets only the companion', async ({ page, diagnostics }, info) => {
  await page.route('**/api/chat', (route) => route.fulfill({ json: { reply: 'Keep the resume facts you provided.', provider: 'Isolated test' } }));
  await ready(page);
  const button = page.getByRole('button', { name: /open ai assistant/i });
  const baseline = (await launcher(page).boundingBox())!;
  const samples: unknown[] = [];
  const checkScroll = async (anchor: { x: number; y: number }, label: string) => {
    for (const fraction of [1, .3, .7, 0]) {
      await page.evaluate((amount) => window.scrollTo({ top: (document.documentElement.scrollHeight - innerHeight) * amount, behavior: 'instant' }), fraction);
      if (fraction === 1) await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
      // Wait beyond the former clearance scan's debounce/animation window.
      await page.waitForTimeout(300);
      const box = (await launcher(page).boundingBox())!;
      samples.push({ label, fraction, box });
      expect(Math.abs(box.x - anchor.x)).toBeLessThan(.5);
      expect(Math.abs(box.y - anchor.y)).toBeLessThan(.5);
      expect(await launcher(page).evaluate((node) => getComputedStyle(node).position)).toBe('fixed');
    }
  };
  await checkScroll(baseline, 'default');
  await button.click();
  await panel(page).getByRole('textbox').fill('Help with my resume facts.');
  await panel(page).getByRole('textbox').press('Enter');
  await expect(panel(page).getByText('Keep the resume facts you provided.', { exact: true })).toBeVisible();
  await panel(page).getByRole('button', { name: 'Collapse assistant', exact: true }).click();
  await expect(launcher(page)).toHaveAttribute('data-placement-ready', 'true');
  const box = (await launcher(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(110, 210, { steps: 16 });
  await expect.poll(() => robot(page).getAttribute('data-motion')).not.toBe('walking');
  await page.mouse.up();
  await expect(panel(page)).toHaveCount(0);
  const moved = (await launcher(page).boundingBox())!;
  expect(Math.hypot(moved.x - baseline.x, moved.y - baseline.y)).toBeGreaterThan(100);
  await checkScroll(moved, 'dragged');
  await page.evaluate(() => {
    (window as unknown as { companionNavigationSentinel: string }).companionNavigationSentinel = 'same-client-instance';
    // Non-scroll page changes must not trigger relocation either.
    document.querySelector('main')?.classList.add('companion-placement-test');
    document.querySelector('main')?.dispatchEvent(new Event('transitionend', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  const unchanged = (await launcher(page).boundingBox())!;
  expect(Math.abs(unchanged.x - moved.x)).toBeLessThan(.5);
  expect(Math.abs(unchanged.y - moved.y)).toBeLessThan(.5);
  await page.getByRole('link', { name: 'Create Resume', exact: true }).click();
  await expect(page).toHaveURL(/\/builder/);
  await expect(launcher(page)).toHaveAttribute('data-placement-ready', 'true');
  const reset = (await launcher(page).boundingBox())!;
  expect(Math.hypot(reset.x - moved.x, reset.y - moved.y)).toBeGreaterThan(100);
  expect(await page.evaluate(() => localStorage.getItem('sra_ai_launcher_pos'))).toBeNull();
  expect(await page.evaluate(() => (window as unknown as { companionNavigationSentinel: string }).companionNavigationSentinel)).toBe('same-client-instance');
  await button.click();
  await expect(panel(page).getByText('Keep the resume facts you provided.', { exact: true })).toBeVisible();
  await expect(panel(page).getByText('Help with my resume facts.', { exact: true })).toBeVisible();
  await panel(page).getByRole('button', { name: 'Collapse assistant', exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(launcher(page)).toHaveAttribute('data-placement-ready', 'true');
  const returned = (await launcher(page).boundingBox())!;
  expect(Math.abs(returned.x - baseline.x)).toBeLessThan(1);
  expect(Math.abs(returned.y - baseline.y)).toBeLessThan(1);
  const folder = path.join(process.cwd(), 'scripts/visual-qa/mascot/hover-fixed', info.project.name);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, 'placement-samples.json'), JSON.stringify({ baseline, moved, reset, returned, samples }, null, 2));
  await page.screenshot({ path: path.join(folder, 'default-launcher.png') });
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('hover repeats coordinated gestures, follows the pointer and respects real request/reduced-motion states', async ({ page, diagnostics }, info) => {
  await ready(page);
  const box = (await launcher(page).boundingBox())!;
  const left = { x: box.x + box.width * .2, y: box.y + box.height * .45 };
  await page.mouse.move(left.x, left.y);
  await expect(robot(page)).toHaveAttribute('data-motion', 'hover');
  const gaze = () => robot(page).locator('[data-rig="gaze"]').evaluate((node) => (node as SVGGElement).transform.baseVal.consolidate()!.matrix.e);
  await expect.poll(gaze).toBeLessThan(-1);
  await page.mouse.move(box.x + box.width * .8, left.y);
  await expect.poll(gaze).toBeGreaterThan(1);
  const poses: string[] = [];
  for (let index = 0; index < 7; index++) {
    await page.waitForTimeout(220);
    await expect(robot(page)).toHaveAttribute('data-motion', 'hover');
    poses.push((await robot(page).locator('[data-rig="leftArm"]').getAttribute('transform'))!);
    const held = (await launcher(page).boundingBox())!;
    expect(Math.abs(held.x - box.x)).toBeLessThan(.5);
    expect(Math.abs(held.y - box.y)).toBeLessThan(.5);
  }
  expect(new Set(poses).size).toBeGreaterThan(4);
  const folder = path.join(process.cwd(), 'scripts/visual-qa/mascot/hover-fixed', info.project.name);
  await mkdir(folder, { recursive: true });
  await launcher(page).screenshot({ path: path.join(folder, 'hover.png'), animations: 'allow' });
  await page.mouse.move(1, 1);
  await expect(robot(page)).toHaveAttribute('data-motion', 'idle');
  let release: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/chat', async (route) => { await gate; await route.fulfill({ json: { reply: 'Practice using your real experience.', provider: 'Isolated test' } }); });
  const button = page.getByRole('button', { name: /open ai assistant/i });
  await button.click();
  await panel(page).getByRole('textbox').fill('Help with an interview answer.');
  await panel(page).getByRole('textbox').press('Enter');
  await expect(panel(page)).toHaveAttribute('data-assistant-state', 'thinking');
  await panel(page).getByRole('button', { name: 'Collapse assistant', exact: true }).click();
  await page.mouse.move(left.x, left.y);
  await expect(robot(page)).toHaveAttribute('data-motion', 'thinking');
  release!();
  await expect(robot(page)).toHaveAttribute('data-motion', 'answering');
  await expect(robot(page)).toHaveAttribute('data-motion', 'hover');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(robot(page)).toHaveAttribute('data-active', '0');
  const canvas = launcher(page).locator('canvas');
  await page.waitForTimeout(150);
  const still = await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  await page.mouse.move(1, 1);
  await page.mouse.move(box.x + box.width * .8, left.y);
  await page.waitForTimeout(350);
  expect(await canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL())).toBe(still);
  expect(diagnostics.consoleErrors).toEqual([]);
});
