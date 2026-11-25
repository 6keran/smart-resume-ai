import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const FRAME_DELAYS = [0, 100, 240] as const;

async function captureFrames(page: Page, locator: Locator, outputDir: string) {
  await mkdir(outputDir, { recursive: true });
  for (let index = 0; index < FRAME_DELAYS.length; index += 1) {
    const delay = FRAME_DELAYS[index];
    if (delay > 0) await page.waitForTimeout(delay);
    await locator.screenshot({ path: path.join(outputDir, `frame-${index + 1}.png`) });
  }
}

async function captureReducedMotion(locator: Locator, outputDir: string) {
  await mkdir(outputDir, { recursive: true });
  await locator.scrollIntoViewIfNeeded();
  await locator.screenshot({ path: path.join(outputDir, 'reduced-motion.png') });
}

async function capturePageFrames(page: Page, outputDir: string) {
  await mkdir(outputDir, { recursive: true });
  for (let index = 0; index < FRAME_DELAYS.length; index += 1) {
    const delay = FRAME_DELAYS[index];
    if (delay > 0) await page.waitForTimeout(delay);
    await page.screenshot({ path: path.join(outputDir, `frame-${index + 1}.png`) });
  }
}

async function hideCaptureOnlyChrome(page: Page) {
  await page.addStyleTag({
    content: [
      'nextjs-portal { display: none !important; }',
      'header[class*="landingHeader"] { position: relative !important; top: auto !important; }',
    ].join('\n'),
  });
}

async function captureStableFullPage(page: Page, outputPath: string) {
  await page.evaluate(async () => {
    const step = Math.max(320, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 240));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: outputPath, fullPage: true });
}

test('landing batch 3 real-score timeline and evidence motion', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(
    !['mobile-390x844', 'desktop-1440x900'].includes(testInfo.project.name),
    'Score-surface captures use the requested mobile and desktop viewports.',
  );

  if (testInfo.project.name === 'desktop-1440x900') {
    await page.setViewportSize({ width: 1366, height: 768 });
  }
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Playwright project must define a viewport.');
  const outputDir = path.join(
    process.cwd(),
    'scripts',
    'visual-qa',
    'landing',
    'batch-3',
    `${viewport.width}x${viewport.height}`,
    'motion',
  );

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /build a resume for the job you want/i })).toBeVisible();
  const headerBox = await page.locator('header[class*="landingHeader"]').boundingBox();
  const heroBox = await page.locator('section[aria-labelledby="landing-hero-title"]').boundingBox();
  expect(headerBox).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(heroBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);
  await hideCaptureOnlyChrome(page);

  const hero = page.locator('section[aria-labelledby="landing-hero-title"]');
  const pauseTimeline = hero.getByRole('button', { name: 'Pause example timeline' });
  if (await pauseTimeline.isVisible()) await pauseTimeline.click();
  await hero.getByRole('tab', { name: /Before/ }).click();
  await expect(hero.getByLabel('Before overall ATS score 79 out of 100')).toBeVisible();
  await hero.scrollIntoViewIfNeeded();
  await hero.getByRole('tab', { name: /After/ }).click();
  await captureFrames(page, hero, path.join(outputDir, 'hero-real-score-timeline'));

  const evidence = page.locator('section[aria-labelledby="scored-by-rules-heading"]');
  await evidence.getByRole('button', { name: 'After', exact: true }).click();
  await expect(evidence.getByText('After draft')).toBeVisible();
  await evidence.scrollIntoViewIfNeeded();
  await evidence.getByRole('tab', { name: 'Result' }).click();
  await captureFrames(page, evidence, path.join(outputDir, 'section-02-real-score-result'));
  await expect(evidence.getByLabel('After overall ATS score 82 out of 100')).toBeVisible();
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
  await captureStableFullPage(page, path.join(path.dirname(outputDir), 'full-page.png'));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await hideCaptureOnlyChrome(page);

  const reducedHero = page.locator('section[aria-labelledby="landing-hero-title"]');
  await expect(reducedHero.getByRole('button', { name: /example timeline/i })).toHaveCount(0);
  await reducedHero.getByRole('tab', { name: /After/ }).click();
  await captureReducedMotion(reducedHero, path.join(outputDir, 'hero-real-score-timeline'));

  const reducedEvidence = page.locator('section[aria-labelledby="scored-by-rules-heading"]');
  await reducedEvidence.getByRole('button', { name: 'After', exact: true }).click();
  await reducedEvidence.getByRole('tab', { name: 'Result' }).click();
  await captureReducedMotion(reducedEvidence, path.join(outputDir, 'section-02-real-score-result'));
});

test('landing batch 3 drawer motion at compact widths', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  test.skip(
    !['mobile-375x812', 'mobile-390x844', 'tablet-768x1024'].includes(testInfo.project.name),
    'Drawer captures cover 375, 390, and 768 pixel widths.',
  );

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Playwright project must define a viewport.');
  const outputDir = path.join(
    process.cwd(),
    'scripts',
    'visual-qa',
    'landing',
    'batch-3',
    `${viewport.width}x${viewport.height}`,
    'motion',
    'mobile-drawer',
  );

  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await hideCaptureOnlyChrome(page);
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  const dialog = page.getByRole('dialog', { name: 'Product' });
  await expect(dialog).toBeVisible();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  expect(dialogBox!.height).toBeLessThanOrEqual(viewport.height + 1);
  await capturePageFrames(page, outputDir);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await hideCaptureOnlyChrome(page);
  await page.getByRole('button', { name: 'Open navigation menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Product' })).toBeVisible();
  await page.screenshot({ path: path.join(outputDir, 'reduced-motion.png') });
});
