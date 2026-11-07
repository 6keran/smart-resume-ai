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
