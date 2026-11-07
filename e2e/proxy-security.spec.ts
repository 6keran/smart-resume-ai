import { expect, test } from './fixtures';

test('unauthenticated route guards and registration rate limit retain their security behavior', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440x900', 'Security behavior is not viewport dependent; run once.');

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/login\?from=%2Fdashboard/);

  const protectedApi = await page.request.get('/api/user/resumes');
  expect(protectedApi.status()).toBe(401);
  await expect(protectedApi.json()).resolves.toMatchObject({ error: 'Unauthorized. Please log in.' });

  const adminPage = await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  expect(adminPage).not.toBeNull();
  await expect(page).toHaveURL(/\/admin\/login\?from=%2Fadmin%2Fdashboard/);
  const adminApi = await page.request.get('/api/admin/users');
  expect(adminApi.status()).toBe(401);

  const requestHeaders = { 'x-forwarded-for': '198.51.100.47' };
  const validationStatuses: number[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await page.request.post('/api/auth/register', { headers: requestHeaders, data: {} });
    validationStatuses.push(response.status());
    expect(response.status()).toBe(400);
  }
  const limited = await page.request.post('/api/auth/register', { headers: requestHeaders, data: {} });
  expect(limited.status()).toBe(429);
  expect(validationStatuses).toEqual([400, 400, 400, 400, 400]);
});


