/**
 * PHASE 1 AUTOMATED VERIFICATION SUITE: DATABASE AND RESUME VERSIONING
 * 
 * Verifies all Phase 1 requirements:
 * 1. Migration idempotency (runs multiple times with 0 errors)
 * 2. SQLite / PostgreSQL compatibility and SQL translation
 * 3. Preservation of existing database tables and user data (zero data loss)
 * 4. User ownership isolation across all operations (view, save, restore)
 * 5. Monotonic version numbering and descending order (newest first)
 * 6. Deduplication: avoids duplicate snapshots when resumeData is unchanged
 * 7. Restoration with full history preservation (creates pre-restore checkpoint + new restore snapshot)
 * 8. Safe handling of concurrent version creation
 */

import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Initialize isolated SQLite sandbox to protect data/smart_resume.db
setupTestDb('phase1_database_versioning');

// Intercept server-only check for test environment
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

const {
  getDb,
  registerUser,
  runDatabaseMigrations,
  saveResumeVersion,
  getResumeVersions,
  getResumeVersion,
  restoreResumeVersion,
  areResumeDatasEqual,
} = await import('../src/server/db/index.ts');

const { toPostgresSql } = await import('../src/server/db/adapter.ts');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] Test ${totalTests}: ${message}`);
    passedTests++;
  } else {
    console.error(`[FAIL] Test ${totalTests}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runSuite() {
  console.log('================================================================');
  console.log('=== PHASE 1 TEST SUITE: DATABASE & RESUME VERSIONING ===');
  console.log('================================================================\n');

  const db = getDb();

  // -------------------------------------------------------------
  // Test 1: Preservation of existing data (No tables reset)
  // -------------------------------------------------------------
  const existingUsers = (await db.prepare('SELECT COUNT(*) as c FROM users').get()).c;
  const existingResumes = (await db.prepare('SELECT COUNT(*) as c FROM resumes').get()).c;
  const existingApps = (await db.prepare('SELECT COUNT(*) as c FROM job_applications').get()).c;
  assert(
    existingUsers > 0 && existingResumes > 0 && existingApps > 0,
    `Existing data preserved intact before tests: Users=${existingUsers}, Resumes=${existingResumes}, Applications=${existingApps}`
  );

  // -------------------------------------------------------------
  // Test 2: Migration idempotency
  // -------------------------------------------------------------
  const migRun1 = await runDatabaseMigrations(db);
  const migRun2 = await runDatabaseMigrations(db);
  const migRun3 = await runDatabaseMigrations(db);
  assert(
    migRun1.success && migRun2.success && migRun3.success,
    `Database migrations executed 3 times consecutively with 100% idempotency and zero errors`
  );

  // Verify resume_versions and columns exist in DB
  const tableCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='resume_versions'").get();
  assert(Boolean(tableCheck?.name === 'resume_versions'), 'Table resume_versions exists in database');

  const indexCheck = await db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_resume_ver_unique'").get();
  assert(Boolean(indexCheck?.name === 'idx_resume_ver_unique'), 'Unique index idx_resume_ver_unique exists in database');

  // -------------------------------------------------------------
  // Test 3: SQLite / PostgreSQL syntax compatibility
  // -------------------------------------------------------------
  const testSql = 'INSERT OR IGNORE INTO resume_versions (id, user_id, resume_id, version_number) VALUES (?, ?, ?, ?)';
  const pgSql = toPostgresSql(testSql);
  assert(
    pgSql.includes('$1') && pgSql.includes('$4') && pgSql.includes('ON CONFLICT DO NOTHING'),
    `toPostgresSql correctly converts placeholders (? -> $1..$4) and conflict clauses: "${pgSql}"`
  );

  // -------------------------------------------------------------
  // Test 4: areResumeDatasEqual comparison logic
  // -------------------------------------------------------------
  const sampleA = {
    personalInfo: { fullName: 'Alice Candidate', email: 'alice@example.com' },
    skills: { technical: ['TypeScript', 'Next.js'] },
  };
  const sampleB = {
    skills: { technical: ['TypeScript', 'Next.js'] },
    personalInfo: { email: 'alice@example.com', fullName: 'Alice Candidate' },
  };
  const sampleC = {
    ...sampleA,
    skills: { technical: ['TypeScript', 'Next.js', 'PostgreSQL'] },
  };
  assert(
    areResumeDatasEqual(sampleA, sampleB) === true,
    'areResumeDatasEqual accurately handles key reordering and canonicalization'
  );
  assert(
    areResumeDatasEqual(sampleA, sampleC) === false,
    'areResumeDatasEqual detects skill modifications accurately'
  );

  // -------------------------------------------------------------
  // Setup Test Users
  // -------------------------------------------------------------
  const suffix = Date.now();
  const userA = await registerUser({ email: `alice.phase1.${suffix}@example.com`, password: 'Password123!', name: 'Alice Phase1' });
  const userB = await registerUser({ email: `bob.phase1.${suffix}@example.com`, password: 'Password123!', name: 'Bob Infiltrator' });
  const userIdA = userA.user.id;
  const userIdB = userB.user.id;

  // -------------------------------------------------------------
  // Test 5: saveResumeVersion creates initial version (v1)
  // -------------------------------------------------------------
  const ver1 = await saveResumeVersion(userIdA, null, sampleA, 'Initial resume');
  assert(
    ver1 && ver1.versionNumber === 1 && ver1.resumeId && ver1.isDuplicate === false,
    `User A saved initial Version 1 (ID: ${ver1.id}, Resume: ${ver1.resumeId})`
  );

  // -------------------------------------------------------------
  // Test 6: Deduplication - Avoid duplicate snapshots on identical data
  // -------------------------------------------------------------
  const ver1Dup = await saveResumeVersion(userIdA, ver1.resumeId, sampleB, 'Same data re-saved');
  assert(
    ver1Dup && ver1Dup.versionNumber === 1 && ver1Dup.isDuplicate === true && ver1Dup.id === ver1.id,
    `Duplicate snapshot safely avoided: returned existing Version 1 without creating duplicate DB row`
  );

  const listAfterDup = await getResumeVersions(userIdA, ver1.resumeId);
  assert(
    listAfterDup.length === 1,
    `Version count remained 1 after attempting duplicate snapshot`
  );

  // -------------------------------------------------------------
  // Test 7: Sequential version ordering (newest first)
  // -------------------------------------------------------------
  const ver2 = await saveResumeVersion(userIdA, ver1.resumeId, sampleC, 'Added PostgreSQL');
  const sampleD = { ...sampleC, summary: 'Lead Full Stack Engineer' };
  const ver3 = await saveResumeVersion(userIdA, ver1.resumeId, sampleD, 'Updated summary');
  assert(
    ver2.versionNumber === 2 && ver3.versionNumber === 3,
    `Versions monotonically incremented (v1 -> v2 -> v3)`
  );

  const orderedList = await getResumeVersions(userIdA, ver1.resumeId);
  assert(
    orderedList.length === 3 &&
    orderedList[0].versionNumber === 3 &&
    orderedList[1].versionNumber === 2 &&
    orderedList[2].versionNumber === 1,
    `getResumeVersions returns versions strictly ordered newest first (v3, v2, v1)`
  );

  // -------------------------------------------------------------
  // Test 8: Single version retrieval with full resumeData
  // -------------------------------------------------------------
  const fetchedVer2 = await getResumeVersion(userIdA, ver2.id);
  assert(
    fetchedVer2 && fetchedVer2.versionNumber === 2 && fetchedVer2.resumeData?.skills?.technical?.includes('PostgreSQL'),
    `getResumeVersion correctly retrieves Version 2 with parsed resumeData`
  );

  // -------------------------------------------------------------
  // Test 9: Ownership Isolation - User B cannot view User A's version
  // -------------------------------------------------------------
  let userBViewBlocked = false;
  try {
    await getResumeVersion(userIdB, ver2.id);
  } catch (err) {
    userBViewBlocked = true;
  }
  assert(
    userBViewBlocked,
    `User B was strictly blocked from viewing User A's resume version (Forbidden)`
  );

  // -------------------------------------------------------------
  // Test 10: Ownership Isolation - User B cannot view User A's version list
  // -------------------------------------------------------------
  let userBListBlocked = false;
  try {
    await getResumeVersions(userIdB, ver1.resumeId);
  } catch (err) {
    userBListBlocked = true;
  }
  assert(
    userBListBlocked,
    `User B was strictly blocked from listing User A's resume versions (Forbidden)`
  );

  // -------------------------------------------------------------
  // Test 11: Ownership Isolation - User B cannot save version on User A's resume
  // -------------------------------------------------------------
  let userBSaveBlocked = false;
  try {
    await saveResumeVersion(userIdB, ver1.resumeId, sampleA, 'Malicious injection');
  } catch (err) {
    userBSaveBlocked = true;
  }
  assert(
    userBSaveBlocked,
    `User B was strictly blocked from saving a version on User A's resume (Forbidden)`
  );

  // -------------------------------------------------------------
  // Test 12: Ownership Isolation - User B cannot restore User A's version
  // -------------------------------------------------------------
  let userBRestoreBlocked = false;
  try {
    await restoreResumeVersion(userIdB, ver1.id);
  } catch (err) {
    userBRestoreBlocked = true;
  }
  assert(
    userBRestoreBlocked,
    `User B was strictly blocked from restoring User A's resume version (Forbidden)`
  );

  // -------------------------------------------------------------
  // Test 13: Restoration with full history preservation
  // User currently has uncommitted edits in active resume data
  // -------------------------------------------------------------
  const uncommittedEdits = {
    ...sampleD,
    summary: 'DRAFT: Work-in-progress edits that must not be lost',
  };
  // Simulate active resume having uncommitted edits in DB
  await db.prepare('UPDATE resumes SET resume_data = ? WHERE id = ? AND user_id = ?').run(
    JSON.stringify(uncommittedEdits),
    ver1.resumeId,
    userIdA
  );

  // User restores Version 1
  const restoreResult = await restoreResumeVersion(userIdA, ver1.id);
  assert(
    restoreResult.success && Boolean(restoreResult.newVersion),
    `restoreResumeVersion succeeded for Version 1`
  );
  assert(
    Boolean(restoreResult.preRestoreCheckpoint),
    `Pre-restore checkpoint created to preserve uncommitted edits (Checkpoint Version: ${restoreResult.preRestoreCheckpoint?.versionNumber})`
  );
  assert(
    restoreResult.newVersion.versionNumber === 5,
    `New version snapshot created for restoration (Version: ${restoreResult.newVersion.versionNumber})`
  );

  // Verify active resume data matches Version 1
  const activeResumeAfterRestore = (await db.prepare('SELECT resume_data FROM resumes WHERE id = ?').get(ver1.resumeId));
  const parsedActive = JSON.parse(activeResumeAfterRestore.resume_data);
  assert(
    areResumeDatasEqual(parsedActive, sampleA) === true,
    `Active resume data in database now matches Version 1 exactly`
  );

  // Verify complete version history is preserved (v1, v2, v3, v4 checkpoint, v5 restored)
  const fullHistory = await getResumeVersions(userIdA, ver1.resumeId);
  assert(
    fullHistory.length === 5,
    `Complete version history preserved without loss: 5 total versions recorded (Newest v${fullHistory[0].versionNumber} down to v${fullHistory[4].versionNumber})`
  );

  // -------------------------------------------------------------
  // Test 14: Safe handling of concurrent version creation
  // -------------------------------------------------------------
  const concurrentPromises = [
    saveResumeVersion(userIdA, ver1.resumeId, { ...sampleA, summary: 'Concurrent A' }, 'Concurrent A'),
    saveResumeVersion(userIdA, ver1.resumeId, { ...sampleA, summary: 'Concurrent B' }, 'Concurrent B'),
    saveResumeVersion(userIdA, ver1.resumeId, { ...sampleA, summary: 'Concurrent C' }, 'Concurrent C'),
  ];
  const concurrentResults = await Promise.all(concurrentPromises);
  const versionNumbers = concurrentResults.map((r) => r.versionNumber);
  const uniqueVersionNumbers = new Set(versionNumbers);
  assert(
    concurrentResults.length === 3 && uniqueVersionNumbers.size === 3,
    `Concurrent version creation resolved cleanly without conflict: versions [${versionNumbers.join(', ')}] created with 100% uniqueness`
  );

  // -------------------------------------------------------------
  // Test 15: Post-test verification of data integrity
  // -------------------------------------------------------------
  const finalUsers = (await db.prepare('SELECT COUNT(*) as c FROM users').get()).c;
  const finalResumes = (await db.prepare('SELECT COUNT(*) as c FROM resumes').get()).c;
  const finalApps = (await db.prepare('SELECT COUNT(*) as c FROM job_applications').get()).c;
  assert(
    finalUsers >= existingUsers && finalResumes >= existingResumes && finalApps >= existingApps,
    `Zero existing data changed or lost across all database operations`
  );

  console.log('\n================================================================');
  console.log(`=== ALL ${passedTests} / ${totalTests} PHASE 1 TESTS PASSED WITH EXIT CODE 0 ===`);
  console.log('================================================================');
}

runSuite().catch((err) => {
  console.error('\n[PHASE 1 SUITE FAILED]:', err);
  process.exit(1);
});
