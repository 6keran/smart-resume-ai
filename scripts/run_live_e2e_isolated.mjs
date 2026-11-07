import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const PORT = 3188;
const BASE_URL = `http://localhost:${PORT}`;

async function waitForServer(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status >= 200 && res.status < 500) {
        return true;
      }
    } catch { }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} failed to become healthy within ${timeoutMs}ms.`);
}

async function runCommand(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n▶ Running: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      stdio: 'inherit',
      shell: true,
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with exit code ${code}`));
    });
    proc.on('error', reject);
  });
}

async function main() {
  console.log('================================================================');
  console.log('🚀 LIVE-SERVER E2E: ISOLATED LOCAL NEXT.JS TEST SERVER');
  console.log('================================================================\n');

  const testDbDir = path.join(process.cwd(), 'data', 'test_sandboxes');
  if (!fs.existsSync(testDbDir)) {
    fs.mkdirSync(testDbDir, { recursive: true });
  }

  const baseDb = path.join(process.cwd(), 'data', 'smart_resume.db');
  const testDbPath = path.join(testDbDir, `live_e2e_${Date.now()}.db`);
  if (fs.existsSync(baseDb)) {
    try { fs.copyFileSync(baseDb, testDbPath); } catch { }
  }

  const serverEnv = {
    PORT: String(PORT),
    NODE_ENV: 'production',
    SQLITE_PATH: testDbPath,
    STAGING_DB_PATH: testDbPath,
    ADMIN_SESSION_SECRET: 'a_very_secure_long_staging_session_secret_32_characters_min',
    SESSION_SECRET: 'a_very_secure_long_staging_session_secret_32_characters_min',
  };

  console.log(`[Server] Booting Next.js on ${BASE_URL} with isolated DB: ${path.basename(testDbPath)}...`);
  const serverProcess = spawn('npx', ['next', 'start', '-p', String(PORT), '-H', 'localhost'], {
    cwd: process.cwd(),
    env: { ...process.env, ...serverEnv },
    stdio: 'pipe',
    shell: true,
  });

  serverProcess.stdout.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`[Next.js Server] ${msg}`);
  });
  serverProcess.stderr.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.error(`[Next.js Server Err] ${msg}`);
  });

  let allPassed = false;
  try {
    console.log(`[Server] Waiting for readiness probe at ${BASE_URL}...`);
    await waitForServer(`${BASE_URL}/`, 30000);
    console.log(`✓ [Server] Ready and healthy at ${BASE_URL}!\n`);

    const testEnv = {
      TEST_BASE_URL: BASE_URL,
      SQLITE_PATH: testDbPath,
      STAGING_DB_PATH: testDbPath,
      ADMIN_SESSION_SECRET: serverEnv.ADMIN_SESSION_SECRET,
      SESSION_SECRET: serverEnv.SESSION_SECRET,
    };

    // 1. Run Complete Auth & Security Suite (Groups 1-6)
    console.log('\n--- SUITE 1: AUTHENTICATION, PRIVILEGE & HTTP SECURITY ---');
    await runCommand('npx', ['tsx', 'scripts/test_auth_security_comprehensive.mjs'], testEnv);
    console.log('✓ Suite 1 passed successfully!');

    // 2. Run 17-Step Student Journey E2E
    console.log('\n--- SUITE 2: COMPLETE 17-STEP STUDENT JOURNEY E2E ---');
    await runCommand('npx', ['tsx', 'scripts/test_student_full_journey_e2e.mjs'], testEnv);
    console.log('✓ Suite 2 passed successfully!');

    allPassed = true;
  } finally {
    console.log('\n[Server] Shutting down isolated test server...');
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        spawnSync('taskkill', ['/pid', String(serverProcess.pid), '/T', '/F']);
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch { }

    await new Promise((r) => setTimeout(r, 600));

    // Cleanup test database with retries
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
        for (const ext of ['-shm', '-wal', '-journal']) {
          if (fs.existsSync(testDbPath + ext)) fs.unlinkSync(testDbPath + ext);
        }
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    console.log('[Server] Isolated server stopped and test database cleaned up.');
  }

  if (!allPassed) {
    process.exit(1);
  }
  console.log('\n================================================================');
  console.log('🎉 ALL LIVE-SERVER E2E TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

main().catch((err) => {
  console.error('\n❌ Live E2E test failed:', err);
  process.exit(1);
});
