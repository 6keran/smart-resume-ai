import { expect, test } from './fixtures';

test('landing links, scoring evidence and responsive navigation work', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: /build a resume for the job you want/i })).toBeVisible();

  const claims = await page.locator('body').innerText();
  expect(claims).not.toMatch(/Alex Chen|NovaScale|15,000\+|42%|88 \/ 100 ATS Score|92%|94% \(Optimal\)|sub-50ms/i);
  expect(claims).not.toMatch(/Image upload/i);

  const hero = page.locator('section[aria-labelledby="landing-hero-title"]');
  const pauseTimeline = hero.getByRole('button', { name: 'Pause example timeline' });
  if (await pauseTimeline.isVisible()) await pauseTimeline.click();
  const beforeExampleTab = hero.getByRole('tab', { name: /Before/ });
  const afterExampleTab = hero.getByRole('tab', { name: /After/ });
  await beforeExampleTab.click();
  await expect(hero.getByLabel('Before overall ATS score 79 out of 100')).toBeVisible();
  await expect(hero.getByRole('progressbar', { name: 'Content score' })).toHaveAttribute('aria-valuenow', '75');
  await beforeExampleTab.focus();
  await page.keyboard.press('ArrowRight');
  await expect(afterExampleTab).toHaveAttribute('aria-selected', 'true');
  await expect(hero.getByLabel('After overall ATS score 82 out of 100')).toBeVisible();
  await expect(hero.getByRole('progressbar', { name: 'Content score' })).toHaveAttribute('aria-valuenow', '90');

  const mobileToggle = page.getByRole('button', { name: 'Open navigation menu' });
  if ((test.info().project.use.viewport as { width: number }).width < 1080) {
    await expect(mobileToggle).toBeVisible();
    await mobileToggle.click();
    const dialog = page.getByRole('dialog', { name: 'Product' });
    const drawer = dialog.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('link', { name: 'ATS score', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close navigation menu' }).click();
    await expect(dialog).toBeHidden();
  } else {
    await expect(mobileToggle).toBeHidden();
    await page.getByRole('button', { name: 'Product' }).click();
    await expect(page.getByRole('link', { name: 'ATS score', exact: true })).toBeVisible();
  }

  const evidence = page.locator('section[aria-labelledby="scored-by-rules-heading"]');
  await evidence.getByRole('button', { name: 'Before', exact: true }).click();
  await evidence.getByRole('tab', { name: 'Result' }).click();
  await expect(evidence.getByLabel('Before overall ATS score 79 out of 100')).toBeVisible();
  await expect(evidence.getByRole('progressbar', { name: 'Keywords score' })).toHaveAttribute('aria-valuenow', '60');
  await evidence.getByRole('button', { name: 'After', exact: true }).click();
  await expect(evidence.getByLabel('After overall ATS score 82 out of 100')).toBeVisible();
  await expect(evidence.getByRole('progressbar', { name: 'Formatting score' })).toHaveAttribute('aria-valuenow', '95');
  await expect(page.getByText('Detected sections')).toHaveCount(0);
  await expect(page.getByText('Detected keywords')).toHaveCount(0);
  await expect(page.getByText('SQL · Python · dashboard')).toHaveCount(0);

  expect(await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )).toBe(false);

  await page.getByRole('link', { name: 'Check your ATS score' }).click();
  await expect(page).toHaveURL(/\/ats-score$/);
  await expect(page.getByRole('heading', { name: /ATS Resume Score/i })).toBeVisible();
});

