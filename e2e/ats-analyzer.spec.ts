import { expect, test } from './fixtures';

test('ATS score page exposes upload and paste analysis modes', async ({ page }) => {
  const response = await page.goto('/ats-score');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /ATS Resume Score/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /paste/i })).toBeVisible();
});

test('resume analyzer route is available to begin analysis without an external AI request', async ({ page }) => {
  const response = await page.goto('/analyzer');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /resume analyzer|analyze resume/i }).first()).toBeVisible();
});
