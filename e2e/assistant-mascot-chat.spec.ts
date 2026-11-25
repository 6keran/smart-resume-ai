import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';
import { expect, test } from './fixtures';

const greetingKey = 'sra_nimbus_greeting_shown';
const output = path.join(process.cwd(), 'scripts', 'visual-qa', 'mascot', 'batch-b');
test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

async function viewports(page: Page, info: TestInfo, run: (label: string) => Promise<void>) {
  const sizes = info.project.name === 'desktop-1440x900'
    ? [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]
    : [page.viewportSize()!];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await run(`${size.width}x${size.height}`);
  }
}
async function ready(page: Page, route = '/dashboard', navigate = true) {
  if (navigate) await page.goto(route, { waitUntil: 'domcontentloaded' });
  const launcher = page.getByRole('button', { name: /open ai assistant/i });
  await expect(launcher).toBeVisible();
  const reduced = await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  await expect(launcher.locator('svg')).toHaveAttribute('data-active', reduced ? '0' : '1');
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity).length)).toBe(0);
  await expect(page.locator('[data-assistant-mode="collapsed"]')).toHaveAttribute('data-placement-ready', 'true');
  await expect.poll(async () => Math.round((await launcher.boundingBox())?.width || 0)).toBe(page.viewportSize()!.width < 640 ? 72 : 80);
  return launcher;
}
async function capture(page: Page, label: string, name: string) {
  const directory = path.join(output, label);
  await mkdir(directory, { recursive: true });
  await page.screenshot({ path: path.join(directory, `${name}.png`), animations: 'allow', caret: 'initial', style: 'nextjs-portal{visibility:hidden!important}' });
}
const panel = (page: Page) => page.getByRole('dialog', { name: 'Smart Resume AI Assistant', exact: true });

test('Nimbus chat states, real copy feedback, history and session greeting', async ({ page, context, diagnostics }, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  let release: (() => void) | undefined;
  let gate = new Promise<void>((resolve) => { release = resolve; });
  const requests: Array<{ message: string; history: Array<{ role: string; content: string }>; context: { currentPath: string; activeWorkflow: string } }> = [];
  const answer = 'Use facts from your resume to explain your experience, then practice one interview answer.';
  await page.route('**/api/chat', async (route) => {
    requests.push(route.request().postDataJSON());
    await gate;
    await route.fulfill({ json: { reply: answer, provider: 'Local browser test', isLive: true } });
  });
  await viewports(page, info, async (label) => {
    requests.length = 0;
    gate = new Promise<void>((resolve) => { release = resolve; });
    const launcher = await ready(page);
    await launcher.focus(); await launcher.press('Enter');
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'greeting');
    await expect(panel(page).getByRole('heading', { name: 'Career Copilot', exact: true })).toBeVisible();
    await expect(panel(page).getByText('AI Assistant', { exact: true })).toBeVisible();
    await expect(panel(page).locator('[data-nimbus-welcome] svg')).toHaveAttribute('width', '96');
    await expect(panel(page).locator('[data-nimbus-header] svg')).toHaveAttribute('width', '32');
    await capture(page, label, 'welcome');
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'idle');
    const input = panel(page).getByRole('textbox');
    await input.fill('Help me prepare for interviews.');
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'listening');
    await input.press('Enter');
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'thinking');
    await expect(panel(page).getByRole('status', { name: 'Career Copilot is typing' })).toBeVisible();
    const thinkingCharacter = panel(page).getByRole('status', { name: 'Career Copilot is typing' }).locator('[data-companion-state="thinking"]');
    await expect(thinkingCharacter).toHaveAttribute('data-active', '1');
    const firstThinkingFrame = await thinkingCharacter.getAttribute('data-frame');
    await expect.poll(() => thinkingCharacter.getAttribute('data-frame')).not.toBe(firstThinkingFrame);
    await capture(page, label, 'thinking');
    release!();
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'answering');
    await expect(panel(page).getByText(answer, { exact: true })).toBeVisible();
    await capture(page, label, 'answering');
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'idle');
    expect(requests[0]).toMatchObject({ message: 'Help me prepare for interviews.', history: [], context: { currentPath: '/dashboard', activeWorkflow: 'career_command_center' } });
    expect(Object.keys(requests[0]).sort()).toEqual(['context', 'history', 'message']);
    expect(await panel(page).locator('[data-nimbus-message]').evaluateAll((elements) => elements.every((element) => element.getAnimations({ subtree: true }).length === 0))).toBe(true);
    await panel(page).getByRole('button', { name: 'Copy assistant answer', exact: true }).last().click();
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'success');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(answer);
    await capture(page, label, 'copied');
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'idle');
    await input.fill('Which skills should I practice next?'); await input.press('Enter');
    await expect.poll(() => requests.length).toBe(2);
    expect(requests[1].history).toEqual([{ role: 'user', content: requests[0].message }, { role: 'assistant', content: answer }]);
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'idle');
    await panel(page).getByRole('button', { name: 'Collapse assistant', exact: true }).click();
    await expect(launcher).toBeVisible();
    await launcher.focus(); await launcher.press('Space');
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'idle');
    await expect(panel(page).getByText(answer, { exact: true })).toHaveCount(2);
  });
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('first-visit bubble persists dismissal and stays off modal overlays', async ({ page, diagnostics }, info) => {
  await viewports(page, info, async (label) => {
    await ready(page);
    await page.evaluate((key) => localStorage.removeItem(key), greetingKey);
    await page.reload({ waitUntil: 'domcontentloaded' });
    const bubble = page.getByRole('complementary', { name: 'AI Assistant greeting' });
    await expect(bubble).toBeVisible();
    await expect(panel(page)).toHaveCount(0);
    await capture(page, label, 'first-visit-bubble');
    await bubble.getByRole('button', { name: 'Dismiss assistant greeting' }).click();
    await expect(bubble).toHaveCount(0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('button', { name: /open ai assistant/i })).toBeVisible();
    await expect(bubble).toHaveCount(0);
    await page.evaluate(() => {
      const dialog = document.createElement('dialog');
      dialog.id = 'mascot-modal-check'; dialog.textContent = 'Modal visibility check'; document.body.append(dialog); dialog.showModal();
    });
    await expect(page.getByRole('button', { name: /open ai assistant/i })).toHaveCount(0);
    await expect(bubble).toHaveCount(0);
    await page.evaluate(() => document.querySelector<HTMLDialogElement>('#mascot-modal-check')!.close());
    await expect(page.getByRole('button', { name: /open ai assistant/i })).toBeVisible();
    await expect(bubble).toHaveCount(0);
    await page.evaluate(() => document.querySelector('#mascot-modal-check')!.remove());
  });
  expect(diagnostics.consoleErrors).toEqual([]);
});

for (const mode of ['read', 'write']) test(`blocked greeting storage (${mode}) suppresses the optional bubble`, async ({ page, diagnostics }, info) => {
  await page.addInitScript(({ key, mode }) => {
    const read = Storage.prototype.getItem;
    const write = Storage.prototype.setItem;
    if (mode === 'read') Storage.prototype.getItem = function (name) {
      if (name === key) throw new DOMException('Storage blocked', 'SecurityError');
      return read.call(this, name);
    };
    else Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Storage blocked', 'SecurityError');
      write.call(this, name, value);
    };
  }, { key: greetingKey, mode });
  await viewports(page, info, async () => {
    const launcher = await ready(page);
    await expect(page.locator('[data-nimbus-greeting]')).toHaveCount(0);
    await launcher.click();
    await expect(panel(page)).toBeVisible();
  });
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('launcher keyboard/pointer movement persists and panel dragging still works', async ({ page, diagnostics }, info) => {
  await viewports(page, info, async () => {
    const launcher = await ready(page);
    const bubble = page.getByRole('button', { name: 'Dismiss assistant greeting' });
    if (await bubble.isVisible()) await bubble.click();
    await launcher.focus(); await launcher.press('Home');
    await expect(page.locator('[data-assistant-mode="collapsed"]')).toHaveAttribute('data-placement-ready', 'true');
    const before = (await launcher.boundingBox())!;
    await launcher.press('ArrowLeft'); await launcher.press('ArrowUp');
    // The larger full-body pet may settle away from a page control after a keyboard nudge.
    await expect(page.locator('[data-assistant-mode="collapsed"]')).toHaveAttribute('data-placement-ready', 'true');
    const moved = (await launcher.boundingBox())!;
    expect(Math.hypot(moved.x - before.x, moved.y - before.y)).toBeGreaterThan(0);
    expect(moved.x).toBeGreaterThanOrEqual(16);
    expect(moved.y).toBeGreaterThanOrEqual(16);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sra_ai_launcher_pos')!));
    expect(Math.round(saved.x)).toBe(Math.round(moved.x));
    expect(Math.round(saved.y)).toBe(Math.round(moved.y));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await ready(page);
    await expect.poll(async () => Math.round((await launcher.boundingBox())!.x)).toBe(Math.round(moved.x));
    await expect.poll(async () => Math.round((await launcher.boundingBox())!.y)).toBe(Math.round(moved.y));
    const start = (await launcher.boundingBox())!;
    await page.mouse.move(start.x + 28, start.y + 28); await page.mouse.down();
    await page.mouse.move(start.x - 20, start.y - 20, { steps: 8 }); await page.mouse.up();
    await expect(panel(page)).toHaveCount(0);
    await launcher.focus(); await launcher.press('Enter');
    await expect(panel(page)).toBeVisible();
    if (page.viewportSize()!.width >= 640) {
      const title = (await panel(page).getByRole('heading', { name: 'Career Copilot' }).boundingBox())!;
      const oldBox = (await panel(page).boundingBox())!;
      await page.mouse.move(title.x + title.width / 2, title.y + title.height / 2); await page.mouse.down();
      await page.mouse.move(title.x + title.width / 2 - 40, title.y + title.height / 2 + 20, { steps: 8 }); await page.mouse.up();
      await expect.poll(async () => Math.round((await panel(page).boundingBox())!.x)).not.toBe(Math.round(oldBox.x));
    }
  });
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('abort and retry keep existing message handling', async ({ page, diagnostics }, info) => {
  await viewports(page, info, async () => {
    let calls = 0;
    await page.route('**/api/chat', async (route) => {
      calls++;
      if (calls === 1) await route.fulfill({ status: 502, json: { message: 'Temporary local test failure' } });
      else if (calls === 2) await route.fulfill({ json: { reply: 'Review the resume facts you provided.', provider: 'Local browser test' } });
      else {
        await new Promise((resolve) => setTimeout(resolve, 800));
        await route.fulfill({ json: { reply: 'This canceled answer must not appear.' } }).catch(() => {});
      }
    });
    const launcher = await ready(page); await launcher.click();
    const input = panel(page).getByRole('textbox');
    await input.fill('Help me review a resume.'); await input.press('Enter');
    await expect(panel(page).getByRole('alert')).toContainText('Temporary local test failure');
    await panel(page).getByRole('button', { name: 'Retry', exact: true }).click();
    await expect(panel(page).getByText('Review the resume facts you provided.', { exact: true })).toBeVisible();
    await expect(panel(page).getByText('Help me review a resume.', { exact: true })).toHaveCount(1);
    await input.fill('Cancel this request.'); await input.press('Enter');
    await panel(page).getByRole('button', { name: 'Stop generating response', exact: true }).click();
    await expect(panel(page).getByRole('button', { name: 'Send message', exact: true })).toBeVisible();
    await page.waitForTimeout(850);
    await expect(panel(page).getByText('This canceled answer must not appear.', { exact: true })).toHaveCount(0);
    await page.unroute('**/api/chat');
  });
  const expected502 = 'Failed to load resource: the server responded with a status of 502 (Bad Gateway)';
  expect(diagnostics.consoleErrors.filter((message) => message === expected502)).toHaveLength(info.project.name === 'desktop-1440x900' ? 2 : 1);
  expect(diagnostics.consoleErrors.filter((message) => message !== expected502)).toEqual([]);
});

test('launcher is clear of visible controls on major pages at the top and bottom', async ({ page, diagnostics }, info) => {
  test.setTimeout(180_000);
  await page.route('**/api/jobs/**', (route) => route.fulfill({ json: { jobs: [], suggestions: [], total: 0, success: true } }));
  await viewports(page, info, async (label) => {
    for (const route of ['/dashboard', '/builder', '/jobs', '/analyzer', '/onboarding']) {
      const launcher = await ready(page, route);
      const dismiss = page.getByRole('button', { name: 'Dismiss assistant greeting' });
      if (await dismiss.isVisible()) await dismiss.click();
      for (const scroll of ['top', 'bottom']) {
        await page.evaluate((bottom) => window.scrollTo(0, bottom ? document.documentElement.scrollHeight : 0), scroll === 'bottom');
        await expect.poll(() => page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running' && animation.effect?.getTiming().iterations !== Infinity).length)).toBe(0);
        await expect(page.locator('[data-assistant-mode="collapsed"]')).toHaveAttribute('data-placement-ready', 'true');
        const overlaps = await launcher.evaluate((button) => {
          const launcher = button.getBoundingClientRect();
          return Array.from(document.querySelectorAll<HTMLElement>('main button, main input, main textarea, main select, main a[href]')).filter((element) => {
            if (element.closest('[data-assistant-mode]')) return false;
            const box = element.getBoundingClientRect();
            const style = getComputedStyle(element);
            if (!box.width || !box.height || style.visibility === 'hidden' || style.display === 'none' || box.top >= innerHeight || box.bottom <= 0) return false;
            return box.left < launcher.right && box.right > launcher.left && box.top < launcher.bottom && box.bottom > launcher.top;
          }).map((element) => element.getAttribute('aria-label') || element.textContent?.trim().slice(0, 80) || element.tagName);
        });
        expect(overlaps, `${route} ${label} ${scroll}`).toEqual([]);
      }
      await capture(page, label, `launcher-${route.slice(1)}`);
    }
  });
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('reduced motion remains static through greeting, thinking and answer', async ({ page, diagnostics }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await viewports(page, info, async (label) => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/chat', async (route) => { await gate; await route.fulfill({ json: { reply: 'Use your confirmed resume facts.', provider: 'Local browser test' } }); });
    const launcher = await ready(page); await launcher.click();
    await expect(panel(page)).toBeVisible();
    const running = () => panel(page).evaluate((element) => Array.from(element.querySelectorAll('svg')).reduce((count, svg) => count + svg.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length, 0));
    const expectStatic = async () => {
      await expect.poll(running).toBe(0);
      await expect.poll(() => panel(page).locator('[data-companion-state]').evaluateAll((elements) => elements.every((element) => element.getAttribute('data-active') === '0'))).toBe(true);
    };
    await expectStatic();
    const input = panel(page).getByRole('textbox'); await input.fill('Give me interview guidance.'); await input.press('Enter');
    await expect(panel(page)).toHaveAttribute('data-assistant-state', 'thinking'); await expectStatic();
    release!(); await expect(panel(page)).toHaveAttribute('data-assistant-state', 'answering'); await expectStatic();
    await capture(page, label, 'reduced-motion-answer');
    await page.unroute('**/api/chat');
  });
  expect(diagnostics.consoleErrors).toEqual([]);
});
