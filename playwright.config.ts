import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const testDatabasePath = process.env.PLAYWRIGHT_TEST_DB_PATH;
const testStorageStatePath = process.env.E2E_STORAGE_STATE_PATH;
if (!testDatabasePath || !testStorageStatePath || process.env.PLAYWRIGHT_TEST !== '1') {
  throw new Error('Run Playwright through the npm test scripts so the per-run SQLite database and credentials are isolated.');
}

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  outputDir: './test-results/playwright',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { outputFolder: 'test-results/report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-375x812', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
    { name: 'mobile-390x844', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'tablet-768x1024', use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1440x900', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: 'npx next dev -H 127.0.0.1 -p 3100',
    url: 'http://127.0.0.1:3100',
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      PLAYWRIGHT_TEST: '1',
      PLAYWRIGHT_TEST_DB_PATH: testDatabasePath,
      DB_PROVIDER: 'sqlite',
      DATABASE_URL: '',
      POSTGRES_URL: '',
      FORCE_POSTGRES: '',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@smartresume.ai',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@SmartResume2026!',
      E2E_LIVE_GEMINI: process.env.E2E_LIVE_GEMINI || '0',
      E2E_GEMINI_TELEMETRY_PATH: process.env.E2E_GEMINI_TELEMETRY_PATH || '',
      GEMINI_API_KEY: process.env.E2E_LIVE_GEMINI === '1' ? (process.env.E2E_GEMINI_API_KEY || '') : '',
      GOOGLE_API_KEY: '',
      PORT: '3100',
    },
  },
});
