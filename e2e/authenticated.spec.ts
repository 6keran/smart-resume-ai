import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

test('dashboard is populated for the authenticated test user', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: /create resume/i }).last()).toBeVisible();
  await expect(page.getByText(/career (overview|tools|progress|readiness)/i).first()).toBeVisible();
});

test('Create Resume opens the authenticated resume builder', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /user menu/i })).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: /create resume/i }).last().click();
  await page.waitForURL(/\/builder$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: /resume builder/i })).toBeVisible();
});

test('AI Assistant opens, greets accurately, responds and can be dragged', async ({ page }) => {
  await page.goto('/dashboard');
  const launcher = page.getByRole('button', { name: /open ai assistant/i });
  await expect(launcher).toBeVisible();
  await launcher.click();
  const panel = page.getByRole('dialog', { name: /smart resume ai assistant/i });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/I am your AI Assistant/i).first()).toBeVisible();
  await expect(panel.getByText(/Alex/i)).toHaveCount(0);

  const dragHandle = panel.locator('[data-chat-drag="true"]');
  const titleBox = await panel.getByRole('heading', { name: 'AI Assistant' }).boundingBox();
  const panelBefore = await panel.boundingBox();
  const box = titleBox;
  expect(box).not.toBeNull();
  expect(panelBefore).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2 - 40);
  await page.mouse.up();
  const panelAfter = await panel.boundingBox();
  expect(panelAfter!.x > panelBefore!.x || panelAfter!.y < panelBefore!.y).toBe(true);
  await expect(dragHandle).toBeVisible();

  const input = panel.getByPlaceholder(/ask about your resume/i);
  await input.fill('How can I improve my resume?');
  const responsePromise = page.waitForResponse((response) => response.url().includes('/api/chat'));
  await panel.getByRole('button', { name: 'Send message' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.isLive).toBe(false);
  expect(payload.reply).toBeTruthy();
  await expect(panel.getByText(/Lead with Strong Action Verbs/i).last()).toBeVisible({ timeout: 15_000 });
});
