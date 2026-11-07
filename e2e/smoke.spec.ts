import { expect, test } from './fixtures';

test('Chromium opens the public landing page', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /intelligent workspace for your entire career/i })).toBeVisible();
});
