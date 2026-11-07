import { expect, test } from './fixtures';

test('anonymous job search enforces authentication', async ({ page }) => {
  await page.goto('/jobs');
  await expect(page).toHaveURL(/\/login\?from=/);
});

