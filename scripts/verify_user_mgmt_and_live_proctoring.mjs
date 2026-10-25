import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const BASE_URL = 'http://localhost:3000';
const DB_PATH = path.resolve(process.cwd(), 'data/smart_resume.db');

async function runVerification() {
  console.log('===============================================================');
  console.log(' SMART RESUME AI: USER MANAGEMENT & LIVE PROCTORING VERIFICATION');
  console.log(' Target Database: data/smart_resume.db (Local SQLite Only)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Verify Local Database File & Schema
  console.log('--- Step 1: Database Sanity & Schema Integrity ---');
  const db = new DatabaseSync(DB_PATH);
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((t) => t.name);
  assert(tables.includes('users'), 'Table "users" exists in local SQLite');
  assert(tables.includes('live_proctoring_sessions'), 'Table "live_proctoring_sessions" exists in local SQLite');
  assert(tables.includes('audit_events'), 'Table "audit_events" exists in local SQLite');

  // Check initial user counts and protected accounts
  const protectedUsers = db.prepare(`
    SELECT id, email, role, is_active FROM users 
    WHERE email IN ('kiran81232@gmail.com', 'admin@smartresume.ai', 'kiran@gmail.com')
  `).all();
  assert(protectedUsers.length >= 2, `Protected accounts present: ${protectedUsers.map(u => u.email).join(', ')}`);

  // 2. Admin Authentication
  console.log('\n--- Step 2: Administrator Authentication ---');
  let adminCookie = '';
  try {
    const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@smartresume.ai', password: 'Admin@SmartResume2026!' }),
    });
    assert(loginRes.status === 200, `Admin login succeeded (HTTP ${loginRes.status})`);
    const setCookie = loginRes.headers.get('set-cookie') || '';
    const match = setCookie.match(/sra_admin_session=([^;]+)/);
    if (match) {
      adminCookie = match[1];
      assert(true, `Obtained sra_admin_session token: ${adminCookie.slice(0, 15)}...`);
    } else {
      assert(false, 'Failed to extract sra_admin_session cookie');
    }
  } catch (err) {
    assert(false, `Login error: ${err.message}`);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Cookie: `sra_admin_session=${adminCookie}`,
  };

  // 3. Admin User Management CRUD Tests
  console.log('\n--- Step 3: Admin User Management End-to-End ---');

  // 3.1 Listing & Security (No password hashes exposed)
  let listUsersRes = await fetch(`${BASE_URL}/api/admin/users?page=1&limit=10`, { headers: authHeaders });
  assert(listUsersRes.status === 200, `GET /api/admin/users returns HTTP 200`);
  let listUsersData = await listUsersRes.json();
  assert(Array.isArray(listUsersData.users), 'Users array returned in response');
  assert(typeof listUsersData.pagination.total === 'number', `Pagination metadata present (total: ${listUsersData.pagination.total})`);
  
  const exposesHashes = listUsersData.users.some(u => 'password_hash' in u || 'password' in u);
  assert(!exposesHashes, 'Security verification: No password hashes or plain passwords exposed in list API');

  // 3.2 Create User
  const testEmail = `qa_mgmt_candidate_${Date.now()}@test.smartresume.local`;
  let createdUserId = null;
  const createRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'QA Automation Candidate',
      email: testEmail,
      role: 'USER',
      isActive: true,
      password: 'SecureQaCandidatePassword123!',
    }),
  });
  assert(createRes.status === 201, `POST /api/admin/users creates candidate user (HTTP ${createRes.status})`);
  const createData = await createRes.json();
  if (createData.user) {
    createdUserId = createData.user.id;
    assert(createData.user.email === testEmail, `Created user email matches: ${createData.user.email}`);
    assert(!('password_hash' in createData.user), 'Security: Created user response does NOT expose password_hash');
  } else {
    assert(false, 'Create user response missing user object');
  }

  // 3.3 Duplicate Email Rejection
  const dupRes = await fetch(`${BASE_URL}/api/admin/users`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'Duplicate Candidate',
      email: testEmail,
      role: 'USER',
      isActive: true,
      password: 'AnotherPassword123!',
    }),
  });
  assert(dupRes.status === 409, `Duplicate email rejected with HTTP 409 (Got ${dupRes.status})`);

  // 3.4 Search Filter
  const searchRes = await fetch(`${BASE_URL}/api/admin/users?search=${encodeURIComponent(testEmail)}`, { headers: authHeaders });
  assert(searchRes.status === 200, 'Search query executed successfully');
  const searchData = await searchRes.json();
  assert(
    searchData.users.some(u => u.email === testEmail),
    `Search for "${testEmail}" found created user`
  );

  // 3.5 Role & Status Filter
  const filterRes = await fetch(`${BASE_URL}/api/admin/users?role=USER&status=active`, { headers: authHeaders });
  assert(filterRes.status === 200, 'Role & Status filter executed successfully');
  const filterData = await filterRes.json();
  const allMatchFilter = filterData.users.every(u => u.role === 'USER' && u.is_active === 1);
  assert(allMatchFilter, 'All returned items in filtered query match role=USER and is_active=1');

  // 3.6 User Detail View
  if (createdUserId) {
    const detailRes = await fetch(`${BASE_URL}/api/admin/users/${createdUserId}`, { headers: authHeaders });
    assert(detailRes.status === 200, `GET /api/admin/users/${createdUserId} returns HTTP 200`);
    const detailData = await detailRes.json();
    const userDetail = detailData.data?.user;
    assert(userDetail && userDetail.id === createdUserId, 'User detail matches requested ID');
    assert(Array.isArray(detailData.data?.resumes), 'Related records (resumes) array included in detail response');

    // 3.7 Edit User
    const editRes = await fetch(`${BASE_URL}/api/admin/users/${createdUserId}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'QA Automation Candidate Updated',
        role: 'USER',
        is_active: 0,
      }),
    });
    assert(editRes.status === 200, `PATCH /api/admin/users/${createdUserId} succeeds (HTTP ${editRes.status})`);
    const editData = await editRes.json();
    assert(editData.user.name === 'QA Automation Candidate Updated', 'User name updated');
    assert(editData.user.is_active === 0, 'User status set to inactive');
  }

  // 3.8 Last Active Admin Demotion Safeguard
  const adminAccount = protectedUsers.find(u => u.role === 'ADMIN');
  if (adminAccount) {
    const demoteRes = await fetch(`${BASE_URL}/api/admin/users/${adminAccount.id}`, {
      method: 'PATCH',
      headers: authHeaders,
      body: JSON.stringify({
        role: 'USER',
        isActive: false,
      }),
    });
    // If this is the active admin or last active admin, it must be protected or rejected!
    console.log(`   Demoting admin ${adminAccount.email} result: HTTP ${demoteRes.status}`);
    assert(demoteRes.status === 400 || demoteRes.status === 403, 'Safeguard: Admin demotion/deactivation blocked appropriately');
  }

  // 3.9 Delete User with Cascade
  if (createdUserId) {
    const delRes = await fetch(`${BASE_URL}/api/admin/users/${createdUserId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert(delRes.status === 200, `DELETE /api/admin/users/${createdUserId} succeeds with referential cascade`);
    
    // Verify removal in DB
    const checkUser = db.prepare('SELECT id FROM users WHERE id = ?').get(createdUserId);
    assert(!checkUser, 'User record completely removed from SQLite database');
  }

  // 3.10 Verify Audit Log was recorded
  const auditLogs = db.prepare(`
    SELECT event_type, description FROM audit_events 
    WHERE description LIKE ? ORDER BY created_at DESC
  `).all(`%${createdUserId}%`);
  assert(auditLogs.length >= 2, `Audit events recorded for created candidate: ${auditLogs.map(a => a.event_type).join(', ')}`);

  // 4. Live Proctoring Assessment & Streaming Verification
  console.log('\n--- Step 4: Live Proctoring Assessment & Video Telemetry ---');

  const testAssessmentId = `assess_qa_test_${Date.now()}`;
  
  // 4.1 Register / Upsert Live Proctoring Session
  const sessionRegisterRes = await fetch(`${BASE_URL}/api/proctoring/session`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      assessmentId: testAssessmentId,
      userId: 'test_candidate_user',
      candidateName: 'Live Test Candidate',
      candidateEmail: 'candidate_stream@test.smartresume.local',
      skill: 'Python',
      status: 'in_progress',
      cameraStatus: 'active',
      streamHealth: 'good',
      frameRate: 30,
      resolution: '640x480',
      consentGiven: true,
    }),
  });
  assert(sessionRegisterRes.status === 200, `POST /api/proctoring/session registers active session (HTTP ${sessionRegisterRes.status})`);

  // 4.2 Send Heartbeat Telemetry (Candidate loop simulation)
  const heartbeatRes = await fetch(`${BASE_URL}/api/proctoring/heartbeat`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      assessmentId: testAssessmentId,
      status: 'in_progress',
      cameraStatus: 'active',
      streamHealth: 'good',
      frameRate: 30,
      resolution: '640x480',
    }),
  });
  assert(heartbeatRes.status === 200, `POST /api/proctoring/heartbeat records candidate heartbeat (HTTP ${heartbeatRes.status})`);

  // 4.3 WebRTC Signaling Handshake Test
  const testSdpOffer = { type: 'offer', sdp: 'v=0\r\no=candidate 1234 5678 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
  const signalOfferRes = await fetch(`${BASE_URL}/api/proctoring/signal`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      assessmentId: testAssessmentId,
      sender: 'candidate',
      type: 'offer',
      data: testSdpOffer,
    }),
  });
  assert(signalOfferRes.status === 200, `Candidate publishes WebRTC SDP offer`);

  // Admin retrieves candidate offer
  const getAdminSignalRes = await fetch(`${BASE_URL}/api/proctoring/signal?assessmentId=${testAssessmentId}&for=admin`, {
    headers: authHeaders,
  });
  assert(getAdminSignalRes.status === 200, `Admin retrieves candidate WebRTC offer`);
  const adminSignalData = await getAdminSignalRes.json();
  assert(adminSignalData.signal?.offer?.sdp === testSdpOffer.sdp, 'Admin received matching SDP offer');

  // Admin answers offer
  const testSdpAnswer = { type: 'answer', sdp: 'v=0\r\no=admin 5678 1234 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n' };
  const signalAnswerRes = await fetch(`${BASE_URL}/api/proctoring/signal`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      assessmentId: testAssessmentId,
      sender: 'admin',
      type: 'answer',
      data: testSdpAnswer,
    }),
  });
  assert(signalAnswerRes.status === 200, `Admin publishes WebRTC SDP answer`);

  // Candidate retrieves admin answer
  const getCandSignalRes = await fetch(`${BASE_URL}/api/proctoring/signal?assessmentId=${testAssessmentId}&for=candidate`, {
    headers: authHeaders,
  });
  assert(getCandSignalRes.status === 200, `Candidate retrieves admin WebRTC answer`);
  const candSignalData = await getCandSignalRes.json();
  assert(candSignalData.signal?.answer?.sdp === testSdpAnswer.sdp, 'Candidate received matching SDP answer');

  // 4.4 Live Frame Snapshot Relay Test
  const mockFrameDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  const postFrameRes = await fetch(`${BASE_URL}/api/proctoring/frame`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      assessmentId: testAssessmentId,
      frame: mockFrameDataUrl,
    }),
  });
  assert(postFrameRes.status === 200, `Candidate streams live video frame (HTTP ${postFrameRes.status})`);

  // Admin inspects live video frame
  const getFrameRes = await fetch(`${BASE_URL}/api/proctoring/frame?assessmentId=${testAssessmentId}`, {
    headers: authHeaders,
  });
  assert(getFrameRes.status === 200, `Admin retrieves live candidate video frame (HTTP ${getFrameRes.status})`);
  const frameData = await getFrameRes.json();
  assert(frameData.active === true, 'Stream frame is active');
  assert(frameData.frame === mockFrameDataUrl, 'Live frame data matches transmitted payload');
  assert(frameData.streamHealth === 'good', 'Live telemetry streamHealth verified as good');

  // 4.5 Privacy Protection Guard Test: When Assessment is Completed, Stream is Terminated
  await fetch(`${BASE_URL}/api/proctoring/session`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      assessmentId: testAssessmentId,
      status: 'completed',
    }),
  });

  const getCompletedFrameRes = await fetch(`${BASE_URL}/api/proctoring/frame?assessmentId=${testAssessmentId}`, {
    headers: authHeaders,
  });
  assert(
    getCompletedFrameRes.status === 403,
    `Privacy Guard: Completed assessment rejects live camera preview with HTTP 403 (Got ${getCompletedFrameRes.status})`
  );

  // 4.6 Cleanup Test Session
  db.prepare('DELETE FROM live_proctoring_sessions WHERE assessment_id = ?').run(testAssessmentId);
  db.close();

  // Final Summary
  console.log('\n===============================================================');
  console.log(` VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
