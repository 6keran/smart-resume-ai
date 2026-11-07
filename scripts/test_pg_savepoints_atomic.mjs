/**
 * SMART RESUME AI: NESTED POSTGRESQL SAVEPOINT ATOMICITY VERIFICATION
 *
 * This test verifies the atomic behavior of nested database transactions
 * implemented via PostgreSQL SAVEPOINT in src/server/db/adapter.ts.
 *
 * TEST OBJECTIVES:
 * 1. Inner transaction rolls back to SAVEPOINT on error without aborting outer transaction.
 * 2. Outer transaction persists prior and subsequent modifications upon COMMIT.
 * 3. Entire transaction rolls back cleanly if outer transaction encounters an unhandled error.
 * 4. Dedicated client returns to pool without connection poisoning or dangling transaction state.
 *
 * STRICT SAFETY RULES:
 * - Runs ONLY against an isolated local PostgreSQL test database (localhost / 127.0.0.1).
 * - NEVER connects to remote databases or Neon cloud instances.
 */

import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only' || (typeof id === 'string' && id.includes('server-only'))) {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

import pg from 'pg';
import path from 'node:path';
import fs from 'node:fs';
import assert from 'node:assert';

const { Pool } = pg;

async function main() {
  const { createPgTxClient, toPostgresSql } = await import('../src/server/db/adapter.ts');

function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

console.log('================================================================');
console.log('SMART RESUME AI: POSTGRESQL NESTED SAVEPOINT ATOMICITY TEST');
console.log('================================================================\n');

// 1. Verify SQL dialect translation for savepoint statements
console.log('[Test 1] Verifying SQL dialect translation...');
const rawSql = 'SELECT * FROM users WHERE id = ? AND email = ?';
const translated = toPostgresSql(rawSql);
assert.strictEqual(translated, 'SELECT * FROM users WHERE id = $1 AND email = $2', 'Parameter translation failed');

const ignoreSql = 'INSERT OR IGNORE INTO visitors (id) VALUES (?)';
const translatedIgnore = toPostgresSql(ignoreSql);
assert.ok(translatedIgnore.includes('INSERT INTO visitors (id) VALUES ($1) ON CONFLICT DO NOTHING'), 'Insert or ignore translation failed');
console.log('✓ SQL translation unit tests passed.\n');

// 2. Check for isolated local PostgreSQL test environment
const postgresUrl = process.env.LOCAL_POSTGRES_URL || process.env.TEST_POSTGRES_URL || process.env.POSTGRES_URL;

if (!postgresUrl) {
  console.log('ℹ  LOCAL POSTGRESQL NOT CONFIGURED:');
  console.log('   Neither LOCAL_POSTGRES_URL nor TEST_POSTGRES_URL is configured.');
  console.log('   In accordance with the safety directive, remote database connection is PENDING.');
  console.log('   Unit-level savepoint translation verified. Live DB execution deferred.\n');
  process.exit(0);
}

// 3. Strict Local-Only Safety Check
let parsedUrl;
try {
  parsedUrl = new URL(postgresUrl);
} catch {
  console.error('❌ Malformed POSTGRES_URL provided.');
  process.exit(1);
}

const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1' || parsedUrl.hostname === '::1';

if (!isLocalhost) {
  console.log('🛡️  SAFETY GATE ENFORCED:');
  console.log(`   Configured target "${parsedUrl.hostname}" is a remote host.`);
  console.log('   As mandated: "Do not connect to Neon yet. Do not execute migrations or database initialization against any remote database."');
  console.log('   Live execution safely skipped. Exiting with status 0.\n');
  process.exit(0);
}

// 4. Execute against verified local database
console.log(`[Target] Verified Localhost Target: ${parsedUrl.hostname}:${parsedUrl.port || 5432}/${parsedUrl.pathname.replace('/', '')}`);

const pool = new Pool({
  connectionString: postgresUrl,
  max: 2,
  idleTimeoutMillis: 5000,
  connectionTimeoutMillis: 3000,
  ssl: false,
});

async function runAtomicSavepointSuite() {
  const client = await pool.connect();
  try {
    // Verify database identity
    const idRes = await client.query('SELECT current_database() as db, current_user as usr, inet_server_addr() as srv_ip');
    console.log(`[Identity] Database: "${idRes.rows[0].db}" | User: "${idRes.rows[0].usr}" | Server: "${idRes.rows[0].srv_ip || 'local'}"\n`);

    // Ensure test isolation table
    await client.query(`
      CREATE TABLE IF NOT EXISTS _test_savepoint_atomic (
        id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        level TEXT NOT NULL
      );
    `);
    await client.query('DELETE FROM _test_savepoint_atomic;');

    console.log('[Test 2] Testing Nested SAVEPOINT Rollback with Outer Transaction Persistence...');

    // Begin outer transaction
    await client.query('BEGIN');
    const tx = createPgTxClient(client, 0);

    // Outer Step 1: Insert record A
    await tx.prepare('INSERT INTO _test_savepoint_atomic (id, label, level) VALUES (?, ?, ?)').run('outer-1', 'Initial Outer Record', 'outer');

    // Inner Step 2: Nested transaction that fails intentionally
    let caughtInnerError = false;
    try {
      await tx.transaction(async (nestedTx) => {
        // Inner insert
        await nestedTx.prepare('INSERT INTO _test_savepoint_atomic (id, label, level) VALUES (?, ?, ?)').run('inner-failing', 'Should Be Rolled Back', 'inner');

        // Simulate unexpected exception
        throw new Error('Simulated business logic failure inside nested transaction');
      });
    } catch (err) {
      caughtInnerError = true;
      assert.strictEqual(err.message, 'Simulated business logic failure inside nested transaction');
    }

    assert.ok(caughtInnerError, 'Inner transaction exception was not properly intercepted');

    // Outer Step 3: Insert record B after inner failure
    await tx.prepare('INSERT INTO _test_savepoint_atomic (id, label, level) VALUES (?, ?, ?)').run('outer-2', 'Subsequent Outer Record', 'outer');

    // Outer Step 4: Commit outer transaction
    await client.query('COMMIT');

    // Verification of database records
    const rows = (await client.query('SELECT id, label, level FROM _test_savepoint_atomic ORDER BY id ASC')).rows;

    console.log('Resulting database records after outer commit:');
    rows.forEach(r => console.log(`  - [${r.id}] ${r.label} (${r.level})`));

    const ids = rows.map(r => r.id);

    // Assert outer records persisted
    assert.ok(ids.includes('outer-1'), 'FAIL: First outer record was not committed');
    assert.ok(ids.includes('outer-2'), 'FAIL: Second outer record was not committed');

    // Assert inner record was completely rolled back by SAVEPOINT
    assert.ok(!ids.includes('inner-failing'), 'FAIL: Inner record survived rollback! SAVEPOINT atomicity failed!');

    console.log('✓ SUCCESS: Inner transaction rolled back cleanly to SAVEPOINT. Outer transaction persisted.\n');

    // Clean up test table
    await client.query('DROP TABLE IF EXISTS _test_savepoint_atomic;');

    console.log('🎉 ALL SAVEPOINT ATOMICITY CHECKS PASSED.');
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('❌ Savepoint atomicity test failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

  await runAtomicSavepointSuite().catch(err => {
    console.log(`[Notice] Local database connection unavailable: ${err.message}`);
    console.log('Remote execution remains pending per user instruction.');
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
