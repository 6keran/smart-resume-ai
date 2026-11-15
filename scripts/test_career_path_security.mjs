import assert from 'node:assert/strict';
import Module from 'node:module';
import { setupTestDb } from './testDbIsolation.mjs';

// Intercept Next server-only marker so App Router route handlers can be imported under tsx
const origLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'server-only') return {};
  return origLoad.call(this, request, parent, isMain);
};

async function run() {
  const { isolatedDbPath, cleanup } = setupTestDb('career_path_security');
  console.log(`[Security Test] Using isolated SQLite DB: ${isolatedDbPath}`);

  let passed = 0;
  let failed = 0;
  const check = async (name, fn) => {
    try {
      await fn();
      passed++;
      console.log(`✓ [PASS] ${name}`);
    } catch (err) {
      failed++;
      console.error(`✗ [FAIL] ${name}: ${err?.message || err}`);
    }
  };

  try {
    const dbMod = await import('../src/server/db/index.ts');
    const rateLimitMod = await import('../src/lib/rateLimit.ts');

    const myDataRoute = await import('../src/app/api/user/my-data/route.ts');
    const exportRoute = await import('../src/app/api/user/my-data/export/route.ts');
    const roadmapProgressRoute = await import('../src/app/api/career/roadmap/progress/route.ts');
    const onboardingRoute = await import('../src/app/api/onboarding/route.ts');
    const onboardingCompleteRoute = await import('../src/app/api/onboarding/complete/route.ts');
    const onboardingSkipRoute = await import('../src/app/api/onboarding/skip/route.ts');
    const parseResumeRoute = await import('../src/app/api/onboarding/parse-resume/route.ts');

    const regA = await dbMod.registerUser({
      name: 'Security User A',
      email: `sec-user-a-${Date.now()}@example.invalid`,
      password: 'PasswordA123!',
    });
    const regB = await dbMod.registerUser({
      name: 'Security User B',
      email: `sec-user-b-${Date.now()}@example.invalid`,
      password: 'PasswordB123!',
    });
    const userA = { ...regA.user, sessionToken: regA.sessionToken };
    const userB = { ...regB.user, sessionToken: regB.sessionToken };

    const cookieA = `sra_user_session=${encodeURIComponent(userA.sessionToken)}`;
    const cookieB = `sra_user_session=${encodeURIComponent(userB.sessionToken)}`;

    // Seed private data on User B
    await dbMod.upsertStudentProfile(userB.id, {
      targetRole: 'Data Analyst',
      institution: 'Private University B',
      degree: 'B.S.',
      fieldOfStudy: 'Statistics',
      graduationYear: 2026,
      onboardingStatus: 'completed',
    });
    await dbMod.addUserSkill(userB.id, 'PostgreSQL', 'Database', true, {
      source: 'user_added',
      confidence: 1.0,
    });
    await dbMod.upsertUserRoadmapProgressItem(userB.id, {
      roleSlug: 'data-analyst',
      itemType: 'skill',
      itemKey: 'PostgreSQL',
      status: 'completed',
      notes: 'User B secret roadmap note',
    });

    // 1. Authentication requirements across onboarding, my-data, export, roadmap progress
    await check('All onboarding, my-data, export, and roadmap progress routes reject unauthenticated requests with 401', async () => {
      const calls = [
        onboardingRoute.GET(new Request('http://localhost/api/onboarding')),
        onboardingCompleteRoute.POST(
          new Request('http://localhost/api/onboarding/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetRole: 'Software Engineer' }),
          })
        ),
        onboardingSkipRoute.POST(new Request('http://localhost/api/onboarding/skip', { method: 'POST' })),
        parseResumeRoute.POST(new Request('http://localhost/api/onboarding/parse-resume', { method: 'POST' })),
        myDataRoute.GET(new Request('http://localhost/api/user/my-data')),
        myDataRoute.PATCH(new Request('http://localhost/api/user/my-data', { method: 'PATCH', body: '{}' })),
        myDataRoute.DELETE(
          new Request('http://localhost/api/user/my-data', {
            method: 'DELETE',
            body: JSON.stringify({ confirm: 'CLEAR' }),
          })
        ),
        exportRoute.GET(new Request('http://localhost/api/user/my-data/export')),
        roadmapProgressRoute.GET(new Request('http://localhost/api/career/roadmap/progress?roleSlug=data-analyst')),
        roadmapProgressRoute.POST(
          new Request('http://localhost/api/career/roadmap/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roleSlug: 'data-analyst', itemType: 'skill', itemKey: 'SQL', status: 'completed' }),
          })
        ),
      ];

      const responses = await Promise.all(calls);
      for (const res of responses) {
        assert.equal(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
      }
    });

    // 2. User A cannot read or export User B's data via /api/user/my-data or /export
    await check('User A cannot read or export User B profile, targetRole, or skills', async () => {
      const readRes = await myDataRoute.GET(
        new Request(`http://localhost/api/user/my-data?userId=${userB.id}`, {
          headers: { cookie: cookieA },
        })
      );
      assert.equal(readRes.status, 200);
      const readJson = await readRes.json();
      assert.equal(readJson.account.id, userA.id);
      assert.equal(readJson.goalSet, false);
      assert.equal(readJson.targetRole, null);
      assert.equal(readJson.skills.length, 0);

      const exportRes = await exportRoute.GET(
        new Request(`http://localhost/api/user/my-data/export?userId=${userB.id}`, {
          headers: { cookie: cookieA },
        })
      );
      assert.equal(exportRes.status, 200);
      const exportText = await exportRes.text();
      assert.ok(!exportText.includes('Private University B'), 'Export leaked User B institution');
      assert.ok(!exportText.includes(userB.id), 'Export leaked User B id');
    });

    // 3. User A cannot read/mutate User B's roadmap progress or clear User B's data
    await check('User A DELETE /my-data CLEAR & roadmap progress calls remain isolated from User B', async () => {
      // User A checks User B's roleSlug progress — must see empty array
      const progResA = await roadmapProgressRoute.GET(
        new Request(`http://localhost/api/career/roadmap/progress?roleSlug=data-analyst&userId=${userB.id}`, {
          headers: { cookie: cookieA },
        })
      );
      assert.equal(progResA.status, 200);
      const progJsonA = await progResA.json();
      assert.equal(progJsonA.progress.length, 0);

      // User A writes a roadmap progress item even passing userId=userB.id — must write to User A only
      const postProgA = await roadmapProgressRoute.POST(
        new Request('http://localhost/api/career/roadmap/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: cookieA },
          body: JSON.stringify({
            userId: userB.id,
            roleSlug: 'data-analyst',
            itemType: 'skill',
            itemKey: 'PostgreSQL',
            status: 'pending',
            notes: 'User A overwrite attempt',
          }),
        })
      );
      assert.equal(postProgA.status, 200);

      // User A clears its career data (even passing userId query param)
      const delResA = await myDataRoute.DELETE(
        new Request(`http://localhost/api/user/my-data?userId=${userB.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json', cookie: cookieA },
          body: JSON.stringify({ confirm: 'CLEAR', userId: userB.id }),
        })
      );
      assert.equal(delResA.status, 200);

      // Verify User B's data and roadmap progress remain completely intact
      const readResB = await myDataRoute.GET(
        new Request('http://localhost/api/user/my-data', { headers: { cookie: cookieB } })
      );
      const jsonB = await readResB.json();
      assert.equal(jsonB.goalSet, true);
      assert.equal(jsonB.targetRole, 'Data Analyst');
      assert.equal(jsonB.profile.institution, 'Private University B');
      assert.equal(jsonB.skills.length, 1);

      const progResB = await roadmapProgressRoute.GET(
        new Request('http://localhost/api/career/roadmap/progress?roleSlug=data-analyst', {
          headers: { cookie: cookieB },
        })
      );
      const progJsonB = await progResB.json();
      assert.equal(progJsonB.progress.length, 1);
      assert.equal(progJsonB.progress[0].status, 'completed');
      assert.equal(progJsonB.progress[0].notes, 'User B secret roadmap note');
    });

    // 4. Null vs empty-string targetRole consistency when cleared
    await check('Cleared targetRole returns null in /api/user/my-data and /api/onboarding with goalSet: false', async () => {
      const resMyData = await myDataRoute.GET(
        new Request('http://localhost/api/user/my-data', { headers: { cookie: cookieA } })
      );
      const d1 = await resMyData.json();
      assert.equal(d1.goalSet, false);
      assert.equal(d1.targetRole, null);

      const resOnboarding = await onboardingRoute.GET(
        new Request('http://localhost/api/onboarding', { headers: { cookie: cookieA } })
      );
      const d2 = await resOnboarding.json();
      assert.equal(d2.goalSet, false);
      assert.equal(d2.targetRole, null);
    });

    // 5. parse-resume 10MB limit, file-type signature validation, and rate limit
    await check('parse-resume enforces 10MB limit, file-type/magic-byte check, and 429 rate limiting', async () => {
      rateLimitMod.resetRateLimitsForTesting();

      // > 10MB rejection
      const oversizedBuf = Buffer.alloc(10 * 1024 * 1024 + 64, 0x41);
      const formTooBig = new FormData();
      formTooBig.append('file', new File([oversizedBuf], 'huge.txt', { type: 'text/plain' }));
      const resTooBig = await parseResumeRoute.POST(
        new Request('http://localhost/api/onboarding/parse-resume', {
          method: 'POST',
          headers: { cookie: cookieA, 'x-forwarded-for': '203.0.113.10' },
          body: formTooBig,
        })
      );
      assert.equal(resTooBig.status, 400);
      const tooBigJson = await resTooBig.json();
      assert.match(tooBigJson.message, /10MB/i);

      // Unsupported extension (.exe)
      const formExe = new FormData();
      formExe.append('file', new File([Buffer.from('MZ\x90\x00')], 'payload.exe', { type: 'application/octet-stream' }));
      const resExe = await parseResumeRoute.POST(
        new Request('http://localhost/api/onboarding/parse-resume', {
          method: 'POST',
          headers: { cookie: cookieA, 'x-forwarded-for': '203.0.113.10' },
          body: formExe,
        })
      );
      assert.equal(resExe.status, 400);

      // Fake .pdf magic bytes (PE header disguised as .pdf)
      const formFakePdf = new FormData();
      formFakePdf.append('file', new File([Buffer.from('MZ\x90\x00not a pdf')], 'fake.pdf', { type: 'application/pdf' }));
      const resFakePdf = await parseResumeRoute.POST(
        new Request('http://localhost/api/onboarding/parse-resume', {
          method: 'POST',
          headers: { cookie: cookieA, 'x-forwarded-for': '203.0.113.10' },
          body: formFakePdf,
        })
      );
      assert.equal(resFakePdf.status, 400);

      // Rate limit enforcement (10 allowed per window -> 11th returns 429)
      for (let i = 0; i < 7; i++) {
        const formOk = new FormData();
        formOk.append(
          'file',
          new File(
            [Buffer.from('Alice Smith\nSkills: Python, SQL, React\nEducation: B.S. Computer Science\nProjects: Portfolio Tracker built with React and SQL.')],
            'resume.txt',
            { type: 'text/plain' }
          )
        );
        const okRes = await parseResumeRoute.POST(
          new Request('http://localhost/api/onboarding/parse-resume', {
            method: 'POST',
            headers: { cookie: cookieA, 'x-forwarded-for': '203.0.113.10' },
            body: formOk,
          })
        );
        assert.equal(okRes.status, 200, `Expected 200 before rate limit (attempt ${i + 4}), got ${okRes.status}`);
      }

      const formLimited = new FormData();
      formLimited.append(
        'file',
        new File([Buffer.from('Alice Smith\nSkills: Python, SQL')], 'resume.txt', { type: 'text/plain' })
      );
      const limitedRes = await parseResumeRoute.POST(
        new Request('http://localhost/api/onboarding/parse-resume', {
          method: 'POST',
          headers: { cookie: cookieA, 'x-forwarded-for': '203.0.113.10' },
          body: formLimited,
        })
      );
      assert.equal(limitedRes.status, 429, `Expected 429 after 10 parse requests, got ${limitedRes.status}`);
      assert.ok(limitedRes.headers.get('Retry-After'), 'Expected Retry-After header on 429 response');
    });

    console.log(`\nSecurity Audit Summary: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
