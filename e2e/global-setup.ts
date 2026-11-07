import { request, type FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL;
  const storagePath = process.env.E2E_STORAGE_STATE_PATH;
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (typeof baseURL !== 'string' || !storagePath || !email || !password) {
    throw new Error('Playwright authenticated setup requires a local base URL, isolated storage path, and test credentials.');
  }

  const context = await request.newContext({ baseURL });
  try {
    const registration = await context.post('/api/auth/register', {
      data: { fullName: 'Playwright Test User', email, password, confirmPassword: password },
    });
    if (registration.status() !== 200) {
      throw new Error(`Isolated test account registration failed with HTTP ${registration.status()}.`);
    }
    await context.storageState({ path: storagePath });
  } finally {
    await context.dispose();
  }
}
