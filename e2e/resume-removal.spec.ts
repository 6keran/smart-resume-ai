import { expect, test } from './fixtures';

test.setTimeout(90_000);

function buildResumePayload(fullName: string, email: string) {
  return {
    personalInfo: {
      fullName,
      email,
      phone: '(555) 111-2222',
      location: 'Seattle, WA',
    },
    summary: `${fullName} experienced software engineer specializing in distributed systems and React applications.`,
    skills: {
      technical: ['TypeScript', 'React', 'Next.js', 'SQL'],
      tools: ['Docker', 'Git'],
      soft: ['Communication'],
    },
    experience: [
      {
        id: `exp-${Date.now()}`,
        company: 'CloudSystems Inc',
        position: 'Software Engineer',
        startDate: 'Jan 2023',
        endDate: 'Present',
        description: 'Delivered low-latency microservices and accessible web interfaces.',
      },
    ],
    education: [
      {
        id: `edu-${Date.now()}`,
        institution: 'University of Washington',
        degree: 'B.S. Computer Science',
        graduationYear: '2022',
      },
    ],
  };
}

test('removing resumes works cleanly across /builder?resumeId, analyzer uploads, and /dashboard/resumes', async ({
  page,
}) => {
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const email = `remove-e2e-${uniqueSuffix}@example.invalid`;
  const password = 'RemoveResumeTest!2026';
  const ip = `10.88.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;

  // Register isolated authenticated student session
  const regRes = await page.request.post('/api/auth/register', {
    headers: { 'x-forwarded-for': ip },
    data: {
      fullName: 'Resume Removal Tester',
      email,
      password,
      confirmPassword: password,
    },
  });
  expect(regRes.status()).toBe(200);

  // 1. Create Resume Alpha (active) and Resume Beta (non-active)
  const resAlpha = await page.request.post('/api/user/resumes', {
    headers: { 'x-forwarded-for': ip },
    data: {
      createNew: true,
      setActive: true,
      filename: 'Resume_Alpha.pdf',
      resumeData: buildResumePayload('Alpha Candidate', email),
    },
  });
  expect(resAlpha.status()).toBe(200);
  const alphaData = await resAlpha.json();
  const alphaId: string = alphaData.resumeId;

  const resBeta = await page.request.post('/api/user/resumes', {
    headers: { 'x-forwarded-for': ip },
    data: {
      createNew: true,
      setActive: false,
      filename: 'Resume_Beta.pdf',
      resumeData: buildResumePayload('Beta Candidate', email),
    },
  });
  expect(resBeta.status()).toBe(200);
  const betaData = await resBeta.json();
  const betaId: string = betaData.resumeId;

  // Keep Alpha explicitly active on server
  const setAlphaActiveRes = await page.request.post(
    `/api/user/resumes?action=set_active&id=${encodeURIComponent(alphaId)}`,
    {
      headers: { 'x-forwarded-for': ip },
      data: { action: 'set_active', resumeId: alphaId },
    }
  );
  expect(setAlphaActiveRes.status()).toBe(200);

  // 2. Create an Analyzer-only upload (resume_data = NULL)
  const analyzeRes = await page.request.post('/api/resume/analyze', {
    headers: { 'x-forwarded-for': ip },
    data: {
      fileName: 'Analyzer_Gamma.pdf',
      resumeText: `Gamma Candidate
gamma@example.com | Seattle, WA
PROFESSIONAL SUMMARY
Full-stack engineer with experience in TypeScript, React, Node.js, PostgreSQL, and automated testing.
EXPERIENCE
Systems Corp — Software Developer (2022 - Present)
- Built APIs reducing latency by 35% and improved CI reliability across 12 services.
EDUCATION
State University — B.S. in Computer Science, 2022
SKILLS
TypeScript, React, Next.js, Node.js, PostgreSQL, Docker`,
    },
  });
  expect(analyzeRes.status()).toBe(200);

  const initialListRes = await page.request.get('/api/user/resumes', {
    headers: { 'x-forwarded-for': ip },
  });
  expect(initialListRes.status()).toBe(200);
  const initialList = await initialListRes.json();
  const gammaEntry = initialList.resumes.find((r: any) => r.filename === 'Analyzer_Gamma.pdf');
  expect(gammaEntry?.id).toBeTruthy();
  const gammaId: string = gammaEntry.id;

  // 3. Open non-active Resume Beta via /builder?resumeId=<betaId> and remove it
  await page.goto(`/builder?resumeId=${encodeURIComponent(betaId)}`);
  await expect(page.locator('#btn-resume-selector')).toContainText('Resume_Beta.pdf');

  await page.locator('#btn-remove-resume').click();
  await expect(page.getByRole('heading', { name: /remove active resume/i })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Removal' }).click();

  // Wait for URL cleanup and transition away from Resume Beta (must not snap back)
  await page.waitForURL(/\/builder$/);
  await expect(page.locator('#btn-resume-selector')).not.toContainText('Resume_Beta.pdf');
  await expect(page.getByText(/resume removed successfully/i)).toBeVisible();

  // Reload to confirm no localStorage or auto-save resurrection
  await page.reload();
  await expect(page.locator('#btn-resume-selector')).not.toContainText('Resume_Beta.pdf');

  const afterBetaDeleteRes = await page.request.get('/api/user/resumes', {
    headers: { 'x-forwarded-for': ip },
  });
  const afterBetaDelete = await afterBetaDeleteRes.json();
  expect(afterBetaDelete.resumes.map((r: any) => r.id)).not.toContain(betaId);

  // 4. Open analyzer-only upload (resume_data = NULL) via /builder?resumeId=<gammaId> and remove it
  await page.goto(`/builder?resumeId=${encodeURIComponent(gammaId)}`);
  await expect(page.locator('#btn-resume-selector')).toContainText('Analyzer_Gamma.pdf');

  await page.locator('#btn-remove-resume').click();
  await page.getByRole('button', { name: 'Confirm Removal' }).click();

  await page.waitForURL(/\/builder$/);
  await expect(page.locator('#btn-resume-selector')).toContainText('Resume_Alpha.pdf');

  await page.reload();
  await expect(page.locator('#btn-resume-selector')).toContainText('Resume_Alpha.pdf');

  // 5. Navigate to /dashboard/resumes and remove the final remaining resume (Resume Alpha)
  await page.goto('/dashboard/resumes');
  await expect(page.getByText('(1 saved)')).toBeVisible();
  const alphaCard = page.getByTestId(`resume-card-${alphaId}`);
  await expect(alphaCard).toBeVisible();

  await page.getByTestId(`remove-resume-${alphaId}`).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByTestId('confirm-remove-resume').click();

  await expect(alphaCard).toHaveCount(0);
  await expect(page.getByText('(0 saved)')).toBeVisible();
  await expect(page.getByRole('heading', { name: /no resumes saved yet/i })).toBeVisible();

  // 6. Visit /builder after last resume deletion and verify clean blank state & disabled Remove button
  await page.goto('/builder');
  await expect(page.locator('#btn-remove-resume')).toBeDisabled();
  await expect(page.locator('#btn-resume-selector')).not.toContainText('Resume_Alpha.pdf');
});

test('deleting active resume in /builder switches to next saved resume', async ({ page }) => {
  const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const email = `remove-active-${uniqueSuffix}@example.invalid`;
  const password = 'RemoveResumeTest!2026';
  const ip = `10.88.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;

  const regRes = await page.request.post('/api/auth/register', {
    headers: { 'x-forwarded-for': ip },
    data: {
      fullName: 'Active Resume Removal Tester',
      email,
      password,
      confirmPassword: password,
    },
  });
  expect(regRes.status()).toBe(200);

  const resPrimary = await page.request.post('/api/user/resumes', {
    headers: { 'x-forwarded-for': ip },
    data: {
      createNew: true,
      setActive: true,
      filename: 'Resume_Primary.pdf',
      resumeData: buildResumePayload('Primary Candidate', email),
    },
  });
  expect(resPrimary.status()).toBe(200);
  const primaryId = (await resPrimary.json()).resumeId;

  const resSecondary = await page.request.post('/api/user/resumes', {
    headers: { 'x-forwarded-for': ip },
    data: {
      createNew: true,
      setActive: false,
      filename: 'Resume_Secondary.pdf',
      resumeData: buildResumePayload('Secondary Candidate', email),
    },
  });
  expect(resSecondary.status()).toBe(200);
  const secondaryId = (await resSecondary.json()).resumeId;

  // Visit /builder directly (defaults to active resume: Resume_Primary)
  await page.goto('/builder');
  await expect(page.locator('#btn-resume-selector')).toContainText('Resume_Primary.pdf');

  // Remove active resume Primary directly from /builder
  await page.locator('#btn-remove-resume').click();
  await expect(page.getByRole('heading', { name: /remove active resume/i })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm Removal' }).click();

  // Builder must immediately switch to next available resume: Resume_Secondary
  await expect(page.getByText(/resume removed successfully/i)).toBeVisible();
  await expect(page.locator('#btn-resume-selector')).toContainText('Resume_Secondary.pdf');

  // Verify server state
  const listRes = await page.request.get('/api/user/resumes', {
    headers: { 'x-forwarded-for': ip },
  });
  const list = await listRes.json();
  expect(list.resumes.map((r: any) => r.id)).not.toContain(primaryId);
  expect(list.resumes.map((r: any) => r.id)).toContain(secondaryId);
});

