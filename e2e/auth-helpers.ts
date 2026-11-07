import { expect, type Page } from '@playwright/test';

export async function signInIsolatedTestUser(page: Page) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  testCredentialsRequired(email, password);

  const registration = await page.request.post('/api/auth/register', {
    data: { fullName: 'Playwright Test User', email, password, confirmPassword: password },
  });
  expect([200, 409]).toContain(registration.status());

  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill(email!);
  await page.getByLabel(/password/i).first().fill(password!);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function signInAdminUser(page: Page) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@smartresume.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@SmartResume2026!';

  await page.goto('/admin/login');
  await page.locator('input#admin-email').fill(adminEmail);
  await page.locator('input#admin-password').fill(adminPassword);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 20_000 });
}

function testCredentialsRequired(email?: string, password?: string): asserts email is string {
  if (!email || !password) throw new Error('E2E_TEST_EMAIL and E2E_TEST_PASSWORD are required for authenticated browser tests.');
}
