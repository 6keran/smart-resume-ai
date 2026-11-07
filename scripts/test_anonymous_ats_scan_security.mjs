import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

// Load environment variables
function loadEnv() {
  const envFile = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
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
loadEnv();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';
const secret = process.env.ADMIN_SESSION_SECRET || 'smart_resume_ai_super_secret_admin_jwt_key_2026_dev_fallback';

function makeUserToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

async function runTests() {
  console.log('🚀 Starting Anonymous ATS Scan & Middleware Security Verification...\n');

  let passed = 0;
  let total = 0;

  async function check(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✅ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ❌ [FAIL] ${name}`);
      console.error(`     Reason: ${err.message}`);
    }
  }

  // 1. Public Page: Landing Page
  await check('Anonymous user can access Landing Page (GET /)', async () => {
    const res = await fetch(`${BASE_URL}/`, { redirect: 'manual' });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
  });

  // 2. Public Page: Privacy & Terms
  await check('Anonymous user can access /privacy and /terms without redirection', async () => {
    const resPrivacy = await fetch(`${BASE_URL}/privacy`, { redirect: 'manual' });
    assert.equal(resPrivacy.status, 200, `Expected 200 for /privacy, got ${resPrivacy.status}`);
    const resTerms = await fetch(`${BASE_URL}/terms`, { redirect: 'manual' });
    assert.equal(resTerms.status, 200, `Expected 200 for /terms, got ${resTerms.status}`);
  });

  // 3. Public Page: Analyzer Page (Crucial fix for landing page CTA)
  await check('Anonymous user can access /analyzer (GET /analyzer returns 200)', async () => {
    const res = await fetch(`${BASE_URL}/analyzer`, { redirect: 'manual' });
    assert.equal(res.status, 200, `Expected 200, got ${res.status}. Was redirected or blocked.`);
  });

  // 4. Protected Pages redirect unauthenticated users to /login
  await check('Anonymous user navigating to /builder is redirected to /login?from=%2Fbuilder', async () => {
    const res = await fetch(`${BASE_URL}/builder`, { redirect: 'manual' });
    assert.ok(res.status === 307 || res.status === 302, `Expected 307/302 redirect, got ${res.status}`);
    const location = res.headers.get('location') || '';
    assert.ok(location.includes('/login?from=%2Fbuilder'), `Expected redirect to /login with from param, got ${location}`);
  });

  await check('Anonymous user navigating to /dashboard is redirected to /login?from=%2Fdashboard', async () => {
    const res = await fetch(`${BASE_URL}/dashboard`, { redirect: 'manual' });
    assert.ok(res.status === 307 || res.status === 302, `Expected 307/302 redirect, got ${res.status}`);
    const location = res.headers.get('location') || '';
    assert.ok(location.includes('/login?from=%2Fdashboard'), `Expected redirect to /login with from param, got ${location}`);
  });

  await check('Anonymous user navigating to /admin is redirected to /admin/login', async () => {
    const res = await fetch(`${BASE_URL}/admin`, { redirect: 'manual' });
    assert.ok(res.status === 307 || res.status === 302, `Expected 307/302 redirect, got ${res.status}`);
    const location = res.headers.get('location') || '';
    assert.ok(location.includes('/admin/login'), `Expected redirect to /admin/login, got ${location}`);
  });

  // 5. Protected APIs strictly reject unauthenticated requests with 401
  await check('Anonymous POST to /api/resume/improve is strictly rejected with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/resume/improve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bulletText: 'Managed a team of engineers' }),
    });
    assert.equal(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  await check('Anonymous GET to /api/admin/users is strictly rejected with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/users`, {
      method: 'GET',
    });
    assert.equal(res.status, 401, `Expected 401 Unauthorized, got ${res.status}`);
  });

  // 6. Anonymous ATS Scan endpoint (/api/resume/analyze) is reachable and not blocked by 401
  const testVisitorIp = `198.51.100.${Math.floor(Math.random() * 200 + 10)}`;
  await check('Anonymous POST to /api/resume/analyze is reachable (processes request and sets rate limit headers)', async () => {
    const res = await fetch(`${BASE_URL}/api/resume/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testVisitorIp,
      },
      body: JSON.stringify({
        resumeText: 'Alex Morgan\nSoftware Engineer\nSummary: Software engineer with 5 years experience in React and Node.js.\nExperience: Software Engineer at Acme Corp.\nSkills: JavaScript, TypeScript, React',
      }),
    });

    // Endpoint reached without 401! Status should be 200 (or validation 422 if invalid)
    assert.notEqual(res.status, 401, `Expected endpoint to be accessible without 401, got ${res.status}`);
    assert.equal(res.status, 200, `Expected 200 OK from ATS analyze, got ${res.status}`);

    const limitHeader = res.headers.get('x-ratelimit-limit');
    const remainingHeader = res.headers.get('x-ratelimit-remaining');
    assert.ok(limitHeader, 'Expected x-ratelimit-limit header to be present');
    assert.ok(remainingHeader !== null, 'Expected x-ratelimit-remaining header to be present');

    const data = await res.json();
    assert.ok(typeof data.overallAtsScore === 'number', 'Expected overallAtsScore in response');
  });

  // 7. Cookie assignment for anonymous visitor
  await check('Anonymous POST to /api/resume/analyze assigns sra_visitor_id cookie when missing', async () => {
    const freshIp = `203.0.113.${Math.floor(Math.random() * 200 + 10)}`;
    const res = await fetch(`${BASE_URL}/api/resume/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': freshIp,
      },
      body: JSON.stringify({
        resumeText: 'Taylor Swift\nStaff Engineer\nSummary: Experienced full stack software engineer.\nSkills: Go, Kubernetes, Cloud Architecture\nExperience: Senior Staff at Global Cloud Corp.',
      }),
    });

    assert.equal(res.status, 200, `Expected 200, got ${res.status}`);
    const setCookie = res.headers.get('set-cookie') || '';
    assert.ok(setCookie.includes('sra_visitor_id='), `Expected set-cookie to contain sra_visitor_id, got: ${setCookie}`);
  });

  const validResumeSample = `Jordan Lee
Email: jordan.lee@example.com | Phone: (555) 234-5678
Full Stack Developer | San Francisco, CA

Professional Summary:
Dynamic Full Stack Developer with 5+ years of experience building scalable web applications with React, TypeScript, Node.js, and PostgreSQL. Spearheaded distributed architecture migrations reducing latency by 40%.

Technical Skills:
JavaScript, TypeScript, React, Next.js, Node.js, Python, PostgreSQL, Docker, AWS, Git, CI/CD, Jest

Work Experience:
Senior Software Engineer | TechCorp Inc. | 2021 - Present
- Architected high-throughput microservices handling 15M daily requests with 99.99% uptime.
- Developed modern user interfaces using Next.js, Tailwind CSS, and TypeScript.
- Spearheaded code reviews, automated unit testing, and continuous integration pipelines.

Software Engineer | CloudScale Systems | 2018 - 2021
- Built RESTful and GraphQL APIs using Node.js, Express, and PostgreSQL.
- Optimized database queries, reducing average response latency by 35%.

Education:
B.S. in Computer Science | University of California, Berkeley | 2014 - 2018`;

  // 8. Rate Limiting enforcement after threshold
  await check('Enforces 429 Too Many Requests when anonymous visitor exceeds 5 scans', async () => {
    const rateLimitIp = `192.0.2.${Math.floor(Math.random() * 200 + 10)}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-forwarded-for': rateLimitIp,
    };
    const body = JSON.stringify({
      resumeText: validResumeSample,
    });

    // Send 5 requests (which should succeed / consume tokens)
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${BASE_URL}/api/resume/analyze`, {
        method: 'POST',
        headers,
        body,
      });
      assert.ok(res.status === 200, `Request ${i + 1} should succeed, got ${res.status}`);
    }

    // 6th request should hit rate limit (429)
    const rateLimitedRes = await fetch(`${BASE_URL}/api/resume/analyze`, {
      method: 'POST',
      headers,
      body,
    });

    assert.equal(rateLimitedRes.status, 429, `Expected 429 Too Many Requests, got ${rateLimitedRes.status}`);
    const retryAfter = rateLimitedRes.headers.get('retry-after');
    assert.ok(retryAfter, 'Expected Retry-After header on 429 response');
    const remaining = rateLimitedRes.headers.get('x-ratelimit-remaining');
    assert.equal(remaining, '0', 'Expected remaining to be 0');

    const errData = await rateLimitedRes.json();
    assert.ok(errData.error.includes('Rate limit exceeded'), `Expected descriptive rate limit error message, got: ${errData.error}`);
  });

  // 9. Authenticated users bypass anonymous rate limit
  await check('Authenticated users bypass the anonymous rate limit', async () => {
    const authUserToken = makeUserToken({
      sub: 'user_auth_bypass_test',
      email: 'bypass@smartresume.ai',
      role: 'USER',
      iat: Date.now(),
      exp: Date.now() + 3600000,
    });

    // Use a distinct IP
    const rateLimitIp = `192.0.2.${Math.floor(Math.random() * 200 + 10)}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-forwarded-for': rateLimitIp,
    };
    const body = JSON.stringify({
      resumeText: validResumeSample,
    });

    // Exhaust anonymous quota for this IP
    for (let i = 0; i < 5; i++) {
      await fetch(`${BASE_URL}/api/resume/analyze`, { method: 'POST', headers, body });
    }

    // Anonymous is now 429
    const anonRes = await fetch(`${BASE_URL}/api/resume/analyze`, { method: 'POST', headers, body });
    assert.equal(anonRes.status, 429, 'Expected anonymous request to be 429');

    // But authenticated user with sra_user_session cookie succeeds (200)!
    const authRes = await fetch(`${BASE_URL}/api/resume/analyze`, {
      method: 'POST',
      headers: {
        ...headers,
        Cookie: `sra_user_session=${authUserToken}`,
      },
      body,
    });

    assert.equal(authRes.status, 200, `Expected authenticated request to bypass rate limit with 200, got ${authRes.status}`);
  });

  console.log(`\n==============================================`);
  console.log(`Anonymous ATS & Middleware Security Suite: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)`);
  console.log(`==============================================\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test suite failed with uncaught error:', err);
  process.exit(1);
});
