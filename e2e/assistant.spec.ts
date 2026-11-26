import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

test('AI Assistant opens, identifies itself, and returns the deterministic no-key response', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const launcher = page.getByRole('button', { name: /open ai assistant/i });
  await expect(launcher).toBeVisible();
  await launcher.click();
  const panel = page.getByRole('dialog', { name: /smart resume ai assistant/i });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/I am your AI Assistant/i).first()).toBeVisible();
  await expect(panel.getByText(/Alex/i)).toHaveCount(0);

  const prompt = panel.getByPlaceholder(/ask about your resume/i);
  await prompt.fill('How can I improve my resume?');
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/chat'));
  await panel.getByRole('button', { name: /send message/i }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.isLive).toBe(false);
  expect(payload.reply).toBeTruthy();
  await expect(panel.getByText(/Lead with Strong Action Verbs/i).last()).toBeVisible({ timeout: 15_000 });
});

test('clearing a pending reply starts a clean conversation', async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const requests: Array<{ message: string; history: unknown[] }> = [];
  await page.route('**/api/chat', async (route) => {
    const payload = route.request().postDataJSON();
    requests.push(payload);
    if (payload.message === 'Review my old resume') {
      await pending;
      await route.fulfill({ json: { reply: 'Reply to the cleared message' } }).catch(() => {});
    } else {
      await route.fulfill({ json: { reply: 'Reply to the new message' } });
    }
  });
  await page.goto('/dashboard');
  await page.getByRole('button', { name: /open ai assistant/i }).click();
  const panel = page.getByRole('dialog', { name: 'Smart Resume AI Assistant' });
  const input = panel.getByRole('textbox');
  try {
    await input.fill('Review my old resume');
    await input.press('Enter');
    await expect.poll(() => requests.length).toBe(1);
    await panel.getByRole('button', { name: 'Reset conversation' }).click();
    await panel.getByRole('button', { name: 'Clear conversation', exact: true }).click();
    await expect(input).toBeEnabled();
    await input.fill('Review my new resume');
    await input.press('Enter');
    await expect(panel.getByText('Reply to the new message')).toBeVisible();
  } finally {
    release();
  }
  await page.unrouteAll({ behavior: 'wait' });
  expect(requests[1]).toMatchObject({ message: 'Review my new resume', history: [] });
  await expect(panel.getByText('Reply to the cleared message')).toHaveCount(0);
});

test('the dashboard remembers a request to chat while the account is loading', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/auth/me', async (route) => { await gate; await route.continue(); });
  const sessionRequest = page.waitForRequest('**/api/auth/me');
  try {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await sessionRequest;
    await page.getByRole('button', { name: 'Ask AI Assistant', exact: true }).click();
  } finally {
    release();
  }
  const input = page.getByRole('textbox', { name: 'Message the AI Assistant' });
  await expect(input).toHaveValue(/Review my profile/);
  await input.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
  await expect(input).toHaveValue(/Review my profile/);
});

test('the robot and its label are visible when canvas is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, {
      apply(target, canvas, args) {
        if (canvas.closest('[data-companion-renderer]')) return null;
        return Reflect.apply(target, canvas, args);
      },
    });
  });
  await page.goto('/dashboard');
  const launcher = page.getByRole('button', { name: /open ai assistant/i });
  await expect(launcher.getByText('AI Assistant', { exact: true })).toBeVisible();
  await expect(launcher.locator('svg')).toHaveCSS('opacity', '1');
  await launcher.press('Enter');
  await expect(page.getByRole('textbox', { name: 'Message the AI Assistant' })).toBeFocused();
});
