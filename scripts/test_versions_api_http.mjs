import assert from 'node:assert';

const BASE_URL = 'http://localhost:3000';

console.log('================================================================');
console.log('=== HTTP INTEGRATION TEST: /api/user/resumes/versions ===');
console.log('================================================================\n');

async function runHttpTests() {
  // Test 1: Unauthenticated request returns 401
  console.log('--- Test 1: Unauthenticated Access ---');
  const unauthRes = await fetch(`${BASE_URL}/api/user/resumes/versions`);
  assert.strictEqual(unauthRes.status, 401, 'Unauthenticated GET returns 401');
  console.log('[PASS] Unauthenticated request rejected with HTTP 401');

  // Register User A
  const suffix = Date.now();
  const userAEmail = `alice.http.${suffix}@example.com`;
  const userBEmail = `bob.http.${suffix}@example.com`;

  console.log('\n--- Test 2: Register Test Users ---');
  const regARes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Alice HTTP', email: userAEmail, password: 'Password123!', confirmPassword: 'Password123!' }),
  });
  assert(regARes.ok, 'User A registered successfully');
  const cookieA = regARes.headers.get('set-cookie');
  assert(cookieA, 'User A received session cookie');

  const regBRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fullName: 'Bob Infiltrator', email: userBEmail, password: 'Password123!', confirmPassword: 'Password123!' }),
  });
  assert(regBRes.ok, 'User B registered successfully');
  const cookieB = regBRes.headers.get('set-cookie');
  assert(cookieB, 'User B received session cookie');
  console.log('[PASS] Test users registered and authenticated');

  // Test 3: The PREVIOUS BUG - GET /api/user/resumes/versions?resumeId=res_fresher_02
  console.log('\n--- Test 3: Previous Bug Verification: GET ?resumeId=res_fresher_02 ---');
  const fresherRes = await fetch(`${BASE_URL}/api/user/resumes/versions?resumeId=res_fresher_02`, {
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(fresherRes.status, 200, 'res_fresher_02 returns HTTP 200 instead of 404');
  const fresherJson = await fresherRes.json();
  assert(Array.isArray(fresherJson.versions) && fresherJson.versions.length === 0, 'res_fresher_02 returns empty versions array');
  console.log('[PASS] GET /api/user/resumes/versions?resumeId=res_fresher_02 returns 200 OK with empty array [] (404 eliminated!)');

  // Test 4: Draft res_default
  console.log('\n--- Test 4: GET ?resumeId=res_default ---');
  const defaultRes = await fetch(`${BASE_URL}/api/user/resumes/versions?resumeId=res_default`, {
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(defaultRes.status, 200, 'res_default returns HTTP 200');
  const defaultJson = await defaultRes.json();
  assert(Array.isArray(defaultJson.versions) && defaultJson.versions.length === 0, 'res_default returns empty versions array');
  console.log('[PASS] GET /api/user/resumes/versions?resumeId=res_default returns 200 OK with empty array []');

  // Test 5: Genuine Nonexistent Resume ID returns 404
  console.log('\n--- Test 5: Genuine Nonexistent Resume ID ---');
  const fakeRes = await fetch(`${BASE_URL}/api/user/resumes/versions?resumeId=res_nonexistent_999999_fake`, {
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(fakeRes.status, 404, 'Nonexistent resume ID returns 404');
  const fakeJson = await fakeRes.json();
  assert(/not found/i.test(fakeJson.message), '404 message indicates Resume not found');
  console.log('[PASS] GET ?resumeId=res_nonexistent_999999_fake correctly returns HTTP 404');

  // Test 6: POST snapshot on draft resume ID creates version snapshot
  console.log('\n--- Test 6: POST snapshot on fresher draft ID ---');
  const sampleResumeData = {
    id: 'res_fresher_02',
    title: 'Fresher Software Engineer',
    personalInfo: { fullName: 'Alice HTTP', email: userAEmail, phone: '555-0199', location: 'Austin, TX' },
    summary: 'Computer Science graduate ready to build high-performance web applications.',
    skills: { technical: ['TypeScript', 'Next.js'], soft: ['Teamwork'] },
    experience: [],
    education: [{ id: 'edu_1', degree: 'B.S. CS', institution: 'University of Texas', graduationYear: '2024' }],
    projects: [{ id: 'proj_1', title: 'Smart Resume AI', description: 'AI platform', technologies: ['Next.js', 'PostgreSQL'] }],
    certifications: [],
  };

  const postSnapRes = await fetch(`${BASE_URL}/api/user/resumes/versions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
    },
    body: JSON.stringify({
      resumeId: 'res_fresher_02',
      resumeData: sampleResumeData,
      changeSummary: 'Initial draft snapshot',
    }),
  });
  assert(postSnapRes.ok, `POST version snapshot returned status ${postSnapRes.status}`);
  const postSnapJson = await postSnapRes.json();
  assert(postSnapJson.version && postSnapJson.version.versionNumber === 1, 'Version 1 created');
  const canonicalResumeId = postSnapJson.version.resumeId;
  const version1Id = postSnapJson.version.id;
  assert(canonicalResumeId && canonicalResumeId !== 'res_fresher_02', 'Assigned canonical server resume ID');
  console.log(`[PASS] POST snapshot created Version 1 with canonical resume ID ${canonicalResumeId}`);

  // Test 7: GET versions for the newly persisted resume ID
  console.log('\n--- Test 7: GET versions for canonical resume ---');
  const listRes = await fetch(`${BASE_URL}/api/user/resumes/versions?resumeId=${canonicalResumeId}`, {
    headers: { Cookie: cookieA },
  });
  assert.strictEqual(listRes.status, 200, 'GET versions returned 200');
  const listJson = await listRes.json();
  assert(listJson.versions.length === 1, 'Version list contains 1 version');
  assert.strictEqual(listJson.versions[0].versionNumber, 1, 'Version number is 1');
  assert.strictEqual(listJson.versions[0].version_number, 1, 'Includes version_number snake_case');
  console.log('[PASS] GET versions returns Version 1 with both versionNumber and version_number');

  // Test 8: Forbidden cross-user access
  console.log('\n--- Test 8: User B cannot access User A versions (403 Forbidden) ---');
  const crossUserList = await fetch(`${BASE_URL}/api/user/resumes/versions?resumeId=${canonicalResumeId}`, {
    headers: { Cookie: cookieB },
  });
  assert.strictEqual(crossUserList.status, 403, 'User B is blocked with HTTP 403 Forbidden');
  console.log('[PASS] User B received HTTP 403 when trying to access User A resume versions');

  const crossUserDetail = await fetch(`${BASE_URL}/api/user/resumes/versions?versionId=${version1Id}`, {
    headers: { Cookie: cookieB },
  });
  assert.strictEqual(crossUserDetail.status, 403, 'User B is blocked from version detail with HTTP 403');
  console.log('[PASS] User B received HTTP 403 when trying to access User A version detail');

  const crossUserRestore = await fetch(`${BASE_URL}/api/user/resumes/versions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieB,
    },
    body: JSON.stringify({ versionId: version1Id }),
  });
  assert.strictEqual(crossUserRestore.status, 403, 'User B is blocked from restoring User A version with HTTP 403');
  console.log('[PASS] User B received HTTP 403 when trying to restore User A version');

  // Test 9: PUT Restore Version by owner
  console.log('\n--- Test 9: Owner Restores Version ---');
  const restoreRes = await fetch(`${BASE_URL}/api/user/resumes/versions`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieA,
    },
    body: JSON.stringify({ versionId: version1Id }),
  });
  assert.strictEqual(restoreRes.status, 200, 'Restoration returned HTTP 200');
  const restoreJson = await restoreRes.json();
  assert.strictEqual(restoreJson.success, true, 'Restoration success is true');
  assert.strictEqual(restoreJson.restoredFromVersionNumber, 1, 'Restored from Version 1');
  assert(restoreJson.newVersion && restoreJson.newVersion.versionNumber === 2, 'New version 2 created for restoration');
  console.log('[PASS] Owner restored Version 1 successfully (Created Version 2)');

  console.log('\n================================================================');
  console.log('🎉 ALL 9 HTTP INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runHttpTests().catch((err) => {
  console.error('\n❌ HTTP INTEGRATION TEST FAILED:', err);
  process.exit(1);
});
