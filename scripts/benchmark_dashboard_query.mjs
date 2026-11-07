import Module from 'node:module';
import { performance } from 'node:perf_hooks';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

// Ensure test database is initialized
process.env.DB_PROVIDER = 'sqlite';
process.env.PLAYWRIGHT_TEST_DB_PATH = ':memory:';

async function runBenchmark() {
  const { getDb, getUserDashboardData } = await import('../src/server/db/index.ts');
  const { getUnifiedStudentContext, clearStudentContextCache } = await import('../src/server/services/unifiedStudentContext.ts');

  const db = getDb();
  
  // Create a sample user
  const userId = `usr_bench_${Date.now()}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, session_token, created_at, updated_at, last_active_at)
    VALUES (?, 'Benchmark User', ?, 'hash', 'STUDENT', ?, ?, ?, ?)
  `).run(userId, `bench_${Date.now()}@example.com`, `tok_bench_${Date.now()}`, now, now, now);

  // Measure getUserDashboardData before
  const runs = 20;
  const t0 = performance.now();
  for (let i = 0; i < runs; i++) {
    await getUserDashboardData(userId);
  }
  const avgDashboard = (performance.now() - t0) / runs;

  // Measure getUnifiedStudentContext (uncached)
  const t1 = performance.now();
  for (let i = 0; i < runs; i++) {
    clearStudentContextCache(userId);
    await getUnifiedStudentContext(userId);
  }
  const avgUnifiedUncached = (performance.now() - t1) / runs;

  // Measure getUnifiedStudentContext (cached)
  const t2 = performance.now();
  for (let i = 0; i < runs; i++) {
    await getUnifiedStudentContext(userId);
  }
  const avgUnifiedCached = (performance.now() - t2) / runs;

  console.log('--- Performance Measurements ---');
  console.log(`getUserDashboardData (baseline): ${avgDashboard.toFixed(3)} ms / request`);
  console.log(`getUnifiedStudentContext (uncached): ${avgUnifiedUncached.toFixed(3)} ms / request`);
  console.log(`getUnifiedStudentContext (cached): ${avgUnifiedCached.toFixed(3)} ms / request`);
}

runBenchmark().catch(console.error);
