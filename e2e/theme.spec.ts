import { expect, test } from './fixtures';

test('theme selector switches between light and dark', async ({ page }) => {
  await page.goto('/login');
  const root = page.locator('html');
  const lightControl = page.locator('#theme-toggle-btn:visible, #theme-toggle-light:visible');
  const darkControl = page.locator('#theme-toggle-btn:visible, #theme-toggle-dark:visible');
  await lightControl.click();
  await expect(root).toHaveAttribute('data-theme', 'light');
  await darkControl.click();
  await expect(root).toHaveAttribute('data-theme', 'dark');
});

test('reduced-motion preference is respected by the landing page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /intelligent workspace for your entire career/i })).toBeVisible();
  const runningAnimations = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running').length);
  expect(runningAnimations).toBe(0);
});
