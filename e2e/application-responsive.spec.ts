import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { type Page } from '@playwright/test';
import { expect, test } from './fixtures';

const phase = process.env.RESPONSIVE_AUDIT_PHASE || 'after';
// A route sweep already captures stills/measurements; full traces and videos grow with every page.
test.use({ video: 'off', trace: 'off' });
const root = path.join(process.cwd(), 'scripts/visual-qa/responsive-speed', phase);
const publicRoutes = ['/', '/login', '/register', '/faq', '/privacy', '/terms', '/ats-score'];
const memberRoutes = ['/dashboard', '/builder', '/analyzer', '/improver', '/job-match', '/jobs', '/interview-prep', '/skills', '/projects', '/guidance', '/onboarding',
  '/dashboard/resumes', '/dashboard/analyses', '/dashboard/improvements', '/dashboard/jobs', '/dashboard/applications', '/dashboard/skills', '/dashboard/assessments', '/dashboard/certificates', '/dashboard/courses', '/dashboard/profile', '/dashboard/my-data'];
const adminRoutes = ['/admin/dashboard', '/admin/users', '/admin/resumes', '/admin/analyses', '/admin/jobs', '/admin/job-matches', '/admin/skills', '/admin/assessments', '/admin/proctoring', '/admin/feedback', '/admin/settings'];

async function inspect(page: Page, routes: string[], viewport: string) {
  const results = [];
  const folder = path.join(root, viewport);
  await mkdir(folder, { recursive: true });
  for (const route of routes) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.locator('main h1, main h2, main input, main [role="alert"]').first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined);
    await page.waitForTimeout(400);
    const measure = () => page.evaluate(() => {
      const width = innerWidth;
      const outside = Array.from(document.querySelectorAll<HTMLElement>('main *, header *')).flatMap((element) => {
        if (element.closest('.a4-sheet, .a4-page, [data-resume-document], #resume-a4-document, .resume-preview-viewport, [aria-hidden="true"], [role="dialog"], nextjs-portal')) return [];
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (!rect.width || !rect.height || rect.bottom < 0 || rect.top > innerHeight || style.visibility === 'hidden' || style.display === 'none' || style.position === 'absolute') return [];
        if (element.closest('.overflow-x-auto, .overflow-auto, [role="tablist"]')) return [];
        if (rect.left >= -1 && rect.right <= width + 1) return [];
        return [{ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 70), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) }];
      }).slice(0, 15);
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      return { url: location.pathname, width, documentWidth: document.documentElement.scrollWidth, outside,
        scriptBytes: resources.filter((entry) => entry.initiatorType === 'script').reduce((sum, entry) => sum + entry.encodedBodySize, 0),
        scripts: resources.filter((entry) => entry.initiatorType === 'script').map((entry) => ({ name: entry.name.split('/').pop(), bytes: entry.encodedBodySize })),
        header: document.querySelector('header')?.getBoundingClientRect().height };
    });
    const top = await measure();
    await page.screenshot({ path: path.join(folder, `${route.replace(/\W+/g, '-') || 'home'}-top.png`), animations: 'disabled' });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(200);
    const bottom = await measure();
    results.push({ route, top, bottom });
  }
  await writeFile(path.join(folder, `${routes === publicRoutes ? 'public' : routes === adminRoutes ? 'admin' : 'member'}.json`), JSON.stringify(results, null, 2));
  if (phase !== 'before') {
    for (const result of results) {
      expect(result.top.url, `Route ${result.route} unexpectedly redirected`).toBe(result.route);
      expect(result.top.documentWidth, `${result.route} page overflow`).toBeLessThanOrEqual(result.top.width + 1);
      expect(result.top.outside, `${result.route} top content extends outside the screen`).toEqual([]);
      expect(result.bottom.outside, `${result.route} bottom content extends outside the screen`).toEqual([]);
    }
  }
}

for (const [name, routes] of [['public', publicRoutes], ['member', memberRoutes], ['admin', adminRoutes]] as const) {
  test(`${name} pages adapt to the screen and record loading costs`, async ({ page, context }, info) => {
    test.setTimeout(240000);
    if (name === 'member') {
      const state = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(process.env.E2E_STORAGE_STATE_PATH!, 'utf8')));
      await context.addCookies(state.cookies);
    }
    if (name === 'admin') {
      const response = await context.request.post('/api/admin/auth/login', { data: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
      expect(response.status()).toBe(200);
    }
    await page.addInitScript(() => localStorage.setItem('sra_nimbus_greeting_shown', '1'));
    // The smallest phone and landscape widths supplement the standard project sizes.
    const sizes = info.project.name === 'mobile-375x812' ? [{ width: 320, height: 740 }, { width: 375, height: 812 }]
      : info.project.name === 'tablet-768x1024' ? [{ width: 768, height: 1024 }, { width: 1024, height: 768 }]
        : [page.viewportSize()!];
    for (const size of sizes) {
      await page.setViewportSize(size);
      await inspect(page, routes, `${size.width}x${size.height}`);
    }
  });
}
