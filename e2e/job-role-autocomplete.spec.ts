import { expect, test } from './fixtures';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

test.describe('Job Role Autocomplete Regression Tests', () => {
  test('typing Financial displays Financial Analyst suggestion and allows selection', async ({ page }) => {
    await page.goto('/job-match', { waitUntil: 'domcontentloaded' });

    const roleInput = page.getByPlaceholder(/e\.g\. Data Analyst, Mechanical Engineer/i);
    await expect(roleInput).toBeVisible({ timeout: 15_000 });

    // 1. Type Financial and verify Financial Analyst suggestion appears
    await roleInput.fill('Financial');
    const financialOption = page.getByRole('option', { name: /Financial Analyst/i }).first();
    await expect(financialOption).toBeVisible({ timeout: 10_000 });

    // 2. Select Financial Analyst
    await financialOption.click();
    await expect(roleInput).toHaveValue('Financial Analyst');
    await expect(page.getByRole('listbox')).toBeHidden();

    // 3. Clear and test Mechanical Engineer suggestion
    await roleInput.fill('');
    await roleInput.fill('Mechanical');
    const mechOption = page.getByRole('option', { name: /Mechanical Engineer/i }).first();
    await expect(mechOption).toBeVisible({ timeout: 10_000 });
    await mechOption.click();
    await expect(roleInput).toHaveValue('Mechanical Engineer');

    // 4. Test Data Analyst with keyboard navigation (ArrowDown + Enter)
    await roleInput.fill('Data Anal');
    const dataOption = page.getByRole('option', { name: /Data Analyst/i }).first();
    await expect(dataOption).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(roleInput).toHaveValue(/Data Analyst/i);
    await expect(page.getByRole('listbox')).toBeHidden();

    // 5. Test Escape closes the dropdown
    await roleInput.fill('Softw');
    await expect(page.getByRole('option', { name: /Software/i }).first()).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toBeHidden();
  });
});
