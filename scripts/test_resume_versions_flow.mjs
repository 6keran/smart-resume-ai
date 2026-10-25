import assert from 'node:assert';
import Module from 'node:module';

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
  saveUserResume,
  saveResumeVersion,
  getResumeVersions,
  getResumeVersion,
  restoreResumeVersion,
  areResumeDatasEqual,
  isClientDraftResumeId,
} = await import('../src/server/db/index.ts');

const { toPostgresSql } = await import('../src/server/db/adapter.ts');

console.log('================================================================');
console.log('=== REGRESSION TEST: RESUME VERSIONS FLOW & AUTHORIZATION ===');
console.log('================================================================\n');

async function runTests() {
  const db = getDb();

  // Step 0: Record initial database counts to verify zero data loss
  const initialUsers = (await db.prepare('SELECT COUNT(*) as count FROM users').get())?.count ?? 0;
  const initialResumes = (await db.prepare('SELECT COUNT(*) as count FROM resumes').get())?.count ?? 0;
  const initialVersions = (await db.prepare('SELECT COUNT(*) as count FROM resume_versions').get())?.count ?? 0;

  console.log(`[STATE] Initial counts: Users=${initialUsers}, Resumes=${initialResumes}, Versions=${initialVersions}\n`);

  const testSuffix = `vertest_${Date.now()}`;
  const userAEmail = `alice.${testSuffix}@example.com`;
  const userBEmail = `bob.${testSuffix}@example.com`;

  const regA = await registerUser({ email: userAEmail, password: 'Password123!', name: 'Alice Versions' });
  const regB = await registerUser({ email: userBEmail, password: 'Password123!', name: 'Bob Infiltrator' });
  const userA = regA.user;
  const userB = regB.user;

  console.log(`[SETUP] Registered test users: User A (${userA.id}), User B (${userB.id})`);

  // --------------------------------------------------------------------------
  // Scenario 3A: Draft ID classification
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 3A: Draft ID Classification ---');
  assert.strictEqual(isClientDraftResumeId('res_fresher_02'), true, 'res_fresher_02 is recognized as client draft');
  assert.strictEqual(isClientDraftResumeId('res_default'), true, 'res_default is recognized as client draft');
  assert.strictEqual(isClientDraftResumeId('res_sample_01'), true, 'res_sample_01 is recognized as client draft');
  assert.strictEqual(isClientDraftResumeId('draft_temp_123'), true, 'draft_temp_123 is recognized as client draft');
  assert.strictEqual(isClientDraftResumeId(null), true, 'null is recognized as client draft');
  assert.strictEqual(isClientDraftResumeId(undefined), true, 'undefined is recognized as client draft');
  assert.strictEqual(isClientDraftResumeId('res_1792839867849_7lq6'), false, 'Canonical server ID is NOT a draft');
  console.log('[PASS] isClientDraftResumeId accurately classifies draft vs canonical resume IDs');

  // --------------------------------------------------------------------------
  // Scenario 3B: Draft Resume ID Query returns empty list (No 404 error)
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 3B: Draft Resume Versions Query ---');
  const fresherVersions = await getResumeVersions(userA.id, 'res_fresher_02');
  assert.deepStrictEqual(fresherVersions, [], 'Draft res_fresher_02 returns empty versions array');

  const defaultVersions = await getResumeVersions(userA.id, 'res_default');
  assert.deepStrictEqual(defaultVersions, [], 'Draft res_default returns empty versions array');

  const sampleVersions = await getResumeVersions(userA.id, 'res_sample_01');
  assert.deepStrictEqual(sampleVersions, [], 'Draft res_sample_01 returns empty versions array');
  console.log('[PASS] Querying versions for client draft IDs returns empty array [] without 404 error');

  // --------------------------------------------------------------------------
  // Scenario 2: Existing Resume without Version History
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 2: Existing Resume without Version History ---');
  const baseResumeData = {
    personalInfo: { fullName: 'Alice Versions', email: userAEmail, phone: '555-0100', location: 'Seattle, WA' },
    summary: 'Full Stack Engineer with TypeScript & React expertise.',
    skills: { technical: ['TypeScript', 'React', 'Node.js'], soft: ['Communication'] },
    experience: [{ id: 'exp_1', role: 'Software Engineer', company: 'TechCorp', startDate: '2022', endDate: 'Present', current: true, bulletPoints: ['Built scalable APIs'] }],
    education: [{ id: 'edu_1', degree: 'B.S. CS', institution: 'State University', graduationYear: '2022' }],
    projects: [],
    certifications: [],
  };

  const savedResumeA = await saveUserResume(userA.id, {
    resumeData: baseResumeData,
    filename: 'Alice Resume',
  });
  assert(savedResumeA.id, 'Resume saved with canonical ID');
  assert(!isClientDraftResumeId(savedResumeA.id), 'Saved resume ID is canonical server ID');

  const unversionedList = await getResumeVersions(userA.id, savedResumeA.id);
  assert.strictEqual(unversionedList.length, 0, 'Existing resume with 0 snapshots returns empty array');
  console.log(`[PASS] Existing resume (${savedResumeA.id}) without versions returns empty list []`);

  // --------------------------------------------------------------------------
  // Scenario 3C: Saving snapshot on draft ID creates canonical resume & v1
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 3C: Saving snapshot with draft ID ---');
  const snap1 = await saveResumeVersion(userA.id, 'res_fresher_02', baseResumeData, 'Initial fresher snapshot');
  assert(snap1 && snap1.versionNumber === 1, 'Version 1 created');
  assert(snap1.resumeId && !isClientDraftResumeId(snap1.resumeId), 'Canonical resume ID assigned to snapshot');
  assert.strictEqual(snap1.version_number, 1, 'Provides both snake_case and camelCase version number');
  assert.strictEqual(snap1.change_summary, 'Initial fresher snapshot', 'Provides both snake_case and camelCase change summary');
  console.log(`[PASS] Saving snapshot with draft ID 'res_fresher_02' resolved to canonical resume (${snap1.resumeId}) Version 1`);

  // --------------------------------------------------------------------------
  // Scenario 1 & 6: Existing Resume with Version History & Resume Edits Creating Snapshots
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 1 & 6: Multiple Version Snapshots, Ordering & Deduplication ---');
  // Attempt duplicate save with same data
  const dupSnap = await saveResumeVersion(userA.id, snap1.resumeId, baseResumeData, 'Attempt duplicate');
  assert.strictEqual(dupSnap.isDuplicate, true, 'Identical data flagged as duplicate');
  assert.strictEqual(dupSnap.id, snap1.id, 'Duplicate snapshot returns existing snapshot ID without new row');

  // Edit resume: Add skill and update summary
  const editedDataV2 = {
    ...baseResumeData,
    summary: 'Senior Full Stack Engineer with TypeScript, Next.js & PostgreSQL expertise.',
    skills: { technical: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Next.js'], soft: ['Communication', 'Leadership'] },
  };
  const snap2 = await saveResumeVersion(userA.id, snap1.resumeId, editedDataV2, 'Added PostgreSQL & Next.js');
  assert.strictEqual(snap2.versionNumber, 2, 'Version 2 created');
  assert.strictEqual(snap2.isDuplicate, false, 'Non-duplicate created new snapshot');

  // Edit resume again: Update role
  const editedDataV3 = {
    ...editedDataV2,
    summary: 'Lead Full Stack Architect & Next.js Specialist.',
  };
  const snap3 = await saveResumeVersion(userA.id, snap1.resumeId, editedDataV3, 'Promoted to Lead Architect');
  assert.strictEqual(snap3.versionNumber, 3, 'Version 3 created');

  // Retrieve versions: Must be strictly newest first (v3, v2, v1)
  const historyList = await getResumeVersions(userA.id, snap1.resumeId);
  assert.strictEqual(historyList.length, 3, 'Exactly 3 versions returned');
  assert.strictEqual(historyList[0].versionNumber, 3, 'First item is Version 3');
  assert.strictEqual(historyList[1].versionNumber, 2, 'Second item is Version 2');
  assert.strictEqual(historyList[2].versionNumber, 1, 'Third item is Version 1');
  assert.strictEqual(historyList[0].version_number, 3, 'Supports snake_case version_number');
  assert(historyList[0].createdAt && historyList[0].created_at, 'Supports both createdAt and created_at');
  console.log('[PASS] Snapshots created sequentially (v1 -> v2 -> v3) and returned strictly ordered newest-first');

  // Single version detail check
  const v2Detail = await getResumeVersion(userA.id, snap2.id);
  assert.strictEqual(v2Detail.versionNumber, 2, 'Version 2 detail retrieved');
  assert(v2Detail.resumeData.skills.technical.includes('PostgreSQL'), 'Version 2 parsed resumeData intact');
  console.log('[PASS] getResumeVersion returns specific version with full parsed resumeData');

  // --------------------------------------------------------------------------
  // Scenario 4: Ownership Isolation (User B cannot access User A's data)
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 4: Strict Ownership Isolation ---');
  let userBListBlocked = false;
  try {
    await getResumeVersions(userB.id, snap1.resumeId);
  } catch (err) {
    if (/Forbidden|You do not own this resume/i.test(err.message)) userBListBlocked = true;
  }
  assert(userBListBlocked, 'User B blocked from listing User A resume versions');

  let userBViewBlocked = false;
  try {
    await getResumeVersion(userB.id, snap2.id);
  } catch (err) {
    if (/Forbidden|permission/i.test(err.message)) userBViewBlocked = true;
  }
  assert(userBViewBlocked, 'User B blocked from viewing User A resume version');

  let userBRestoreBlocked = false;
  try {
    await restoreResumeVersion(userB.id, snap1.id);
  } catch (err) {
    if (/Forbidden|permission|You do not own this resume/i.test(err.message)) userBRestoreBlocked = true;
  }
  assert(userBRestoreBlocked, 'User B blocked from restoring User A resume version');

  let userBSaveBlocked = false;
  try {
    await saveResumeVersion(userB.id, snap1.resumeId, baseResumeData, 'Malicious injection');
  } catch (err) {
    if (/Forbidden|You do not own this resume/i.test(err.message)) userBSaveBlocked = true;
  }
  assert(userBSaveBlocked, 'User B blocked from saving snapshot to User A resume');
  console.log('[PASS] All cross-user version access attempts strictly rejected with Forbidden (403)');

  // --------------------------------------------------------------------------
  // Scenario 5: Nonexistent Resume ID & Nonexistent Version ID (404)
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 5: Nonexistent Resource IDs (404 Not Found) ---');
  let nonExistentResumeBlocked = false;
  try {
    await getResumeVersions(userA.id, 'res_nonexistent_999999_fake');
  } catch (err) {
    if (/Resume not found/i.test(err.message)) nonExistentResumeBlocked = true;
  }
  assert(nonExistentResumeBlocked, 'Nonexistent resume ID throws "Resume not found."');

  let nonExistentVersionBlocked = false;
  try {
    await getResumeVersion(userA.id, 'ver_nonexistent_999999_fake');
  } catch (err) {
    if (/Resume version not found/i.test(err.message)) nonExistentVersionBlocked = true;
  }
  assert(nonExistentVersionBlocked, 'Nonexistent version ID throws "Resume version not found."');
  console.log('[PASS] Nonexistent resume/version IDs throw standard 404 "not found" errors');

  // --------------------------------------------------------------------------
  // Scenario 7: Version Restoration
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 7: Version Restoration with History Preservation ---');
  // First simulate uncommitted edits in DB
  const uncommittedEdits = {
    ...editedDataV3,
    summary: 'UNCOMMITTED EDIT: In-progress changes that must be preserved before restoring v1',
  };
  await db.prepare('UPDATE resumes SET resume_data = ? WHERE id = ?').run(
    JSON.stringify(uncommittedEdits),
    snap1.resumeId
  );

  const restoreResult = await restoreResumeVersion(userA.id, snap1.id);
  assert.strictEqual(restoreResult.success, true, 'Restoration succeeded');
  assert(restoreResult.preRestoreCheckpoint, 'Pre-restore checkpoint created to preserve uncommitted edits');
  assert.strictEqual(restoreResult.preRestoreCheckpoint.versionNumber, 4, 'Checkpoint is Version 4');
  assert.strictEqual(restoreResult.newVersion.versionNumber, 5, 'Restored state recorded as Version 5');
  assert.strictEqual(restoreResult.restoredFromVersionNumber, 1, 'Restored from Version 1');
  assert.strictEqual(restoreResult.resumeData.summary, baseResumeData.summary, 'Active resume data reverted to v1');

  // Verify full version history now has 5 versions
  const postRestoreHistory = await getResumeVersions(userA.id, snap1.resumeId);
  assert.strictEqual(postRestoreHistory.length, 5, 'All 5 versions intact: [v5 (restored), v4 (checkpoint), v3, v2, v1]');
  console.log('[PASS] Version restoration preserves uncommitted edits (checkpoint v4) and creates new version (v5) without data loss');

  // --------------------------------------------------------------------------
  // Scenario 8: Admin Authorization Access
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 8: Administrator Authorization ---');
  const adminViewList = await getResumeVersions(userB.id, snap1.resumeId, { isAdmin: true });
  assert.strictEqual(adminViewList.length, 5, 'Admin can view User A versions');

  const adminVersionDetail = await getResumeVersion(userB.id, snap1.id, { isAdmin: true });
  assert.strictEqual(adminVersionDetail.versionNumber, 1, 'Admin can view User A version detail');
  console.log('[PASS] Authorized administrators can inspect version history across users');

  // --------------------------------------------------------------------------
  // Scenario 9: PostgreSQL SQL Compatibility
  // --------------------------------------------------------------------------
  console.log('\n--- Scenario 9: PostgreSQL SQL Syntax Compatibility ---');
  const sqliteSql1 = 'SELECT id, user_id, resume_id, version_number, change_summary, created_at FROM resume_versions WHERE user_id = ? AND resume_id = ? ORDER BY version_number DESC';
  const pgSql1 = toPostgresSql(sqliteSql1);
  assert(pgSql1.includes('$1') && pgSql1.includes('$2'), 'toPostgresSql translates placeholders to $1, $2');

  const sqliteSql2 = 'INSERT OR IGNORE INTO resume_versions (id, user_id, resume_id, version_number) VALUES (?, ?, ?, ?)';
  const pgSql2 = toPostgresSql(sqliteSql2);
  assert(pgSql2.includes('ON CONFLICT DO NOTHING'), 'toPostgresSql converts INSERT OR IGNORE to ON CONFLICT DO NOTHING');
  console.log('[PASS] PostgreSQL SQL dialect conversion verified for all versioning queries');

  // --------------------------------------------------------------------------
  // Clean up test data & verify zero original data impact
  // --------------------------------------------------------------------------
  console.log('\n--- Cleanup Test Artifacts ---');
  await db.prepare('DELETE FROM resume_versions WHERE user_id IN (?, ?)').run(userA.id, userB.id);
  await db.prepare('DELETE FROM resumes WHERE user_id IN (?, ?)').run(userA.id, userB.id);
  await db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(userA.id, userB.id);

  const finalUsers = (await db.prepare('SELECT COUNT(*) as count FROM users').get())?.count ?? 0;
  const finalResumes = (await db.prepare('SELECT COUNT(*) as count FROM resumes').get())?.count ?? 0;
  const finalVersions = (await db.prepare('SELECT COUNT(*) as count FROM resume_versions').get())?.count ?? 0;

  assert.strictEqual(finalUsers, initialUsers, `User count exactly preserved: ${finalUsers} === ${initialUsers}`);
  assert.strictEqual(finalResumes, initialResumes, `Resume count exactly preserved: ${finalResumes} === ${initialResumes}`);
  assert.strictEqual(finalVersions, initialVersions, `Version count exactly preserved: ${finalVersions} === ${initialVersions}`);
  console.log(`[PASS] Zero data loss: final counts exactly match initial counts (Users=${finalUsers}, Resumes=${finalResumes}, Versions=${finalVersions})`);

  console.log('\n================================================================');
  console.log('🎉 ALL 9 RESUME VERSIONS REGRESSION TEST SCENARIOS PASSED!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ REGRESSION TEST FAILED:', err);
  process.exit(1);
});
