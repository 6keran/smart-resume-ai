import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

test('authenticated resume builder opens without exporting or saving data', async ({ page }) => {
  await page.goto('/builder');
  await expect(page.getByRole('heading', { name: /resume builder/i })).toBeVisible();
});
