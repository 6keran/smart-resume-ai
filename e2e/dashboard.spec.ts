import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

test('authenticated dashboard uses the isolated test user and exposes Create Resume', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: /create resume/i }).last()).toBeVisible();
});
