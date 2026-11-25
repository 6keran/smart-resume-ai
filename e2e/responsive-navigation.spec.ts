import { expect, test } from './fixtures';

test('landing navigation responds to the viewport and closes its compact menu after navigation', async ({ page }) => {
  await page.goto('/');
  const width = (test.info().project.use.viewport as { width: number }).width;
  const toggle = page.getByRole('button', { name: 'Open navigation menu' });

  if (width < 1080) {
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    const dialog = page.getByRole('dialog', { name: 'Product' });
    const drawer = dialog.getByRole('navigation', { name: 'Mobile navigation' });
    const closeButton = dialog.getByRole('button', { name: 'Close navigation menu' });
    await expect(drawer).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close navigation menu' })).toHaveCount(1);
    await expect(closeButton).toBeFocused();

    const lastLink = drawer.getByRole('link', { name: 'Create your resume' });
    await page.keyboard.press('Shift+Tab');
    await expect(lastLink).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(closeButton).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(toggle).toBeFocused();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(dialog).toBeVisible();
    await drawer.getByRole('link', { name: 'ATS score', exact: true }).click();
    await expect(page).toHaveURL(/\/ats-score$/);
    await expect(page.getByRole('heading', { name: /ATS Resume Score/i })).toBeVisible();
  } else {
    await expect(toggle).toBeHidden();
    const productButton = page.getByRole('button', { name: 'Product' });
    await expect(productButton).toBeVisible();
    await productButton.click();
    await expect(page.getByRole('link', { name: 'Jobs', exact: true })).toBeVisible();
  }
});
