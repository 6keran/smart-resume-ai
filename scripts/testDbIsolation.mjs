import fs from 'node:fs';
import path from 'node:path';

/**
 * SMART RESUME AI: TEST DATABASE ISOLATION HELPER
 *
 * Ensures standalone test scripts execute in an isolated sandbox SQLite database.
 * Protects data/smart_resume.db from being modified by test suites.
 * Automatically copies baseline seed data if present and registers cleanup handlers.
 *
 * @param {string} testSuiteName - Identifier for the test suite
 * @returns {{ isolatedDbPath: string, cleanup: () => void }}
 */
export function setupTestDb(testSuiteName = 'test_suite') {
  const rootDir = process.cwd();
  const dataDir = path.join(rootDir, 'data');
  const sandboxDir = path.join(dataDir, 'test_sandboxes');

  // If an isolated test database is already configured in the environment (e.g. by run_live_e2e_isolated.mjs), preserve it
  if (process.env.SQLITE_PATH && process.env.SQLITE_PATH !== path.join(dataDir, 'smart_resume.db')) {
    return {
      isolatedDbPath: process.env.SQLITE_PATH,
      cleanup: () => {},
    };
  }

  if (!fs.existsSync(sandboxDir)) {
    fs.mkdirSync(sandboxDir, { recursive: true });
  } else {
    // Clean up any stale sandbox databases from prior runs
    try {
      const files = fs.readdirSync(sandboxDir);
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(sandboxDir, file));
        } catch {}
      }
    } catch {}
  }

  const baseDb = path.join(dataDir, 'smart_resume.db');
  const safeName = testSuiteName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const tempDbName = `${safeName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.db`;
  const isolatedDbPath = path.join(sandboxDir, tempDbName);

  // If base data/smart_resume.db exists, copy it so test suites have access to seed tables/data
  if (fs.existsSync(baseDb)) {
    try {
      fs.copyFileSync(baseDb, isolatedDbPath);
    } catch {
      // If baseDb is locked for copy, a fresh file will be initialized by getDb()
    }
  }

  process.env.SQLITE_PATH = isolatedDbPath;
  process.env.STAGING_DB_PATH = isolatedDbPath;

  const cleanup = async () => {
    try {
      const dbModule = await import('../src/server/db/index.ts').catch(() => null);
      if (dbModule?.closeDb) {
        await dbModule.closeDb();
      }
    } catch {}
    try {
      if (fs.existsSync(isolatedDbPath)) {
        fs.unlinkSync(isolatedDbPath);
      }
      for (const suffix of ['-wal', '-shm', '-journal']) {
        const sidecar = isolatedDbPath + suffix;
        if (fs.existsSync(sidecar)) {
          try { fs.unlinkSync(sidecar); } catch {}
        }
      }
    } catch {}
  };

  process.on('exit', cleanup);
  return { isolatedDbPath, cleanup };
}

