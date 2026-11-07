import { test as base, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

type BrowserDiagnostics = {
  consoleErrors: string[];
  failedRequests: string[];
  httpErrors: Array<{ status: number; url: string }>;
};

export const test = base.extend<{ diagnostics: BrowserDiagnostics }>({
  diagnostics: [async ({ page }, use, testInfo) => {
    const diagnostics: BrowserDiagnostics = { consoleErrors: [], failedRequests: [], httpErrors: [] };
    page.on('console', (message) => {
      if (message.type() === 'error') diagnostics.consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => diagnostics.consoleErrors.push(error.message));
    page.on('requestfailed', (request) => diagnostics.failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText ?? 'failed'}`));
    page.on('response', (response) => {
      if (response.status() >= 400) diagnostics.httpErrors.push({ status: response.status(), url: response.url() });
    });

    await use(diagnostics);

    const artifactName = `${testInfo.project.name}-${testInfo.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
    const screenshotPath = path.join(process.cwd(), 'test-results', 'screenshots', `${artifactName}.png`);
    const diagnosticsPath = path.join(process.cwd(), 'test-results', 'diagnostics', `${artifactName}.json`);
    await fs.mkdir(path.dirname(screenshotPath), { recursive: true });
    await fs.mkdir(path.dirname(diagnosticsPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, animations: 'disabled', caret: 'initial' }).catch(() => undefined);

    const pageState = await page.evaluate(() => ({
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      overflowElements: Array.from(document.querySelectorAll('body *')).map((element) => {
        const bounds = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || undefined,
          className: typeof element.className === 'string' ? element.className.slice(0, 120) : undefined,
          left: Math.round(bounds.left),
          right: Math.round(bounds.right),
          width: Math.round(bounds.width),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        };
      }).filter((element) => element.left < -1 || element.right > window.innerWidth + 1 || element.scrollWidth > element.clientWidth + 2).slice(0, 20),
      brokenImages: Array.from(document.images).filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
      fonts: { status: document.fonts.status, loaded: document.fonts.check('16px Geist') },
    })).catch(() => null);
    await fs.writeFile(diagnosticsPath, JSON.stringify({ title: testInfo.title, project: testInfo.project.name, diagnostics, pageState }, null, 2));
    await testInfo.attach('browser-diagnostics', { path: diagnosticsPath, contentType: 'application/json' });
    await testInfo.attach('viewport-screenshot', { path: screenshotPath, contentType: 'image/png' }).catch(() => undefined);

    expect(pageState?.horizontalOverflow, `Horizontal overflow: ${JSON.stringify(pageState)}`).toBe(false);
  }, { auto: true }],
});

export { expect };
