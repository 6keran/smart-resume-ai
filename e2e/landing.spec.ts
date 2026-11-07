import { expect, test } from './fixtures';

test('landing links, preview interactions and responsive navigation work', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /intelligent workspace for your entire career/i })).toBeVisible();

  const claims = await page.locator('body').innerText();
  expect(claims).not.toMatch(/Alex Chen|NovaScale|15,000\+|42%|88 \/ 100 ATS Score|92%|94% \(Optimal\)|sub-50ms/i);

  for (const hash of ['#artifacts', '#ats-engine', '#preservation', '#pipeline']) {
    await expect(page.locator(`a[href="${hash}"]`).first()).toHaveCount(1);
  }

  const mobileToggle = page.getByRole('button', { name: 'Toggle navigation menu' });
  if ((test.info().project.use.viewport as { width: number }).width < 1024) {
    await expect(mobileToggle).toBeVisible();
    await mobileToggle.click();
    await expect(page.getByRole('link', { name: 'Job Pipeline', exact: true }).last()).toBeVisible();
    await page.getByRole('link', { name: 'Job Pipeline', exact: true }).last().click();
    await expect(page).toHaveURL(/#pipeline$/);
    await expect(mobileToggle).toHaveAttribute('aria-expanded', 'false');
  } else {
    await expect(mobileToggle).toBeHidden();
  }

  await page.getByRole('button', { name: 'ATS Audit' }).click();
  await expect(page.getByText('Resume structure')).toBeVisible();
  await page.getByRole('button', { name: 'Phrasing Diff' }).click();
  await expect(page.getByText('ILLUSTRATIVE EXAMPLE')).toBeVisible();

  await page.getByRole('link', { name: 'Check ATS Score' }).click();
  await expect(page).toHaveURL(/\/ats-score$/);
  await expect(page.getByRole('heading', { name: /ATS Resume Score/i })).toBeVisible();
});

