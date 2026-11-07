import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

test('authenticated job search renders search controls', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page.getByRole('heading', { name: /Job Search & Role Matcher/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Search Jobs/i })).toBeVisible();
});
