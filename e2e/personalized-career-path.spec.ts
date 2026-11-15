import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

test.setTimeout(90_000);

async function registerFreshUser(page: Page, fullName: string) {
  const unique = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const email = `pcp-${unique}@example.invalid`;
  const password = 'CareerPathPass2026!';
  const ip = `10.77.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;
  await page.context().setExtraHTTPHeaders({ 'x-forwarded-for': ip });

  await page.goto('/register', { waitUntil: 'domcontentloaded' });
  await page.locator('#fullName').fill(fullName);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  const confirmInput = page.locator('#confirmPassword');
  if (await confirmInput.count()) {
    await confirmInput.fill(password);
  }
  await page.getByRole('button', { name: /create workspace account|create account/i }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 });
}

test('New user registration routes to /onboarding and supports Skip without assigning a software default', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await registerFreshUser(page, 'Meera Nair');
  await expect(page.getByRole('heading', { name: /what role are you aiming for/i })).toBeVisible();

  await page.getByRole('button', { name: /skip for now/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });

  await expect(page.getByText(/Goal not set/i).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Graduate Software Engineer');

  await context.close();
});

test('Personalized multi-domain flow: onboarding -> guidance roadmap -> my career data -> job match -> builder import', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await registerFreshUser(page, 'Arjun Deshmukh');

  // Step 1: Select Mechanical Engineer
  await page.getByRole('button', { name: /^Mechanical Engineer$/i }).click();
  await page.getByRole('button', { name: /continue to resume or background/i }).click();

  // Step 2: Enter education manually without uploading
  await expect(page.getByRole('heading', { name: /import your resume or enter core details/i })).toBeVisible();
  await page.getByRole('button', { name: /enter manually/i }).click();
  await page.getByPlaceholder(/e\.g\. State University/i).fill('Pune Engineering College');
  await page.getByPlaceholder(/e\.g\. B\.S\., B\.Tech, MBA/i).fill('B.Tech');
  await page.getByPlaceholder(/e\.g\. Mechanical Engineering, Finance, Marketing/i).fill('Mechanical Engineering');
  await page.getByPlaceholder(/e\.g\. 2026/i).fill('2026');
  await page.getByRole('button', { name: /review & confirm data/i }).click();

  // Step 3: Add CAD skill explicitly and finish onboarding
  await expect(page.getByRole('heading', { name: /confirm your career profile/i })).toBeVisible();
  await page.getByPlaceholder(/Type a skill \(e\.g\. AutoCAD/i).fill('AutoCAD');
  await page.getByRole('button', { name: /add skill/i }).click();
  await page.getByRole('button', { name: /confirm & continue to dashboard/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await expect(page.getByText(/Mechanical Engineer/i).first()).toBeVisible();

  // Guidance: Mechanical Engineer Readiness Studio & Curated Roadmap Checklist
  await page.goto('/guidance', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Mechanical Engineer Readiness Studio/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Suggested for Mechanical Engineer/i).first()).toBeVisible();
  const cadSkillRow = page.getByRole('button', { name: /CAD Modeling/i }).first();
  await cadSkillRow.click();

  // Reload to verify roadmap checklist persistence
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Mechanical Engineer Readiness Studio/i })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole('button', { name: /CAD Modeling/i }).first()).toContainText('CAD Modeling');

  // My Career Data: verify skill provenance, add SolidWorks, export JSON, and verify Career Data view
  await page.goto('/dashboard/my-data', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /My Career Data/i })).toBeVisible();
  await expect(page.getByText('AutoCAD').first()).toBeVisible();
  await page.getByPlaceholder(/Add a verified or practiced skill/i).fill('SolidWorks');
  await page.getByRole('button', { name: /Add Skill/i }).click();
  await expect(page.getByText('SolidWorks').first()).toBeVisible({ timeout: 15_000 });

  const exportResponse = await page.request.get('/api/user/my-data/export');
  expect(exportResponse.status()).toBe(200);
  const exportedJson = await exportResponse.json();
  expect(exportedJson.targetRole).toBe('Mechanical Engineer');

  // Job Match: verify typing autocomplete for multi-domain role
  await page.goto('/job-match', { waitUntil: 'domcontentloaded' });
  const roleInput = page.getByPlaceholder(/e\.g\. Data Analyst, Mechanical Engineer/i);
  await roleInput.fill('Financial');
  await expect(page.getByRole('option', { name: /Financial Analyst/i }).first()).toBeVisible({ timeout: 10_000 });

  // Builder: Opt-in Import Profile preview & merge without silent overwrite
  await page.goto('/builder', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Import Profile/i }).click();
  await expect(page.getByRole('heading', { name: /Import from My Career Data/i })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('SolidWorks').first()).toBeVisible();
  await page.getByRole('button', { name: /Merge Into Resume/i }).click();
  await expect(page.getByRole('heading', { name: /Import from My Career Data/i })).toBeHidden();

  // Clear Career Data on /dashboard/my-data
  await page.goto('/dashboard/my-data', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Clear Career Data/i }).click();
  await page.getByPlaceholder('CLEAR').fill('CLEAR');
  await page.getByRole('button', { name: /Confirm Clear/i }).click();
  await expect(page.getByText(/Career profile, target role, and unverified skills have been cleared/i)).toBeVisible({ timeout: 15_000 });

  await context.close();
});

