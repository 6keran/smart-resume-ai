import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';

const FRAME_DELAYS = [0, 90, 220] as const;

async function captureFrames(page: Page, locator: Locator, outputDir: string) {
  await mkdir(outputDir, { recursive: true });
  await locator.scrollIntoViewIfNeeded();
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

async function revealWholePage(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(320, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => window.setTimeout(resolve, 240));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(250);
}

async function captureStableFullPage(page: Page, outputPath: string) {
  await revealWholePage(page);
  await page.addStyleTag({
    content: 'header[class*="landingHeader"] { position: relative !important; top: auto !important; }',
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(100);
  await page.screenshot({ path: outputPath, fullPage: true });
}

test('landing batch 2 full-page and motion QA', async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  const isMobile = testInfo.project.name === 'mobile-390x844';
  const viewport = isMobile ? { width: 390, height: 844 } : { width: 1366, height: 768 };
  const viewportName = `${viewport.width}x${viewport.height}`;
  const outputDir = path.join(process.cwd(), 'scripts', 'visual-qa', 'landing', 'batch-2', viewportName);
  const motionDir = path.join(outputDir, 'motion');

  await mkdir(outputDir, { recursive: true });
  await page.setViewportSize(viewport);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

  const hero = page.locator('section[aria-labelledby="landing-hero-title"]');
  const howItWorks = page.locator('section[aria-labelledby="how-it-works-heading"]');
  const scoredByRules = page.locator('section[aria-labelledby="scored-by-rules-heading"]');
  const numbers = page.locator('section[aria-labelledby="product-numbers-heading"]');

  await expect(page.getByRole('heading', { name: /build a resume for the job you want/i })).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(247, 246, 242)');

  await captureFrames(page, hero, path.join(motionDir, 'hero-entrance'));
  await captureFrames(page, howItWorks, path.join(motionDir, 'how-it-works-reveal'));
  await captureFrames(page, scoredByRules, path.join(motionDir, 'scored-by-rules-reveal'));

  await page.getByRole('tab', { name: 'Result' }).click();
  await captureFrames(page, scoredByRules, path.join(motionDir, 'scored-result-tab'));
  await captureFrames(page, numbers, path.join(motionDir, 'numbers-reveal'));

  if (isMobile) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    const drawer = page.getByRole('navigation', { name: 'Mobile navigation' });
    await captureFrames(page, drawer, path.join(motionDir, 'mobile-drawer'));
    await page.getByRole('button', { name: 'Close navigation menu' }).last().click();
  }

  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);
  await captureStableFullPage(page, path.join(outputDir, 'full-page.png'));

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

  const reducedHero = page.locator('section[aria-labelledby="landing-hero-title"]');
  const reducedHow = page.locator('section[aria-labelledby="how-it-works-heading"]');
  const reducedRules = page.locator('section[aria-labelledby="scored-by-rules-heading"]');
  const reducedNumbers = page.locator('section[aria-labelledby="product-numbers-heading"]');

  await captureReducedMotion(reducedHero, path.join(motionDir, 'hero-entrance'));
  await captureReducedMotion(reducedHow, path.join(motionDir, 'how-it-works-reveal'));
  await captureReducedMotion(reducedRules, path.join(motionDir, 'scored-by-rules-reveal'));
  await page.getByRole('tab', { name: 'Result' }).click();
  await captureReducedMotion(reducedRules, path.join(motionDir, 'scored-result-tab'));
  await captureReducedMotion(reducedNumbers, path.join(motionDir, 'numbers-reveal'));

  if (isMobile) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await captureReducedMotion(
      page.getByRole('navigation', { name: 'Mobile navigation' }),
      path.join(motionDir, 'mobile-drawer'),
    );
  }
});

test('landing batch 2 missing viewport and navigation QA', async ({ page }, testInfo) => {
  test.setTimeout(120_000);

  const viewport = page.viewportSize();
  if (!viewport) throw new Error('Playwright project must define a viewport.');

  const supportedProjects = new Set([
    'mobile-390x844',
    'tablet-768x1024',
    'desktop-1440x900',
  ]);
  test.skip(!supportedProjects.has(testInfo.project.name), 'Only the requested Batch 2 QA viewports are captured.');

  const viewportName = `${viewport.width}x${viewport.height}`;
  const outputDir = path.join(process.cwd(), 'scripts', 'visual-qa', 'landing', 'batch-2', viewportName);
  await mkdir(outputDir, { recursive: true });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  await page.waitForTimeout(350);

  const header = page.locator('header[class*="landingHeader"]');
  const hero = page.locator('section[aria-labelledby="landing-hero-title"]');
  const headerBox = await header.boundingBox();
  const heroBox = await hero.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(heroBox).not.toBeNull();
  expect(heroBox!.y).toBeGreaterThanOrEqual(headerBox!.y + headerBox!.height - 1);

  if (testInfo.project.name === 'desktop-1440x900') {
    await page.getByRole('button', { name: 'Product' }).click();
    await expect(page.locator('#landing-product-menu')).toBeVisible();
    await page.screenshot({ path: path.join(outputDir, 'product-mega-menu-open.png') });
    await page.getByRole('button', { name: 'Product' }).click();
  }

  if (testInfo.project.name === 'mobile-390x844') {
    await page.getByRole('button', { name: 'Open navigation menu' }).click();
    await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
    await page.screenshot({ path: path.join(outputDir, 'mobile-drawer-open.png') });
    await page.getByRole('button', { name: 'Close navigation menu' }).last().click();
  }

  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);

  if (testInfo.project.name !== 'mobile-390x844') {
    await captureStableFullPage(page, path.join(outputDir, 'full-page.png'));
  }
});
