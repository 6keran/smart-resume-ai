import { expect, test } from './fixtures';
import { signInAdminUser } from './auth-helpers';
import path from 'node:path';
import fs from 'node:fs/promises';

async function saveAuditScreenshot(page: any, projectName: string, name: string) {
  const dir = path.join(process.cwd(), 'test-results', 'screenshots', 'audit');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${projectName}-${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
}

test.describe('Visual Design Audit - Public Pages', () => {
  test('Landing Page visual audit', async ({ page }, testInfo) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '01-landing');
  });

  test('Student Login Page visual audit', async ({ page }, testInfo) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '02-student-login');
  });

  test('Student Registration Page visual audit', async ({ page }, testInfo) => {
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /create your account/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '03-student-register');
  });

  test('Admin Login Page visual audit', async ({ page }, testInfo) => {
    await page.goto('/admin/login', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /admin portal/i })).toBeVisible();
    await expect(page.locator('#admin-email')).toBeVisible();
    await expect(page.locator('#admin-password')).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '04-admin-login');
  });

  test('Privacy Policy Page visual audit', async ({ page }, testInfo) => {
    await page.goto('/privacy', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /privacy policy/i })).toBeVisible();
    await expect(page.getByText(/1\. Information We Collect/i)).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '05-privacy-policy');
  });

  test('Terms of Service Page visual audit', async ({ page }, testInfo) => {
    await page.goto('/terms', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /terms & conditions/i })).toBeVisible();
    await expect(page.getByText(/1\. Acceptance of Terms/i)).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '06-terms-of-service');
  });
});

test.describe('Visual Design Audit - Authenticated Student Pages', () => {
  test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

  test('Command Center Dashboard visual audit', async ({ page }, testInfo) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /career overview/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '07-dashboard-command-center');
  });

  test('Profile Studio visual audit', async ({ page }, testInfo) => {
    await page.goto('/dashboard/profile', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /profile & settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /save student career profile/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '08-profile-studio');
  });

  test('Skill Assessment Directory visual audit', async ({ page }, testInfo) => {
    await page.goto('/skills', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /skill assessments/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '09-skills-directory');
  });

  test('Learning Roadmap tab visual audit', async ({ page }, testInfo) => {
    await page.goto('/skills?tab=roadmap', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /roadmap for/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '10-skills-roadmap');
  });

  test('Skill Assessment Exam Readiness visual audit', async ({ page }, testInfo) => {
    await page.goto('/skills/assess/react', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /react technical assessment/i })).toBeVisible();
    await expect(page.getByText(/Strict Fullscreen Examination Rules/i)).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '11-skill-assess-readiness');
  });

  test('Interview Practice visual audit', async ({ page }, testInfo) => {
    await page.goto('/interview-prep', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /technical & behavioral interview practice/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /start.*interview session/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '12-interview-practice');
  });

  test('Resume Builder visual audit', async ({ page }, testInfo) => {
    await page.goto('/builder', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /resume builder/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '13-resume-builder');
  });

  test('Job Discovery visual audit', async ({ page }, testInfo) => {
    await page.goto('/jobs', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /job search & role matcher/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '14-jobs-discovery');
  });

  test('Guided Projects visual audit', async ({ page }, testInfo) => {
    await page.goto('/projects', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /portfolio engineering & milestone workspace/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '15-projects-guide');
  });

  test('Application Assistant visual audit', async ({ page }, testInfo) => {
    await page.goto('/apply-assistant', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /application preparation studio/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '16-apply-assistant');
  });
});

test.describe('Visual Design Audit - Admin Pages', () => {
  test('Admin Dashboard visual audit', async ({ page }, testInfo) => {
    await signInAdminUser(page);
    await expect(page.getByRole('heading', { name: /admin dashboard/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '17-admin-dashboard');
  });

  test('Admin Settings visual audit', async ({ page }, testInfo) => {
    await signInAdminUser(page);
    await page.goto('/admin/settings', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /appearance/i })).toBeVisible();
    await expect(page.getByText(/color theme/i)).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '18-admin-settings');
  });

  test('Admin Users visual audit', async ({ page }, testInfo) => {
    await signInAdminUser(page);
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /user accounts/i })).toBeVisible();
    await saveAuditScreenshot(page, testInfo.project.name, '19-admin-users');
  });
});

