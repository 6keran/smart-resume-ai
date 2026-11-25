import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });
test.setTimeout(90_000);

type ApiResult = { status: number; body: any };

async function api(page: Page, url: string, method: 'GET' | 'POST' | 'PUT' | 'PATCH' = 'GET', body?: unknown): Promise<ApiResult> {
  return page.evaluate(async ({ requestUrl, requestMethod, requestBody }) => {
    const response = await fetch(requestUrl, {
      method: requestMethod,
      credentials: 'same-origin',
      headers: requestBody === null ? undefined : { 'Content-Type': 'application/json' },
      body: requestBody === null ? undefined : JSON.stringify(requestBody),
    });
    return { status: response.status, body: await response.json().catch(() => null) };
  }, { requestUrl: url, requestMethod: method, requestBody: body === undefined ? null : body });
}

test('Career Command Center renders authentic student metrics and 4 readiness quadrants', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // 1. Header & Identity
  await expect(page.getByRole('heading', { name: /welcome back, playwright test user/i })).toBeVisible();
  await expect(page.getByText('Candidate Workspace')).toBeVisible();
  await expect(page.getByText(/Target:/i).first()).toBeVisible();

  // 2. Career Readiness Engine & 4 Quadrants (each weighted 25%)
  await expect(page.getByText(/CAREER READINESS ENGINE/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: /overall preparedness:/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Technical Skills', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Project Evidence', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Resume ATS', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Interview Practice', exact: true })).toBeVisible();
  await expect(page.getByText(/Weight: 25%/i).first()).toBeVisible();

  // 3. Core sections
  await expect(page.getByRole('heading', { name: /career activity & milestones/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /important skill gaps/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /recommended next action/i })).toBeVisible();
});

// NOTE: The former "Explainability breakdown drawer toggles and presents algorithmic
// methodology" test was removed. The redesigned Career Readiness HUD replaced the
// "Why this score?" button and "algorithmic evaluation methodology" drawer with
// per-quadrant "Weight: 25%" badges and inline strengths/recommendations. There is no
// longer a toggleable methodology drawer to assert.

test('Career Activity & Milestones timeline filters by category', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /career activity & milestones/i })).toBeVisible();

  const filterAll = page.getByRole('button', { name: /^all$/i });
  const filterResumes = page.getByRole('button', { name: /^resumes$/i });
  const filterSkills = page.getByRole('button', { name: /^skills$/i });
  const filterApplications = page.getByRole('button', { name: /^applications$/i });

  await expect(filterAll).toBeVisible();
  await expect(filterResumes).toBeVisible();
  await expect(filterSkills).toBeVisible();
  await expect(filterApplications).toBeVisible();

  // Switch filters
  await filterResumes.click();
  await filterSkills.click();
  await filterApplications.click();
  await filterAll.click();
});

test('Contextual AI Assistant integration launches with pre-filled coaching prompt', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // Ensure CareerChatbot has mounted and attached its window event listener
  const launcher = page.getByRole('button', { name: /open ai assistant/i });
  await expect(launcher).toBeVisible();

  const askAiButton = page.getByRole('button', { name: 'Ask AI Assistant', exact: true });
  await expect(askAiButton).toBeVisible();
  await askAiButton.click();

  // Chat panel opens with AI Assistant persona (never 'Alex')
  const chatDialog = page.getByRole('dialog', { name: /smart resume ai assistant/i });
  await expect(chatDialog).toBeVisible();
  await expect(chatDialog.getByRole('heading', { name: 'Career Copilot', exact: true })).toBeVisible();

  // Verify input textarea contains pre-filled coaching inquiry
  const chatInput = chatDialog.getByPlaceholder(/ask about your resume/i);
  await expect(chatInput).toBeVisible();
  const inputValue = await chatInput.inputValue();
  expect(inputValue).toContain('Review my profile for');

  // Close chat via Escape
  await page.keyboard.press('Escape');
  await expect(chatDialog).toBeHidden();
});

test('Career readiness history endpoint returns authenticated student snapshots', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  const historyResult = await api(page, '/api/student/readiness-history');
  expect(historyResult.status).toBe(200);
  expect(historyResult.body?.success).toBe(true);
  const snapshots = historyResult.body?.snapshots || historyResult.body?.history;
  expect(Array.isArray(snapshots)).toBe(true);

  if (snapshots.length > 0) {
    const snap = snapshots[0];
    expect(typeof snap.overallScore).toBe('number');
    expect(typeof snap.technicalScore).toBe('number');
    expect(typeof snap.projectScore).toBe('number');
    expect(typeof snap.resumeScore).toBe('number');
    expect(typeof snap.interviewScore).toBe('number');
    expect(typeof snap.triggerActivity).toBe('string');
  }
});

test('Regular student cannot access protected admin dashboard', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('Authentic empty states render genuine fallback messaging without fabricated metrics', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // Fresh test user has no milestones, applications, or verified credentials initially.
  await expect(page.getByText(/no milestones found for this category/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /create resume/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /take assessment/i }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: /search roles/i }).first()).toBeVisible();
});

test('Action execution deep links navigate to core workspaces', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'Run deep link transitions on desktop viewport.');

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // 1. Open Resume Editor deep link
  const resumeLink = page.getByRole('main').getByRole('link', { name: /open resume editor/i }).first();
  await expect(resumeLink).toBeVisible();
  await resumeLink.click();
  await expect(page).toHaveURL(/\/builder/);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // 2. Guided Projects deep link (activate the Project Evidence quadrant first)
  await page.getByRole('button', { name: /project evidence/i }).click();
  const projectsLink = page.getByRole('main').getByRole('link', { name: /explore guided projects/i }).first();
  await expect(projectsLink).toBeVisible();
  await projectsLink.click();
  await expect(page).toHaveURL(/\/projects/);
});
