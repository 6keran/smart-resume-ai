import fs from 'node:fs/promises';
import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

test.use({ storageState: process.env.E2E_STORAGE_STATE_PATH });

type ApiResult = { status: number; body: any };
type GeminiRequest = {
  type?: 'provider-status';
  timestamp: string;
  requestId?: string;
  phase?: 'started' | 'completed';
  service?: string;
  provider?: 'Gemini' | 'deterministic';
  model: string | null;
  status?: number | null;
  outcome?: string;
  durationMs?: number;
};
type ServiceResult = {
  service: string;
  apiStatus: number;
  providerStatus: string;
  modelRequests: GeminiRequest[];
};

async function api(page: Page, url: string, method: 'GET' | 'POST' | 'PUT' = 'GET', body?: unknown): Promise<ApiResult> {
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

async function readGeminiRequests(): Promise<GeminiRequest[]> {
  const telemetryPath = process.env.E2E_GEMINI_TELEMETRY_PATH;
  if (!telemetryPath) return [];
  try {
    const content = await fs.readFile(telemetryPath, 'utf8');
    return content.split('\n').filter(Boolean).map((line) => JSON.parse(line) as GeminiRequest);
  } catch {
    return [];
  }
}

test('live Gemini integrations report real provider status and model outcomes', async ({ page }, testInfo) => {
  test.skip(process.env.E2E_LIVE_GEMINI !== '1', 'Live provider calls are opt-in; deterministic fallback coverage runs separately.');
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'AI calls mutate only the disposable account and run once.');
  test.setTimeout(1_200_000);

  const results: ServiceResult[] = [];
  const reportPath = 'test-results/diagnostics/gemini-live-services.partial.json';
  const saveProgress = async () => {
    await fs.mkdir('test-results/diagnostics', { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify({
      updatedAt: new Date().toISOString(),
      keyLoaded: true,
      secretValuesRecorded: false,
      services: results,
      modelRequestTotals: {
        successful: results.flatMap((result) => result.modelRequests).filter((request) => request.outcome === 'success').length,
        failed: results.flatMap((result) => result.modelRequests).filter((request) => request.phase === 'completed' && request.outcome !== 'success').length,
      },
    }, null, 2));
  };
  const call = async (
    service: string,
    url: string,
    method: 'GET' | 'POST' | 'PUT',
    body: unknown,
    providerStatus: (result: ApiResult) => string
  ) => {
    const before = await readGeminiRequests();
    let result: ApiResult;
    try {
      result = await api(page, url, method, body);
    } catch (error) {
      result = { status: 0, body: { message: error instanceof Error ? error.message : 'Browser request failed.' } };
    }
    const after = await readGeminiRequests();
    const newRequests = after.slice(before.length);
    const serviceStatus = [...newRequests].reverse().find((request) => request.type === 'provider-status' && request.service === service);
    const reportedProvider = serviceStatus
      ? serviceStatus.provider === 'Gemini' ? `Gemini/live (${serviceStatus.model})` : 'deterministic fallback'
      : providerStatus(result);
    results.push({ service, apiStatus: result.status, providerStatus: reportedProvider, modelRequests: newRequests });
    await saveProgress();
    return result;
  };

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  const role = 'Graduate Software Engineer';
  const company = 'E2E Test Employer';
  const resumeText = `Playwright Test User\nplaywright-test@example.invalid | +1 555 010 2020 | Remote\n\nProfessional Summary\nComputer science student seeking graduate software engineering roles. Builds accessible full-stack applications using TypeScript, React, Next.js, Node.js, and PostgreSQL.\n\nEducation\nB.S. Computer Science, Playwright Test University, ${new Date().getFullYear() + 1}\n\nSkills\nTypeScript, React, Next.js, Node.js, PostgreSQL, Git, REST API, Unit Testing\n\nProjects\nCampus Project Tracker\nImplemented a secure student project tracker using TypeScript, Next.js, and PostgreSQL. Added accessible forms and API validation.\n\nWork Experience\nStudent Developer, Campus Software Lab, Jan 2025 - Present\nBuilt and maintained a project tracking application with validated server-side persistence and automated tests.`;
  const jobDescription = 'Graduate software engineer role building reliable web applications. Required skills include TypeScript, React, Next.js, Node.js, PostgreSQL, API design, testing, accessibility, and collaboration.';
  const profile = await api(page, '/api/student/profile', 'PUT', {
    institution: 'Playwright Test University', degree: 'B.S. Computer Science', fieldOfStudy: 'Computer Science',
    graduationYear: new Date().getFullYear() + 1, graduationMonth: 'May', currentSemester: 'Final year', cgpa: '3.8',
    studentType: 'college_student', targetRole: role, targetWorkType: 'full_time', preferredLocations: ['Remote'],
    projects: [{ id: 'live-e2e-profile-project', title: 'Campus Project Tracker', description: 'A test-only project fixture.', techStack: ['TypeScript', 'Next.js', 'PostgreSQL'], highlights: ['Added validated persistence.'] }],
    coursework: ['Data Structures', 'Database Systems'], achievements: [],
  });
  expect(profile.status, JSON.stringify(profile.body)).toBe(200);

  const ats = await call('ATS resume analysis', '/api/resume/analyze', 'POST', { resumeText, jobDescription, jobTitle: role, company, fileName: 'e2e-resume.txt' }, (r) => r.body?.analysisEngine || 'provider status missing');
  expect(ats.status, JSON.stringify(ats.body)).toBe(200);

  const improve = await call('Resume improver', '/api/resume/improve', 'POST', { sectionName: 'Work Experience', originalContent: 'Built web application features and helped improve database reliability.', jobDescription, jobTitle: role }, (r) => 'API does not expose provider status');
  expect(improve.status, JSON.stringify(improve.body)).toBe(200);

  const jobMatch = await call('Job match', '/api/job/match', 'POST', { resumeText, jobTitle: role, company, jobDescription }, (r) => r.body?.provider || 'API does not expose provider status');
  expect(jobMatch.status, JSON.stringify(jobMatch.body)).toBe(200);

  const mentor = await call('Project Mentor', '/api/career/projects/e2e-project-context/mentor', 'POST', { message: 'What is the first practical milestone for a TypeScript and PostgreSQL student project?' }, (r) => r.body?.isLive ? 'Gemini/live' : r.body?.provider || 'provider status missing');
  expect(mentor.status, JSON.stringify(mentor.body)).toBe(200);

  const materials = await call('Application materials', '/api/career/assistant/prepare', 'POST', { title: role, company, description: jobDescription, requiredSkills: ['TypeScript', 'React', 'PostgreSQL'] }, (r) => r.body?.materials?.isLiveAi ? 'Gemini/live' : r.body?.materials?.provider || 'provider status missing');
  expect(materials.status, JSON.stringify(materials.body)).toBe(200);

  const interview = await call('Interview question generation', '/api/career/interview', 'POST', { action: 'start', targetRole: role, jobTitle: role, company, jobDescription, resumeSnippet: resumeText }, (r) => r.body?.provider || 'API does not expose provider status');
  expect(interview.status, JSON.stringify(interview.body)).toBe(200);
  const chatbot = await call('AI Assistant chat', '/api/chat', 'POST', { message: 'Can you suggest one practical way to prepare for a graduate software engineering interview?' }, (r) => r.body?.isLive ? 'Gemini/live' : r.body?.provider || 'provider status missing');
  expect(chatbot.status, JSON.stringify(chatbot.body)).toBe(200);

  const report = {
    generatedAt: new Date().toISOString(),
    keyLoaded: true,
    secretValuesRecorded: false,
    services: results,
    modelRequestTotals: {
        successful: results.flatMap((result) => result.modelRequests).filter((request) => request.phase === 'completed' && request.outcome === 'success').length,
        failed: results.flatMap((result) => result.modelRequests).filter((request) => request.phase === 'completed' && request.outcome !== 'success').length,
    },
  };
  const finalReportPath = 'test-results/diagnostics/gemini-live-services.json';
  await fs.writeFile(finalReportPath, JSON.stringify(report, null, 2));
  await testInfo.attach('live-gemini-service-results', { path: finalReportPath, contentType: 'application/json' });
  console.log(JSON.stringify(report, null, 2));

  for (const service of results) {
    expect(service.modelRequests.some((request) => request.phase === 'started'), `${service.service} should attempt a real Gemini API request`).toBe(true);
    expect(service.modelRequests.some((request) => request.phase === 'completed' && request.outcome === 'success'), `${service.service} should receive at least one successful Gemini model response`).toBe(true);
  }

  expect(ats.body.analysisEngine, 'ATS must identify whether the provider result was Gemini or deterministic').toBe('gemini');
  expect(mentor.body.isLive, 'Project Mentor must not label deterministic output as live Gemini').toBe(true);
  expect(materials.body.materials.isLiveAi, 'Application materials must not label deterministic output as live Gemini').toBe(true);
  expect(chatbot.body.isLive, 'AI Assistant must not label deterministic output as live Gemini').toBe(true);
  for (const serviceName of ['Resume improver', 'Job match', 'Interview question generation']) {
    const service = results.find((result) => result.service === serviceName);
    expect(service?.providerStatus, `${serviceName} must be explicitly attributed by test-only provider telemetry`).toMatch(/^Gemini\/live/);
  }
});
