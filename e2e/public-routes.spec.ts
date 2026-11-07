import { expect, test } from './fixtures';

const publicRoutes = [
  { path: '/login', heading: 'Welcome back' },
  { path: '/register', heading: /create.*account|join/i },
  { path: '/ats-score', heading: /ATS Resume Score/i },
  { path: '/analyzer', heading: /resume analyzer|analyze resume/i },
];

for (const route of publicRoutes) {
  test(`${route.path} renders`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole('heading', { name: route.heading }).first()).toBeVisible();
  });
}

test('protected dashboard and builder send anonymous users to login', async ({ page }) => {
  for (const route of ['/dashboard', '/builder', '/apply-assistant', '/jobs']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login\?from=/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  }
});

test('login and registration expose labeled controls without submitting', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  await expect(page.getByLabel(/password/i).first()).toBeVisible();
  await page.goto('/register');
  await expect(page.getByRole('textbox', { name: /name/i }).first()).toBeVisible();
  await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
});
