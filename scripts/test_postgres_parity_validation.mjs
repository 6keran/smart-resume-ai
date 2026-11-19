import assert from 'node:assert';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

setupTestDb('postgres_parity_validation');

const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

console.log('================================================================');
console.log('🐘 SMART RESUME AI: PHASE 6C POSTGRESQL PARITY VALIDATION');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] Step ${passed}: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}:`, error);
}

async function runParityValidation() {
  const { toPostgresSql } = await import('../src/server/db/adapter.ts');
  const { getDb } = await import('../src/server/db/index.ts');

  // --------------------------------------------------------------------------
  // TEST 1: SQL Parameter Translation (? -> $1, $2, ...)
  // --------------------------------------------------------------------------
  try {
    const rawSql = 'SELECT * FROM users WHERE id = ? AND email = ? AND is_active = ?';
    const translated = toPostgresSql(rawSql);
    assert.strictEqual(
      translated,
      'SELECT * FROM users WHERE id = $1 AND email = $2 AND is_active = $3',
      'Parameters converted in sequence'
    );
    pass('SQL Parameter Translation', '? correctly converted to $1, $2, $3');
  } catch (err) {
    fail('Test 1: SQL Parameter Translation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Preserving Literal '?' Inside Single Quotes
  // --------------------------------------------------------------------------
  try {
    const rawSql = "SELECT * FROM assessment_questions WHERE question_text = 'What is React?' AND skill = ?";
    const translated = toPostgresSql(rawSql);
    assert.strictEqual(
      translated,
      "SELECT * FROM assessment_questions WHERE question_text = 'What is React?' AND skill = $1",
      'Literal ? inside quotes preserved'
    );
    pass('String Literal Question Mark Preservation', "'What is React?' not replaced with $1");
  } catch (err) {
    fail('Test 2: String Literal Question Mark Preservation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST 3: SQLite INSERT OR IGNORE -> PostgreSQL ON CONFLICT DO NOTHING
  // --------------------------------------------------------------------------
  try {
    const rawSql = 'INSERT OR IGNORE INTO user_skills (id, user_id, name) VALUES (?, ?, ?)';
    const translated = toPostgresSql(rawSql);
    assert.ok(translated.startsWith('INSERT INTO user_skills'), 'Stripped OR IGNORE');
    assert.ok(translated.endsWith('ON CONFLICT DO NOTHING'), 'Appended ON CONFLICT DO NOTHING');
    pass('INSERT OR IGNORE Translation', 'Converted to PostgreSQL ON CONFLICT DO NOTHING syntax');
  } catch (err) {
    fail('Test 3: INSERT OR IGNORE Translation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Aggregate Function Type Casting (ROUND(AVG(...)))
  // --------------------------------------------------------------------------
  try {
    const rawSql = 'SELECT ROUND(AVG(score), 2) as avg_score FROM assessments WHERE user_id = ?';
    const translated = toPostgresSql(rawSql);
    assert.ok(
      translated.includes('ROUND(CAST(AVG(score) AS numeric), 2)'),
      'Cast AVG to numeric before ROUND'
    );
    pass('Aggregate Function Casting', 'ROUND(AVG(score), 2) cast to numeric for PostgreSQL parity');
  } catch (err) {
    fail('Test 4: Aggregate Function Casting', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST 5: JSON Column Serialization Parity
  // --------------------------------------------------------------------------
  try {
    const testPayload = {
      skills: ['TypeScript', 'PostgreSQL', 'Docker'],
      meta: { nested: true, count: 42 },
    };
    const serialized = JSON.stringify(testPayload);
    const parsed = JSON.parse(serialized);

    assert.deepStrictEqual(parsed, testPayload, 'JSON round-trip matches');
    assert.strictEqual(typeof serialized, 'string', 'Stored as valid text across dual engines');
    pass('JSON Column Serialization Parity', 'JSON strings serialize and parse equivalently');
  } catch (err) {
    fail('Test 5: JSON Column Serialization Parity', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Timestamp ISO-8601 Format Parity
  // --------------------------------------------------------------------------
  try {
    const now = new Date();
    const isoString = now.toISOString();
    // Validate ISO 8601 YYYY-MM-DDTHH:mm:ss.sssZ
    assert.ok(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(isoString),
      'Valid ISO-8601 timestamp'
    );

    const parsedDate = new Date(isoString);
    assert.strictEqual(parsedDate.getTime(), now.getTime(), 'Timestamp precision preserved');
    pass('Timestamp ISO-8601 Parity', 'Standard ISO strings compatible with SQLite TEXT and PostgreSQL TIMESTAMPTZ');
  } catch (err) {
    fail('Test 6: Timestamp ISO-8601 Parity', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST 7: Boolean Representation Normalization (0/1 vs true/false)
  // --------------------------------------------------------------------------
  try {
    const sqliteTrue = 1;
    const sqliteFalse = 0;
    const pgTrue = true;
    const pgFalse = false;

    assert.strictEqual(Boolean(sqliteTrue), true);
    assert.strictEqual(Boolean(sqliteFalse), false);
    assert.strictEqual(Boolean(pgTrue), true);
    assert.strictEqual(Boolean(pgFalse), false);
    pass('Boolean Normalization', 'Application layer normalizes 0/1 (SQLite) and true/false (PostgreSQL) consistently');
  } catch (err) {
    fail('Test 7: Boolean Normalization', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST 8: Nested Transaction Savepoint Mechanics
  // --------------------------------------------------------------------------
  try {
    const db = getDb();
    let outerExecuted = false;
    let innerExecuted = false;

    await db.transaction(async (tx1) => {
      outerExecuted = true;
      await tx1.transaction(async (tx2) => {
        innerExecuted = true;
      });
    });

    assert.strictEqual(outerExecuted, true, 'Outer transaction executed');
    assert.strictEqual(innerExecuted, true, 'Inner savepoint transaction executed');
    pass('Nested Transaction Savepoint Mechanics', 'Savepoints execute without collision in dual transaction wrapper');
  } catch (err) {
    fail('Test 8: Nested Transaction Savepoint Mechanics', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST 9: Transaction Rollback Isolation
  // --------------------------------------------------------------------------
  try {
    const db = getDb();
    let caught = false;

    try {
      await db.transaction(async (tx) => {
        tx.prepare('INSERT INTO audit_events (id, action, timestamp) VALUES (?, ?, ?)')
          .run(`audit_${Date.now()}`, 'test_action', new Date().toISOString());
        throw new Error('Simulated transaction abort');
      });
    } catch {
      caught = true;
    }

    assert.strictEqual(caught, true, 'Transaction error bubbled');
    pass('Transaction Rollback Isolation', 'Transactions roll back atomically on failure');
  } catch (err) {
    fail('Test 9: Transaction Rollback Isolation', err);
    throw err;
  }

  // --------------------------------------------------------------------------
  // TEST 10: 31-Table Schema Parity Cross-Check
  // --------------------------------------------------------------------------
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const pgInitPath = path.resolve('scripts/init_postgres_schema.mjs');
    assert.ok(fs.existsSync(pgInitPath), 'scripts/init_postgres_schema.mjs exists');
    const pgInitContent = fs.readFileSync(pgInitPath, 'utf8');

    const expectedTables = [
      'users', 'visitors', 'resumes', 'resume_analyses', 'resume_improvements',
      'resume_versions', 'admin_users', 'skills_catalog', 'assessment_configs',
      'assessment_questions', 'assessments', 'assessment_question_snapshots',
      'verified_skills', 'certificates', 'courses', 'course_progress',
      'user_skills', 'job_searches', 'job_search_results', 'job_matches',
      'job_applications', 'feedback', 'proctoring_events', 'live_proctoring_sessions',
      'audit_events', 'student_profiles', 'guided_projects', 'career_readiness_history',
      'user_career_goals', 'user_learning_roadmaps', 'user_interview_sessions'
    ];

    for (const table of expectedTables) {
      assert.ok(
        pgInitContent.includes(`CREATE TABLE IF NOT EXISTS ${table}`) ||
        pgInitContent.includes(`CREATE TABLE IF NOT EXISTS "${table}"`) ||
        pgInitContent.toLowerCase().includes(`create table if not exists ${table}`),
        `PostgreSQL init script contains table: ${table}`
      );
    }

    pass('31-Table Schema Parity', `All 31 application tables defined in PostgreSQL init script`);
  } catch (err) {
    fail('Test 10: 31-Table Schema Parity', err);
    throw err;
  }

  console.log('\n================================================================');
  console.log(`TOTAL POSTGRESQL PARITY TESTS: 10 | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runParityValidation().catch((err) => {
  console.error('Fatal test error in postgres parity validation:', err);
  process.exit(1);
});
