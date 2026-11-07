import fs from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

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

test('registered student completes the career workflow with persisted owned records', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'Run the mutating career workflow once at the desktop viewport.');
  test.setTimeout(240_000);
  const completed: string[] = ['Registered through global setup; session loaded in browser'];
  const stamp = Date.now();
  const candidateName = 'Playwright Test User';
  const targetRole = 'Graduate Software Engineer';
  const graduationYear = new Date().getFullYear() + 1;

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /welcome back, playwright test user/i })).toBeVisible();
  const dashboardBefore = await api(page, '/api/user/dashboard');
  expect(dashboardBefore.status).toBe(200);
  completed.push('Authenticated dashboard returned current account data');

  await page.goto('/dashboard/profile', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /student profile & career goals/i })).toBeVisible();
  const profileInput = {
    institution: 'Playwright Test University',
    degree: 'B.S. Computer Science',
    fieldOfStudy: 'Computer Science',
    graduationYear,
    graduationMonth: 'May',
    currentSemester: 'Final year',
    cgpa: '3.8',
    studentType: 'college_student',
    targetRole,
    targetWorkType: 'full_time',
    preferredLocations: ['Remote'],
    projects: [{
      id: `e2e-profile-project-${stamp}`,
      title: 'Career Workflow Sample Project',
      description: 'A test-only project entry used to validate profile persistence in the isolated E2E database.',
      techStack: ['TypeScript', 'Next.js', 'PostgreSQL'],
      highlights: ['Implemented an authenticated data workflow for browser testing.'],
    }],
    coursework: ['Data Structures', 'Database Systems'],
    achievements: [],
  };
  const profileSaved = await api(page, '/api/student/profile', 'PUT', profileInput);
  expect(profileSaved.status, JSON.stringify(profileSaved.body)).toBe(200);
  const profileReloaded = await api(page, '/api/student/profile');
  expect(profileReloaded.status).toBe(200);
  expect(profileReloaded.body.profile.institution).toBe(profileInput.institution);
  expect(profileReloaded.body.profile.targetRole).toBe(targetRole);
  completed.push('Student profile saved and reloaded for the same account');

  const resumeText = `${candidateName}\nplaywright-test@example.invalid | +1 555 010 2020 | Remote\n\nProfessional Summary\nComputer science student seeking graduate software engineering roles. Builds accessible full-stack applications and works with TypeScript, React, Node.js, and PostgreSQL.\n\nEducation\nB.S. Computer Science, Playwright Test University, ${graduationYear}\n\nSkills\nTypeScript, React, Next.js, Node.js, PostgreSQL, Git\n\nProjects\nCareer Workflow Sample Project\nImplemented a browser-tested application flow using TypeScript, Next.js, and PostgreSQL.\n\nWork Experience\nStudent Developer, Campus Software Lab, Jan 2025 - Present\nBuilt and maintained an accessible project tracking application with validated server-side persistence.`;
  const resumeData = {
    id: `e2e-resume-${stamp}`,
    title: 'E2E Career Workflow Resume',
    candidateType: 'fresher',
    personalInfo: { fullName: candidateName, email: 'playwright-test@example.invalid', phone: '+1 555 010 2020', location: 'Remote', headline: targetRole },
    summary: 'Computer science student seeking graduate software engineering roles with experience building full-stack applications.',
    skills: { technical: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'], soft: ['Communication'], tools: ['Git'] },
    experience: [{ id: 'e2e-exp-1', company: 'Campus Software Lab', role: 'Student Developer', location: 'Remote', startDate: 'Jan 2025', endDate: 'Present', current: true, bulletPoints: ['Built and maintained an accessible project tracking application.'] }],
    education: [{ id: 'e2e-edu-1', degree: 'B.S. Computer Science', institution: profileInput.institution, location: 'Remote', graduationYear: String(graduationYear) }],
    projects: [{ id: 'e2e-project-1', title: 'Career Workflow Sample Project', description: 'Implemented a browser-tested application flow using TypeScript, Next.js, and PostgreSQL.', technologies: ['TypeScript', 'Next.js', 'PostgreSQL'], bullets: ['Implemented authenticated persistence and responsive interfaces.'] }],
    certifications: [],
    templateId: 'graduate-fresher',
    lastUpdated: new Date().toISOString(),
  };
  const resumeSaved = await api(page, '/api/user/resumes', 'POST', { resumeData, filename: 'E2E Career Workflow Resume', fileType: 'application/json', clientLastUpdated: resumeData.lastUpdated });
  expect(resumeSaved.status, JSON.stringify(resumeSaved.body)).toBe(200);
  const resumeId = resumeSaved.body.resumeId;
  expect(resumeId).toBeTruthy();
  const resumeReloaded = await api(page, `/api/user/resumes?id=${encodeURIComponent(resumeId)}`);
  expect(resumeReloaded.status).toBe(200);
  expect(resumeReloaded.body.resume.resumeData.personalInfo.fullName).toBe(candidateName);
  completed.push('Resume builder data saved and reloaded under the authenticated user');

  await page.addInitScript(() => {
    window.print = () => { document.documentElement.dataset.e2ePrintRequested = 'true'; };
  });
  await page.goto(`/builder?resumeId=${encodeURIComponent(resumeId)}`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /resume builder/i })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Full Name *' })).toHaveValue(candidateName);
  await expect(page.getByRole('textbox', { name: 'Email Address *' })).toHaveValue('playwright-test@example.invalid');
  await expect(page.getByRole('textbox', { name: 'Phone Number *' })).toHaveValue('+1 555 010 2020');
  await expect(page.getByRole('textbox', { name: 'Location *' })).toHaveValue('Remote');
  await expect(page.locator('#btn-step-10')).toBeVisible();
  await page.locator('#btn-step-10').click();
  await expect(page.getByRole('heading', { name: /resume ready/i })).toBeVisible();
  await page.getByRole('button', { name: /download pdf/i }).click();
  await expect(page.locator('body')).toHaveClass(/resume-exporting/);
  const pdfBytes = Buffer.from(await page.pdf({ preferCSSPageSize: true, printBackground: true }));
  expect(pdfBytes.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  expect(pdfBytes.byteLength).toBeGreaterThan(1000);
  const pdfPath = path.join(process.cwd(), 'test-results', 'screenshots', 'career-workflow-resume.pdf');
  await fs.mkdir(path.dirname(pdfPath), { recursive: true });
  await fs.writeFile(pdfPath, pdfBytes);
  await testInfo.attach('generated-resume', { path: pdfPath, contentType: 'application/pdf' });
  completed.push('Builder Download PDF initiated; Chromium generated a non-empty PDF from print layout');

  const atsText = resumeText;
  const jobDescription = 'Graduate software engineer role building reliable web applications. Required skills include TypeScript, React, Node.js, PostgreSQL, API design, testing, accessibility, and collaboration.';
  await page.goto('/ats-score', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /ats resume score/i })).toBeVisible();
  const ats = await api(page, '/api/resume/analyze', 'POST', { resumeText: atsText, jobDescription, jobTitle: targetRole, company: 'E2E Test Employer', fileName: 'e2e-resume.txt' });
  expect(ats.status, JSON.stringify(ats.body)).toBe(200);
  expect(ats.body.overallAtsScore).toEqual(expect.any(Number));
  expect(ats.body.analysisEngine).toBe('deterministic-ats');
  const storedAnalyses = await api(page, '/api/user/analyses');
  expect(storedAnalyses.status).toBe(200);
  expect(storedAnalyses.body.analyses.length).toBeGreaterThan(0);
  completed.push('ATS analysis returned an explicit deterministic engine label and persisted for the user');

  await page.goto('/jobs', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /job search & role matcher/i })).toBeVisible();
  const jobMatch = await api(page, '/api/job/match', 'POST', { resumeId, jobId: `e2e-job-${stamp}`, resumeText: atsText, jobTitle: targetRole, company: 'E2E Test Employer', jobDescription });
  expect(jobMatch.status, JSON.stringify(jobMatch.body)).toBe(200);
  expect(jobMatch.body.overallMatchScore).toEqual(expect.any(Number));
  completed.push('Job match ran against the same saved resume/profile context');

  await page.goto('/projects', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /portfolio engineering & milestone workspace/i })).toBeVisible();
  const projectCreated = await api(page, '/api/career/projects', 'POST', {
    title: 'Career Workflow Sample Project',
    difficulty: 'Beginner',
    targetRole,
    techStack: ['TypeScript', 'Next.js', 'PostgreSQL'],
    problemStatement: 'Track student career progress and practice secure persistence.',
    realWorldUseCase: 'A portfolio project used only by this isolated E2E test account.',
    architectureOverview: 'A browser client calls authenticated routes backed by the isolated SQLite database.',
    estimatedComplexity: '2-3 weeks',
    resumeValue: 'Demonstrates full-stack implementation and secure data handling.',
  });
  expect(projectCreated.status, JSON.stringify(projectCreated.body)).toBe(201);
  const projectId = projectCreated.body.project.id;
  const projectsReloaded = await api(page, '/api/career/projects');
  expect(projectsReloaded.status).toBe(200);
  expect(projectsReloaded.body.projects.some((project: { id: string }) => project.id === projectId)).toBe(true);
  const mentor = await api(page, `/api/career/projects/${encodeURIComponent(projectId)}/mentor`, 'POST', { message: 'What is a practical first implementation milestone for this project?' });
  expect(mentor.status, JSON.stringify(mentor.body)).toBe(200);
  expect(mentor.body.reply).toBeTruthy();
  expect(mentor.body.isLive).toBe(false);
  expect(mentor.body.provider).not.toBe('Gemini');
  completed.push('Project Mentor replied with its accurately reported deterministic provider; project persisted');

  await page.goto('/apply-assistant', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /application preparation studio/i })).toBeVisible();
  const applicationCreated = await api(page, '/api/user/applications', 'POST', {
    jobId: `e2e-job-${stamp}`,
    jobTitle: targetRole,
    company: 'E2E Test Employer',
    location: 'Remote',
    source: 'E2E test fixture',
    jobUrl: 'https://example.invalid/e2e-job',
    status: 'Saved',
    notes: 'Disposable isolated workflow test record.',
    resumeId,
    descriptionSnippet: jobDescription,
  });
  expect(applicationCreated.status, JSON.stringify(applicationCreated.body)).toBe(200);
  const applicationId = applicationCreated.body.application.id;
  const requirementAnalysis = await api(page, '/api/career/assistant/analyze', 'POST', { applicationId, title: targetRole, company: 'E2E Test Employer', description: jobDescription, requiredSkills: ['TypeScript', 'React', 'PostgreSQL'] });
  expect(requirementAnalysis.status, JSON.stringify(requirementAnalysis.body)).toBe(200);
  const materials = await api(page, '/api/career/assistant/prepare', 'POST', { applicationId, title: targetRole, company: 'E2E Test Employer', description: jobDescription, requiredSkills: ['TypeScript', 'React', 'PostgreSQL'] });
  expect(materials.status, JSON.stringify(materials.body)).toBe(200);
  expect(materials.body.materials.coverLetter.fullText).toBeTruthy();
  const applicationsReloaded = await api(page, '/api/user/applications');
  const persistedApplication = applicationsReloaded.body.applications.find((application: { id: string }) => application.id === applicationId);
  expect(persistedApplication).toBeTruthy();
  expect(persistedApplication.cover_letter || persistedApplication.coverLetter).toBeTruthy();
  expect(persistedApplication.match_analysis || persistedApplication.matchAnalysis).toBeTruthy();
  completed.push('Application analysis and materials persisted to the same application record');

  await page.goto('/interview-prep', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /technical & behavioral interview practice/i })).toBeVisible();
  const interviewStart = await api(page, '/api/career/interview', 'POST', { action: 'start', targetRole, jobTitle: targetRole, company: 'E2E Test Employer', jobDescription, resumeSnippet: atsText });
  expect(interviewStart.status, JSON.stringify(interviewStart.body)).toBe(200);
  const interviewId = interviewStart.body.session.id;
  expect(interviewStart.body.session.questions.length).toBeGreaterThan(0);
  const interviewReloaded = await api(page, `/api/career/interview?sessionId=${encodeURIComponent(interviewId)}`);
  expect(interviewReloaded.status).toBe(200);
  expect(interviewReloaded.body.session.target_role).toBe(targetRole);
  const question = interviewStart.body.session.questions[0];
  const evaluation = await api(page, '/api/career/interview', 'POST', {
    action: 'evaluate', sessionId: interviewId, questionIndex: 0, question,
    targetRole,
    answer: 'I would first clarify the expected behavior, then implement a small typed API change, add focused tests for success and failure cases, and verify the experience with keyboard and screen reader checks.',
  });
  expect(evaluation.status, JSON.stringify(evaluation.body)).toBe(200);
  const interviewFinish = await api(page, '/api/career/interview', 'POST', { action: 'finish', sessionId: interviewId, overallScore: evaluation.body.evaluation.score, overallFeedback: 'Completed isolated E2E interview preparation.' });
  expect(interviewFinish.status, JSON.stringify(interviewFinish.body)).toBe(200);
  const interviewsReloaded = await api(page, '/api/career/interview');
  expect(interviewsReloaded.status).toBe(200);
  expect(interviewsReloaded.body.sessions.some((session: { id: string }) => session.id === interviewId)).toBe(true);
  completed.push('Interview session, evaluation, and completion persisted to the same user');

  const roadmap = await api(page, `/api/career/roadmap?targetRole=${encodeURIComponent(targetRole)}`);
  expect(roadmap.status, JSON.stringify(roadmap.body)).toBe(200);
  const roadmapData = typeof roadmap.body.roadmap.roadmap_data === 'string' ? JSON.parse(roadmap.body.roadmap.roadmap_data) : roadmap.body.roadmap.roadmap_data;
  expect(Array.isArray(roadmapData.milestones)).toBe(true);
  const roadmapReloaded = await api(page, `/api/career/roadmap?targetRole=${encodeURIComponent(targetRole)}`);
  expect(roadmapReloaded.status).toBe(200);
  expect(roadmapReloaded.body.roadmap.id).toBe(roadmap.body.roadmap.id);
  completed.push('Learning roadmap was created from the target role and reloaded with the same record ID');

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const dashboardAfter = await api(page, '/api/user/dashboard');
  expect(dashboardAfter.status).toBe(200);
  expect(dashboardAfter.body.studentProfile.institution).toBe(profileInput.institution);
  expect(dashboardAfter.body.metrics.totalResumes).toBeGreaterThan(0);
  expect(dashboardAfter.body.metrics.totalAnalyses).toBeGreaterThan(0);
  expect(dashboardAfter.body.metrics.totalApplications).toBeGreaterThan(0);
  const launcher = page.getByRole('button', { name: /open ai assistant/i });
  await expect(launcher).toBeVisible();
  await launcher.click();
  const assistant = page.getByRole('dialog', { name: /smart resume ai assistant/i });
  await assistant.getByPlaceholder(/ask about your resume/i).fill('What is my target role?');
  const chatResponsePromise = page.waitForResponse((response) => response.url().includes('/api/chat'));
  await assistant.getByRole('button', { name: /send message/i }).click();
  const chatResponse = await chatResponsePromise;
  expect(chatResponse.status()).toBe(200);
  const chatPayload = await chatResponse.json();
  expect(chatPayload.isLive).toBe(false);
  expect(chatPayload.provider).toMatch(/AI Assistant Deterministic Engine|Smart Career Copilot Engine/);
  expect(chatPayload.reply).toBeTruthy();
  completed.push('Dashboard reflected persisted records and AI Assistant returned an explicitly labeled fallback');

  await testInfo.attach('career-workflow-results', { body: JSON.stringify({ completed }, null, 2), contentType: 'application/json' });
});

