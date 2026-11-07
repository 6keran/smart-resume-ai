import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
const originalEnv = { ...process.env };
const runId = randomUUID();
const dataDir = path.resolve(root, 'test-results', 'db');
const runStem = `playwright-${runId}`;
const databasePath = path.join(dataDir, `${runStem}.sqlite`);
const storagePath = path.join(dataDir, `${runStem}.auth.json`);
const telemetryDir = path.join(root, 'test-results', 'diagnostics');
const telemetryPath = path.join(telemetryDir, `gemini-${runId}.jsonl`);
let liveGeminiKey = '';
if (process.env.E2E_LIVE_GEMINI === '1') {
  const nextEnv = await import('@next/env');
  const loadEnvConfig = nextEnv.loadEnvConfig || nextEnv.default?.loadEnvConfig;
  if (typeof loadEnvConfig !== 'function') throw new Error('Unable to load local Next.js environment for the requested live Gemini test.');
  loadEnvConfig(root);
  liveGeminiKey = process.env.E2E_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  for (const key of Object.keys(process.env)) if (!(key in originalEnv)) delete process.env[key];
  Object.assign(process.env, originalEnv);
  if (!liveGeminiKey) throw new Error('Live Gemini was requested, but no key is configured in E2E_GEMINI_API_KEY or the local Next.js environment. The key value is never printed.');
}
const email = process.env.E2E_TEST_EMAIL || `e2e-${runId}@example.invalid`;
const password = process.env.E2E_TEST_PASSWORD || randomBytes(24).toString('base64url');

if (Boolean(process.env.E2E_TEST_EMAIL) !== Boolean(process.env.E2E_TEST_PASSWORD)) {
  throw new Error('Set both E2E_TEST_EMAIL and E2E_TEST_PASSWORD, or leave both unset to use a disposable local test identity.');
}

await mkdir(dataDir, { recursive: true });
await mkdir(telemetryDir, { recursive: true });
const cli = path.join(root, 'node_modules', 'playwright', 'cli.js');
const child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
  cwd: root,
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_TEST: '1',
    PLAYWRIGHT_RUN_ID: runId,
    PLAYWRIGHT_TEST_DB_PATH: databasePath,
    E2E_STORAGE_STATE_PATH: storagePath,
    E2E_TEST_EMAIL: email,
    E2E_TEST_PASSWORD: password,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@smartresume.ai',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@SmartResume2026!',
    E2E_LIVE_GEMINI: liveGeminiKey ? '1' : '0',
    E2E_GEMINI_API_KEY: liveGeminiKey,
    E2E_GEMINI_TELEMETRY_PATH: telemetryPath,
    DB_PROVIDER: 'sqlite',
    DATABASE_URL: '',
    POSTGRES_URL: '',
    FORCE_POSTGRES: '',
    GEMINI_API_KEY: '',
    GOOGLE_API_KEY: '',
  },
});

let exitCode = 1;
try {
  const result = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  exitCode = result.code ?? (result.signal ? 1 : 0);
} finally {
  const safeRunFile = (candidate) => {
    const resolved = path.resolve(candidate);
    const relative = path.relative(dataDir, resolved);
    return !relative.startsWith('..') && !path.isAbsolute(relative) && path.basename(resolved).startsWith(`${runStem}.`);
  };
  for (const candidate of [databasePath, `${databasePath}-wal`, `${databasePath}-shm`, storagePath]) {
    if (safeRunFile(candidate)) await rm(candidate, { force: true }).catch(() => {});
  }
}

process.exitCode = exitCode;
