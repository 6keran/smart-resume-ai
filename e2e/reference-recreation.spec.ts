import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from './fixtures';

const artifacts = path.join(process.cwd(), 'scripts/visual-qa/reference-recreation');

test('authentication pages retain forms in the editorial layout', async ({ page, diagnostics }, testInfo) => {
  const output = path.join(artifacts, testInfo.project.name);
  await mkdir(output, { recursive: true });
  for (const route of ['/login', '/register', '/admin/login']) {
    await page.goto(route);
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(650);
    await page.screenshot({ path: path.join(output, `${route.slice(1).replaceAll('/', '-')}.png`), caret: 'initial' });
  }
  expect(diagnostics.consoleErrors.filter((error) => !error.includes('401 (Unauthorized)'))).toEqual([]);
});

test('reference landing layout, motion, gallery, workflow and reduced motion', async ({ page, diagnostics }, testInfo) => {
  test.setTimeout(120_000);
  const output = path.join(artifacts, testInfo.project.name);
  await mkdir(output, { recursive: true });
  await page.goto('/');
  await expect(page.locator('#landing-hero-title')).toBeVisible();
  await expect.poll(() => page.locator('#landing-hero-title').evaluate((element) => {
    let opacity = 1;
    for (let current: Element | null = element; current; current = current.parentElement) opacity *= Number(getComputedStyle(current).opacity);
    return opacity;
  })).toBeGreaterThan(0.99);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(650);
  await page.screenshot({ path: path.join(output, 'landing-top.png'), caret: 'initial' });
  const stage = page.getByLabel('Example resume score timeline');
  await stage.scrollIntoViewIfNeeded();
  await expect.poll(() => stage.evaluate((element) => getComputedStyle(element, '::before').animationPlayState)).toBe('running');
  const pause = page.getByRole('button', { name: 'Pause example timeline' });
  await expect(pause).toBeVisible();
  await stage.getByRole('tab', { name: /Before/ }).click();
  await stage.getByRole('tab', { name: /After/ }).click();
  await page.waitForTimeout(80);
  await page.screenshot({ path: path.join(output, 'timeline-motion-1.png'), caret: 'initial' });
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(output, 'timeline-motion-2.png'), caret: 'initial' });
  await expect(stage.getByLabel('After overall ATS score 82 out of 100')).toBeVisible();
  const gallery = page.locator('#templates');
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    const capability = page.locator('a[class*="capabilityCard"]').first();
    await capability.hover();
    await expect(capability).toHaveCSS('translate', '0px -4px');
  }
  await gallery.getByRole('button', { name: 'Technical', exact: true }).click();
  await expect(gallery.locator('[data-template-category]').first()).toBeVisible();
  await expect.poll(() => gallery.locator('[data-template-category]').evaluateAll((items) => items.length > 0 && items.every((item) => item.getAttribute('data-template-category') === 'Technical'))).toBe(true);
  await gallery.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('button', { name: 'Bring your resume', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Keep what you already have.' })).toBeVisible();
  await page.getByRole('button', { name: /How does the deterministic ATS scoring work/ }).click();
  await expect(page.locator('#landing-faq-0')).toHaveAttribute('data-open', 'true');
  // Reveal every section before a full-page capture; the native scroll remains observable.
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight * .7) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((resolve) => setTimeout(resolve, 160));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(650);
  await page.addStyleTag({ content: 'nextjs-portal{display:none} header[class*="landingHeader"]{position:relative;top:0}' });
  await page.screenshot({ path: path.join(output, 'landing-full.png'), fullPage: true, caret: 'initial' });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await expect(page.locator('#landing-hero-title')).toBeVisible();
  await stage.scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Pause example timeline' })).toHaveCount(0);
  expect(await stage.evaluate((element) => getComputedStyle(element, '::before').animationName)).toBe('none');
  await page.screenshot({ path: path.join(output, 'landing-reduced-motion.png'), caret: 'initial' });
  // Existing guest ResumeProvider probes protected reads before knowing the session.
  // Keep that behavior within this styling task; flag every other browser error.
  expect(diagnostics.httpErrors.filter((error) => !(error.status === 401 && error.url.includes('/api/user/resumes')))).toEqual([]);
  expect(diagnostics.consoleErrors.filter((error) => !error.includes('401 (Unauthorized)'))).toEqual([]);
});

test.describe('authenticated reference surfaces', () => {
  test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });
  test('interview practice enters the night stage and evaluates an answer', async ({ page, diagnostics }, testInfo) => {
    await page.goto('/interview-prep');
    await page.getByPlaceholder('e.g. Senior Full Stack Developer').fill('Frontend Developer');
    await page.getByRole('button', { name: 'Start 5-Question Interview Session' }).click();
    const stage = page.locator('.reference-interview-stage');
    await expect(stage).toBeVisible();
    await page.getByLabel('Your Answer', { exact: true }).fill('I would clarify the requirements, describe the component boundaries and use typed interfaces. I would implement a small accessible component, test keyboard navigation and loading states, and check the result on desktop and mobile before reviewing the change.');
    await page.getByRole('button', { name: 'Submit for AI Evaluation' }).click();
    await expect(page.getByText('AI Evaluator Score', { exact: true })).toBeVisible();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(artifacts, testInfo.project.name, 'interview-evaluation.png'), caret: 'initial' });
    await page.getByRole('button', { name: 'Next Question', exact: true }).click();
    await expect(page.getByLabel('Your Answer', { exact: true })).toBeVisible();
    expect(diagnostics.consoleErrors).toEqual([]);
  });
  test('every major workspace and record page renders responsively without console errors', async ({ page, diagnostics }, testInfo) => {
    test.setTimeout(240_000);
    const output = path.join(artifacts, testInfo.project.name);
    await mkdir(output, { recursive: true });
    const routes = ['/dashboard', '/builder', '/ats-score', '/analyzer', '/improver', '/jobs', '/job-match', '/interview-prep', '/skills', '/projects', '/guidance', '/dashboard/profile', '/dashboard/my-data', '/dashboard/applications', '/dashboard/resumes', '/dashboard/analyses', '/dashboard/improvements', '/dashboard/jobs', '/dashboard/skills', '/dashboard/assessments', '/dashboard/certificates', '/dashboard/courses'];
    for (const route of routes) {
      const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
      expect(response?.status(), route).toBeLessThan(400);
      await expect(page.locator('h1,h2').first(), route).toBeVisible();
      await page.waitForTimeout(650);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), route).toBe(false);
      await page.screenshot({ path: path.join(output, `${route.slice(1).replaceAll('/', '-')}.png`), caret: 'initial' });
    }
    await page.goto('/dashboard');
    if ((page.viewportSize()?.width ?? 1440) < 1024) {
      await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Close menu', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Close menu', exact: true }).click();
    }
    await page.getByRole('button', { name: /open ai assistant/i }).click();
    const assistant = page.getByRole('dialog', { name: /smart resume ai assistant/i });
    await expect(assistant).toBeVisible();
    await assistant.screenshot({ path: path.join(output, 'career-copilot.png'), caret: 'initial' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dashboard/profile');
    await page.waitForTimeout(650);
    expect(await page.locator('.reference-experience').evaluate((element) => element.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length)).toBe(0);
    expect(diagnostics.consoleErrors).toEqual([]);
  });

  test('admin operations surfaces preserve authentication, tables and navigation', async ({ page, diagnostics }, testInfo) => {
    test.setTimeout(180_000);
    const login = await page.request.post('/api/admin/auth/login', { data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    expect(login.status()).toBe(200);
    const output = path.join(artifacts, testInfo.project.name);
    await mkdir(output, { recursive: true });
    for (const route of ['dashboard', 'users', 'resumes', 'skills', 'assessments', 'jobs', 'job-matches', 'feedback', 'settings', 'proctoring']) {
      const response = await page.goto(`/admin/${route}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator('h1,h2').first()).toBeVisible();
      await page.waitForTimeout(650);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), route).toBe(false);
      await page.screenshot({ path: path.join(output, `admin-${route}.png`), caret: 'initial' });
    }
    expect(diagnostics.consoleErrors).toEqual([]);
  });
});
