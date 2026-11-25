import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from './fixtures';

const states = ['idle', 'greeting', 'listening', 'thinking', 'answering', 'success', 'limited', 'error'];
const sizes = [24, 32, 56, 64, 96];
const outputRoot = path.join(process.cwd(), 'scripts', 'visual-qa', 'mascot', 'batch-a');
// Isolate the artwork from fixed app chrome; keep screenshot tools from changing input styles.
const artCapture = { caret: 'initial' as const, style: 'header,button[aria-label^="Open AI Assistant"],nextjs-portal{visibility:hidden!important}' };

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name === 'desktop-1440x900') await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/dev/style-guide', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Nimbus · AI Assistant avatar' })).toBeVisible();
  await page.getByTestId('nimbus-active-preview').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('nimbus-active-preview').locator('svg')).toHaveAttribute('data-active', '1');
});

test('Nimbus artwork, static size gallery and scoped colors', async ({ page, diagnostics }, testInfo) => {
  const gallery = page.getByTestId('nimbus-state-gallery');
  await expect(gallery.locator('svg')).toHaveCount(states.length * sizes.length);
  for (const state of states) {
    for (const size of sizes) {
      const sample = gallery.locator(`[data-mascot-sample="${state}"] [data-mascot-size="${size}"]`);
      await expect(sample.locator('svg')).toHaveAttribute('width', String(size));
      await expect(sample.locator('svg')).toHaveAttribute('height', String(size));
      await expect(sample.locator('svg')).toHaveAttribute('aria-hidden', 'true');
      await expect(sample.locator('svg')).toHaveAttribute('focusable', 'false');
    }
  }
  const colors = await gallery.locator('[data-mascot-sample="idle"] svg').first().evaluate((svg) => ({
    body: getComputedStyle(svg.querySelector('circle')!).fill,
    feet: getComputedStyle(svg.querySelector('rect[y="84"]')!).fill,
    screen: getComputedStyle(svg.querySelector('rect[y="44"]')!).fill,
    eyes: getComputedStyle(svg.querySelector('rect[y="55"]')!).fill,
    pageAccent: getComputedStyle(document.body).getPropertyValue('--color-accent').trim(),
  }));
  expect(colors).toEqual({ body: 'rgb(0, 113, 227)', feet: 'rgb(0, 91, 181)', screen: 'rgb(29, 29, 31)', eyes: 'rgb(143, 196, 255)', pageAccent: '#2211ff' });
  expect(await gallery.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(0);

  const viewport = page.viewportSize()!;
  const directory = path.join(outputRoot, `${viewport.width}x${viewport.height}`);
  await mkdir(directory, { recursive: true });
  await gallery.screenshot({ ...artCapture, path: path.join(directory, 'all-states-and-sizes.png'), animations: 'disabled' });
  if (testInfo.project.name === 'desktop-1440x900') {
    const stateDirectory = path.join(outputRoot, 'states');
    await mkdir(stateDirectory, { recursive: true });
    for (const state of states) for (const size of sizes) {
      await gallery.locator(`[data-mascot-sample="${state}"] [data-mascot-size="${size}"]`).screenshot({ ...artCapture, path: path.join(stateDirectory, `${state}-${size}.png`), animations: 'disabled' });
    }
  }
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('Nimbus has one continuous loop, pausable previews and no size shifts', async ({ page, diagnostics }) => {
  const preview = page.getByTestId('nimbus-active-preview');
  const viewport = page.viewportSize()!;
  const directory = path.join(outputRoot, `${viewport.width}x${viewport.height}`, 'motion');
  await mkdir(directory, { recursive: true });
  const originalBox = await preview.boundingBox();
  for (const state of states) {
    await page.getByRole('button', { name: state, exact: true }).click();
    await expect(preview).toHaveAttribute('data-state', state);
    await expect(preview.locator('svg')).toHaveAttribute('data-active', '1');
    const loops = await preview.locator('svg').evaluate((svg) => svg.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity && animation.playState === 'running').length);
    expect(loops).toBe(['idle', 'thinking', 'answering'].includes(state) ? 1 : 0);
    for (const [frame, delay] of [0, 150, 250].entries()) {
      if (delay) await page.waitForTimeout(delay);
      await preview.screenshot({ ...artCapture, path: path.join(directory, `${state}-${frame}.png`), animations: 'allow' });
    }
    const box = await preview.boundingBox();
    expect(box?.width).toBe(originalBox?.width);
    expect(box?.height).toBe(originalBox?.height);
  }
  await page.getByRole('button', { name: 'idle', exact: true }).click();
  await expect(preview.locator('svg')).toHaveAttribute('data-active', '1');
  await page.getByLabel('Pause mascot motion').check();
  expect(await preview.locator('svg').evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
  await page.getByLabel('Mascot preview size').selectOption('24');
  await expect(preview.locator('svg')).toHaveAttribute('width', '24');
  expect((await preview.boundingBox())?.height).toBe(originalBox?.height);
  await page.getByLabel('Pause mascot motion').uncheck();
  await expect(preview.locator('svg')).toHaveAttribute('data-active', '1');
  expect(await preview.locator('svg').evaluate((svg) => svg.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getTiming().iterations === Infinity).length)).toBe(1);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('Nimbus reduced motion keeps every pose static', async ({ page, diagnostics }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const preview = page.getByTestId('nimbus-active-preview');
  const viewport = page.viewportSize()!;
  const directory = path.join(outputRoot, `${viewport.width}x${viewport.height}`, 'reduced-motion');
  await mkdir(directory, { recursive: true });
  for (const state of states) {
    await page.getByRole('button', { name: state, exact: true }).click();
    await expect(preview).toHaveAttribute('data-state', state);
    expect(await preview.locator('svg').evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(0);
    await preview.screenshot({ ...artCapture, path: path.join(directory, `${state}.png`), animations: 'allow' });
  }
  await page.getByRole('button', { name: 'idle', exact: true }).click();
  await page.mouse.move(0, 0);
  await page.mouse.move(1200, 600);
  expect(await preview.locator('svg').evaluate((svg) => getComputedStyle(svg.querySelector('g g g')!).transform)).toBe('none');
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('Nimbus pauses outside the viewport and on page visibility events', async ({ page }) => {
  const preview = page.getByTestId('nimbus-active-preview');
  await expect(preview.locator('svg')).toHaveAttribute('data-active', '1');
  await page.getByRole('heading', { name: 'Motion and utility primitives', exact: true }).scrollIntoViewIfNeeded();
  await expect(preview.locator('svg')).toHaveAttribute('data-active', '');
  expect(await preview.locator('svg').evaluate((svg) => svg.getAnimations({ subtree: true }).length)).toBe(1);
  expect(await preview.locator('svg').evaluate((svg) => svg.getAnimations({ subtree: true }).every((animation) => animation.playState === 'paused'))).toBe(true);
  await preview.scrollIntoViewIfNeeded();
  await expect(preview.locator('svg')).toHaveAttribute('data-active', '1');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(preview.locator('svg')).toHaveAttribute('data-active', '');
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(preview.locator('svg')).toHaveAttribute('data-active', '1');
});

test('Nimbus tracks fine pointers within three pixels and ignores reduced motion', async ({ page }) => {
  const svg = page.getByTestId('nimbus-active-preview').locator('svg');
  await expect(svg).toHaveAttribute('data-active', '1');
  const fine = await page.evaluate(() => matchMedia('(pointer:fine)').matches);
  await page.mouse.move(0, 0);
  await page.mouse.move(page.viewportSize()!.width - 10, 10);
  if (fine) {
    await expect.poll(() => svg.evaluate((element) => element.style.getPropertyValue('--look'))).not.toBe('');
    const offset = await svg.evaluate((element) => {
      const value = element.style.getPropertyValue('--look').match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      return Math.max(...value.map(Math.abs));
    });
    expect(offset).toBeLessThanOrEqual(3);
  } else {
    expect(await svg.evaluate((element) => element.style.getPropertyValue('--look'))).toBe('');
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await svg.evaluate((element) => getComputedStyle(element.querySelector('g g g')!).transform)).toBe('none');
});
