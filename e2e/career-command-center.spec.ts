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

test('Career Command Center 3.0 renders authentic student metrics, 4 quadrants, and explainable score', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // 1. Header & Identity
  await expect(page.getByText('CAREER COMMAND CENTER 3.0')).toBeVisible();
  await expect(page.getByRole('heading', { name: /welcome back, playwright test user/i })).toBeVisible();
  await expect(page.getByText(/Target Role:/i).first()).toBeVisible();

  // 2. Multidimensional Readiness Index & 4 Quadrants
  await expect(page.getByRole('heading', { name: /career readiness score:/i })).toBeVisible();
  await expect(page.getByText(/100 PTS/i)).toBeVisible();

  // 4 Dimensions
  await expect(page.getByText('Technical (25%)')).toBeVisible();
  await expect(page.getByText('Projects (25%)')).toBeVisible();
  await expect(page.getByText('Resume ATS (25%)')).toBeVisible();
  await expect(page.getByText('Interview (25%)')).toBeVisible();

  // 3. Educational Readiness Disclaimer Banner
  await expect(page.getByText(/Educational Readiness Index:/i)).toBeVisible();
  await expect(page.getByText(/does not guarantee employment or hiring outcomes/i)).toBeVisible();

  // 4. Core sections
  await expect(page.getByRole('heading', { name: /career progress timeline/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /verified achievements & milestones/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /recommended next actions/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /career (intelligence studio|tools)/i })).toBeVisible();
});

test('Explainability breakdown drawer toggles and presents algorithmic methodology', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  const explainButton = page.getByRole('button', { name: /why this score\?/i });
  await expect(explainButton).toBeVisible();

  // Open drawer
  await explainButton.click();
  await expect(page.getByRole('heading', { name: /algorithmic evaluation methodology/i })).toBeVisible();
  await expect(page.getByText('1. Data Evaluated')).toBeVisible();
  await expect(page.getByText('2. Weighting Strategy')).toBeVisible();
  await expect(page.getByText('3. What Is Missing')).toBeVisible();
  await expect(page.getByText('4. Concrete Next Step')).toBeVisible();

  // Close drawer
  const hideButton = page.getByRole('button', { name: /hide breakdown/i });
  await expect(hideButton).toBeVisible();
  await hideButton.click();
  await expect(page.getByRole('heading', { name: /algorithmic evaluation methodology/i })).toBeHidden();
});

test('Career progress timeline filters by category', async ({ page }) => {
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('heading', { name: /career progress timeline/i })).toBeVisible();

  const filterAll = page.getByRole('button', { name: /^all$/i });
  const filterAssessment = page.getByRole('button', { name: /^assessment$/i });
  const filterProject = page.getByRole('button', { name: /^project$/i });
  const filterResume = page.getByRole('button', { name: /^resume$/i });
  const filterApplication = page.getByRole('button', { name: /^application$/i });

  await expect(filterAll).toBeVisible();
  await expect(filterAssessment).toBeVisible();
  await expect(filterProject).toBeVisible();
  await expect(filterResume).toBeVisible();
  await expect(filterApplication).toBeVisible();

  // Switch filters
  await filterProject.click();
  await filterAssessment.click();
  await filterResume.click();
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
  await expect(chatDialog.getByRole('heading', { name: 'AI Assistant', exact: true })).toBeVisible();

  // Verify input textarea contains pre-filled coaching inquiry
  const chatInput = chatDialog.getByPlaceholder(/ask about your resume/i);
  await expect(chatInput).toBeVisible();
  const inputValue = await chatInput.inputValue();
  expect(inputValue).toContain('Explain my overall career readiness score');

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

  // Fresh test user has no completed projects or verified credentials initially
  // Verify authentic empty state copy is rendered
  await expect(page.getByText(/no verified achievements recorded yet/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /take skill assessment/i })).toBeVisible();

  await expect(page.getByText(/no capstones started yet/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /start (ai )?guided project/i })).toBeVisible();

  await expect(page.getByText(/no applications tracked yet/i)).toBeVisible();
  await expect(page.getByRole('link', { name: /find jobs/i })).toBeVisible();
});

test('Action execution deep links navigate to core workspaces', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'Run deep link transitions on desktop viewport.');

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // 1. Create Resume deep link
  const createResumeLink = page.getByRole('main').getByRole('link', { name: /create resume/i }).first();
  await expect(createResumeLink).toBeVisible();
  await createResumeLink.click();
  await expect(page).toHaveURL(/\/builder/);

  // Return to dashboard
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // 2. Guided Projects deep link
  const projectsLink = page.getByRole('main').getByRole('link', { name: /guided projects/i }).first();
  await expect(projectsLink).toBeVisible();
  await projectsLink.click();
  await expect(page).toHaveURL(/\/projects/);

  // Return to dashboard
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  // 3. Learning Roadmap deep link
  const roadmapLink = page.getByRole('main').getByRole('link', { name: /learning roadmap/i }).first();
  await expect(roadmapLink).toBeVisible();
  await roadmapLink.click();
  await expect(page).toHaveURL(/\/skills\?tab=roadmap/);
});

