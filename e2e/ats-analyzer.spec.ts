import { expect, test } from './fixtures';

test('ATS score page exposes upload and paste analysis modes', async ({ page }) => {
  const response = await page.goto('/ats-score');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /ATS Resume Score/i })).toBeVisible();
  const pasteTab = page.getByRole('tab', { name: 'Paste Text', exact: true });
  await expect(pasteTab).toBeVisible();
  await expect(pasteTab).toHaveAttribute('aria-selected', 'false');
  await pasteTab.click();
  await expect(pasteTab).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('textbox', { name: 'Paste resume text' })).toBeVisible();
});

test('resume analyzer route is available to begin analysis without an external AI request', async ({ page }) => {
  const response = await page.goto('/analyzer');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /resume analyzer|analyze resume/i }).first()).toBeVisible();
});
