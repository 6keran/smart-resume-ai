import { expect, test } from './fixtures';

test('landing navigation responds to the viewport and closes its compact menu after navigation', async ({ page }) => {
  await page.goto('/');
  const width = (test.info().project.use.viewport as { width: number }).width;
  const toggle = page.getByRole('button', { name: 'Toggle navigation menu' });

  if (width < 1024) {
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const jobsLink = page.getByRole('link', { name: 'Job Pipeline', exact: true }).last();
    await expect(jobsLink).toBeVisible();
    await jobsLink.click();
    await expect(page).toHaveURL(/#pipeline$/);
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  } else {
    await expect(toggle).toBeHidden();
    await expect(page.getByRole('link', { name: 'Job Pipeline', exact: true }).first()).toBeVisible();
  }
});
