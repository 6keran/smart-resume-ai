import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'node:http';
import Module from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '..');
const sandboxRoot = path.join(projectRoot, 'data', 'test_sandboxes');
const databasePath = path.join(
  sandboxRoot,
  `account-deletion-session-${process.pid}-${Date.now()}.sqlite`
);

fs.mkdirSync(sandboxRoot, { recursive: true });

process.env.ADMIN_SESSION_SECRET = 'account-deletion-session-test-secret-at-least-32-characters';
process.env.SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
process.env.DB_PROVIDER = 'sqlite';
process.env.PLAYWRIGHT_TEST = '1';
process.env.PLAYWRIGHT_TEST_DB_PATH = databasePath;
process.env.SQLITE_PATH = databasePath;
process.env.STAGING_DB_PATH = databasePath;
process.env.DATABASE_URL = '';
process.env.POSTGRES_URL = '';
process.env.FORCE_POSTGRES = '';
process.env.NODE_ENV = 'production';
process.env.NEXT_TELEMETRY_DISABLED = '1';

const originalLoad = Module._load;
Module._load = function loadForAccountDeletionSessionTest(id, ...args) {
  const normalizedId = typeof id === 'string' ? id.replaceAll('\\', '/') : '';
  if (id === 'server-only' || normalizedId.endsWith('/node_modules/server-only/index.js')) {
    return {};
  }
  return originalLoad.apply(this, [id, ...args]);
};

Module.registerHooks({
  resolve(specifier, context, nextResolve) {
    let candidateUrl;
    if (specifier.startsWith('@/')) {
      candidateUrl = pathToFileURL(path.join(projectRoot, 'src', specifier.slice(2)));
    } else if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.startsWith(pathToFileURL(projectRoot).href)
    ) {
      candidateUrl = new URL(specifier, context.parentURL);
    }

    if (candidateUrl) {
      const candidatePath = fileURLToPath(candidateUrl);
      if (!path.extname(candidatePath)) {
        for (const extension of ['.ts', '.tsx', '.js', '.mjs']) {
          const resolvedPath = `${candidatePath}${extension}`;
          if (fs.existsSync(resolvedPath)) {
            return { shortCircuit: true, url: pathToFileURL(resolvedPath).href };
          }
          const indexPath = path.join(candidatePath, `index${extension}`);
          if (fs.existsSync(indexPath)) {
            return { shortCircuit: true, url: pathToFileURL(indexPath).href };
          }
        }
      }
    }
    return nextResolve(specifier, context);
  },
});

async function reservePort() {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise((resolve, reject) => probe.close((error) => (error ? reject(error) : resolve())));
  return port;
}

let app;
let server;
let closeDb;

try {
  const dbModule = await import('../src/server/db/index.ts');
  const { createSessionToken, deleteUserAndData, getDb } = dbModule;
  closeDb = dbModule.closeDb;
  const db = getDb();
  const userId = `session-delete-target-${Date.now()}`;
  const email = `session-delete-${process.pid}@example.test`;
  const sessionToken = createSessionToken({ id: userId, email, role: 'USER' });
  const now = new Date().toISOString();

  await db.prepare(`
    INSERT INTO users (id, name, email, session_token, created_at, updated_at, last_active_at, role, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'USER', 1)
  `).run(userId, 'Session Deletion User', email, sessionToken, now, now, now);

  const port = await reservePort();
  const nextModule = await import('next');
  const next = nextModule.default;
  app = next({
    dev: false,
    dir: projectRoot,
    hostname: '127.0.0.1',
    port,
    quiet: true,
  });
  await app.prepare();
  const handle = app.getRequestHandler();

  server = createServer((request, response) => {
    void handle(request, response).catch((error) => {
      console.error(error);
      if (!response.headersSent) response.statusCode = 500;
      response.end('Internal Server Error');
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  const headers = { cookie: `sra_user_session=${encodeURIComponent(sessionToken)}` };
  const beforeApi = await fetch(`${baseUrl}/api/user/my-data`, { headers, redirect: 'manual' });
  assert.equal(beforeApi.status, 200, 'session cookie must authenticate before account deletion');

  await deleteUserAndData(userId, {
    id: 'account-deletion-session-test-admin',
    email: 'account-deletion-session-admin@example.test',
  });

  const afterApi = await fetch(`${baseUrl}/api/user/my-data`, { headers, redirect: 'manual' });
  assert.equal(afterApi.status, 401, 'deleted user session must receive 401 from protected API');

  const afterPage = await fetch(`${baseUrl}/dashboard`, { headers, redirect: 'manual' });
  assert.ok(
    [307, 308].includes(afterPage.status),
    `deleted user session must be redirected from protected page, received ${afterPage.status}`
  );
  const location = afterPage.headers.get('location') || '';
  assert.ok(location.includes('/login'), `protected page redirect must target login, received ${location}`);

  console.log('[PASS] Protected API accepted the session before deletion (200)');
  console.log('[PASS] Protected API rejected the deleted user session (401)');
  console.log(`[PASS] Protected page redirected the deleted user session (${afterPage.status} ${location})`);
  console.log('Account deletion session invalidation: 3/3 checks passed.');
} finally {
  if (server) {
    server.closeIdleConnections?.();
    await new Promise((resolve) => server.close(() => resolve()));
  }
  if (app) {
    await app.close();
  }
  if (closeDb) {
    await closeDb();
  }

  for (const filePath of [
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
    `${databasePath}-journal`,
  ]) {
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(`${path.resolve(sandboxRoot)}${path.sep}`)) {
      throw new Error(`Unsafe account deletion session test cleanup path: ${resolvedPath}`);
    }
    if (fs.existsSync(resolvedPath)) {
      try {
        fs.rmSync(resolvedPath, { force: true });
      } catch (error) {
        if (error?.code !== 'EPERM') throw error;
        console.log(`[INFO] Deferred sandbox cleanup until process exit: ${resolvedPath}`);
      }
    }
  }
}
