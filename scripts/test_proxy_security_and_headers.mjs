import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import Module from 'node:module';

// Intercept server-only for standalone execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') {
    return {};
  }
  return origLoad.apply(this, [id, ...args]);
};

console.log('================================================================');
console.log('🛡️ SMART RESUME AI: EDGE PROXY, HEADERS & STARTUP SECURITY AUDIT');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`✓ PASS [${totalTests}]: ${desc}`);
      passedTests++;
    })
    .catch((err) => {
      console.error(`✗ FAIL [${totalTests}]: ${desc}`);
      console.error(err);
      process.exitCode = 1;
      throw err;
    });
}

// Minimal mock for NextRequest
function createMockRequest(urlStr, options = {}) {
  const url = new URL(urlStr, 'http://localhost:3000');
  const cookiesMap = new Map();
  if (options.cookies) {
    for (const [k, v] of Object.entries(options.cookies)) {
      cookiesMap.set(k, { name: k, value: v });
    }
  }

  const headersMap = new Map();
  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headersMap.set(k.toLowerCase(), v);
    }
  }
  if (!headersMap.has('x-forwarded-for')) {
    headersMap.set('x-forwarded-for', options.ip || '198.51.100.1');
  }

  return {
    nextUrl: url,
    url: url.href,
    method: options.method || 'GET',
    cookies: {
      get: (name) => cookiesMap.get(name),
      has: (name) => cookiesMap.has(name),
    },
    headers: {
      get: (header) => headersMap.get(header.toLowerCase()) || null,
    },
  };
}

async function runSuite() {
  const { register } = await import('../src/instrumentation.ts');
  const { proxy } = await import('../src/proxy.ts');
  const {
    checkAuthRateLimit,
    checkAnonymousAtsRateLimit,
    resetRateLimitsForTesting,
  } = await import('../src/lib/rateLimit.ts');
  const { createSessionToken } = await import('../src/server/db/index.ts');

  // ============================================================================
  // GROUP 1: SERVER STARTUP FAIL-CLOSED SECURITY INVARIANTS (AUTH-04)
  // ============================================================================
  console.log('--- GROUP 1: SERVER STARTUP SECURITY INVARIANTS (AUTH-04) ---');

  const origNodeEnv = process.env.NODE_ENV;
  const origVercel = process.env.VERCEL;
  const origSecret = process.env.ADMIN_SESSION_SECRET;
  const origRuntime = process.env.NEXT_RUNTIME;
  const origPhase = process.env.NEXT_PHASE;

  process.env.NEXT_RUNTIME = 'nodejs';
  delete process.env.NEXT_PHASE; // Runtime phase, not build phase

  await it('Startup: Throws fatal error in production when secret is missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL;
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.SESSION_SECRET;

    let threw = false;
    try {
      await register();
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('FATAL SECURITY CONFIGURATION'));
      assert.ok(err.message.includes('minimum of 32 characters'));
    }
    assert.ok(threw, 'register() must halt startup when secret is missing');
  });

  await it('Startup: Throws fatal error in production when secret is under 32 characters', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.VERCEL;
    process.env.ADMIN_SESSION_SECRET = 'weak_secret_only_24_chars';

    let threw = false;
    try {
      await register();
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('FATAL SECURITY CONFIGURATION'));
    }
    assert.ok(threw, 'register() must halt startup when secret is < 32 characters');
  });

  await it('Startup: Throws fatal error on Vercel preview/production when secret is missing', async () => {
    delete process.env.NODE_ENV;
    process.env.VERCEL = '1';
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.SESSION_SECRET;

    let threw = false;
    try {
      await register();
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('FATAL SECURITY CONFIGURATION'));
    }
    assert.ok(threw, 'register() must halt startup when VERCEL=1 and secret is missing');
  });

  await it('Startup: Accepts valid >= 32 character secret in production without error', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_SESSION_SECRET = 'a_very_strong_production_secret_key_exceeding_32_characters_safely';

    let threw = false;
    try {
      await register();
    } catch (err) {
      threw = true;
    }
    assert.equal(threw, false, 'register() must succeed when valid >= 32 char secret is provided');
  });

  await it('Startup: During Next.js build phase (phase-production-build), register allows compilation', async () => {
    process.env.NODE_ENV = 'production';
    process.env.NEXT_PHASE = 'phase-production-build';
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.SESSION_SECRET;

    let threw = false;
    try {
      await register();
    } catch {
      threw = true;
    }
    assert.equal(threw, false, 'Build phase allowed to compile without runtime secrets');
  });

  // Restore env
  process.env.NODE_ENV = origNodeEnv;
  if (origVercel !== undefined) process.env.VERCEL = origVercel; else delete process.env.VERCEL;
  if (origSecret !== undefined) process.env.ADMIN_SESSION_SECRET = origSecret; else delete process.env.ADMIN_SESSION_SECRET;
  if (origRuntime !== undefined) process.env.NEXT_RUNTIME = origRuntime; else delete process.env.NEXT_RUNTIME;
  if (origPhase !== undefined) process.env.NEXT_PHASE = origPhase; else delete process.env.NEXT_PHASE;

  // ============================================================================
  // GROUP 2: EDGE PROXY DISTRIBUTED RATE LIMITING (AUTH-03)
  // ============================================================================
  console.log('\n--- GROUP 2: EDGE PROXY RATE LIMITING AUDIT (AUTH-03) ---');
  resetRateLimitsForTesting();

  await it('Rate Limit: /api/auth/login enforces 10 attempts limit per IP', async () => {
    const testIp = '198.51.100.44';
    // 10 successful requests allowed
    for (let i = 0; i < 10; i++) {
      const req = createMockRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        ip: testIp,
      });
      const res = await proxy(req);
      assert.ok(res.status !== 429, `Attempt ${i + 1} should be allowed`);
    }

    // 11th request triggers 429 Too Many Requests
    const req11 = createMockRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      ip: testIp,
    });
    const res11 = await proxy(req11);
    assert.equal(res11.status, 429, '11th attempt must trigger HTTP 429');
    assert.ok(res11.headers.get('retry-after'), 'Retry-After header must be present');
    assert.equal(res11.headers.get('x-ratelimit-remaining'), '0');
  });

  await it('Rate Limit: /api/admin/auth/login enforces strict 5 attempts limit per IP', async () => {
    const adminIp = '198.51.100.55';
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest('http://localhost:3000/api/admin/auth/login', {
        method: 'POST',
        ip: adminIp,
      });
      const res = await proxy(req);
      assert.ok(res.status !== 429, `Admin login attempt ${i + 1} should be allowed`);
    }

    // 6th attempt triggers 429
    const req6 = createMockRequest('http://localhost:3000/api/admin/auth/login', {
      method: 'POST',
      ip: adminIp,
    });
    const res6 = await proxy(req6);
    assert.equal(res6.status, 429, '6th admin login attempt must trigger HTTP 429');
    assert.ok(res6.headers.get('retry-after'));
    assert.equal(res6.headers.get('x-ratelimit-remaining'), '0');
  });

  await it('Rate Limit: /api/auth/register enforces 5 attempts limit per IP', async () => {
    const regIp = '198.51.100.66';
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        ip: regIp,
      });
      const res = await proxy(req);
      assert.ok(res.status !== 429, `Register attempt ${i + 1} should be allowed`);
    }

    // 6th attempt triggers 429
    const req6 = createMockRequest('http://localhost:3000/api/auth/register', {
      method: 'POST',
      ip: regIp,
    });
    const res6 = await proxy(req6);
    assert.equal(res6.status, 429, '6th register attempt must trigger HTTP 429');
  });

  await it('Rate Limit: Anonymous /api/resume/analyze enforces 5 scans limit per visitor/IP', async () => {
    const anonIp = '198.51.100.77';
    for (let i = 0; i < 5; i++) {
      const req = createMockRequest('http://localhost:3000/api/resume/analyze', {
        method: 'POST',
        ip: anonIp,
      });
      const res = await proxy(req);
      assert.ok(res.status !== 429, `Scan ${i + 1} should be allowed`);
    }

    // 6th attempt triggers 429
    const req6 = createMockRequest('http://localhost:3000/api/resume/analyze', {
      method: 'POST',
      ip: anonIp,
    });
    const res6 = await proxy(req6);
    assert.equal(res6.status, 429, '6th anonymous scan must trigger HTTP 429');
  });

  await it('Rate Limit Bypass Defense: Authenticated users are not throttled by anonymous ATS limits', async () => {
    const userToken = createSessionToken({
      id: 'usr_valid_auth_scan',
      email: 'scanner@student.edu',
      role: 'USER',
    });

    const req = createMockRequest('http://localhost:3000/api/resume/analyze', {
      method: 'POST',
      cookies: { sra_user_session: userToken },
    });
    const res = await proxy(req);
    assert.ok(res.status !== 429, 'Authenticated users bypass anonymous rate limiter');
  });

  // ============================================================================
  // GROUP 3: ROUTE AUTHORIZATION GUARDS & SECURITY HEADERS (AUTH-05)
  // ============================================================================
  console.log('\n--- GROUP 3: ROUTE AUTHORIZATION GUARDS & SECURITY HEADERS (AUTH-05) ---');

  await it('Route Guard: Unauthenticated GET /dashboard redirects to /login?from=/dashboard', async () => {
    const req = createMockRequest('http://localhost:3000/dashboard');
    const res = await proxy(req);
    assert.ok(res.status === 307 || res.status === 302, 'Must redirect');
    const location = res.headers.get('location') || '';
    assert.ok(location.includes('/login?from=%2Fdashboard') || location.includes('/login?from=/dashboard'));
  });

  await it('Route Guard: Unauthenticated GET /admin/dashboard redirects to /admin/login', async () => {
    const req = createMockRequest('http://localhost:3000/admin/dashboard');
    const res = await proxy(req);
    assert.ok(res.status === 307 || res.status === 302, 'Must redirect');
    const location = res.headers.get('location') || '';
    assert.ok(location.includes('/admin/login'));
  });

  await it('Route Guard: Standard USER session on /admin/dashboard is denied and redirects to /admin/login', async () => {
    const userToken = createSessionToken({
      id: 'usr_standard_attempt',
      email: 'student@domain.edu',
      role: 'USER',
    });

    const req = createMockRequest('http://localhost:3000/admin/dashboard', {
      cookies: { sra_user_session: userToken },
    });
    const res = await proxy(req);
    assert.ok(res.status === 307 || res.status === 302, 'Must redirect standard user');
    const location = res.headers.get('location') || '';
    assert.ok(location.includes('/admin/login'));
  });

  await it('Route Guard: Standard USER session on /api/admin/users returns HTTP 401 Unauthorized', async () => {
    const userToken = createSessionToken({
      id: 'usr_standard_attempt',
      email: 'student@domain.edu',
      role: 'USER',
    });

    const req = createMockRequest('http://localhost:3000/api/admin/users', {
      cookies: { sra_user_session: userToken },
    });
    const res = await proxy(req);
    assert.equal(res.status, 401, 'Standard user blocked with 401 on /api/admin/*');
  });

  await it('Route Guard: Valid ADMIN session on /admin/dashboard is granted access', async () => {
    const adminToken = createSessionToken({
      id: 'adm_legit_proxy',
      email: 'admin@smartresume.ai',
      role: 'ADMIN',
    });

    const req = createMockRequest('http://localhost:3000/admin/dashboard', {
      cookies: { sra_admin_session: adminToken },
    });
    const res = await proxy(req);
    assert.equal(res.status, 200, 'Admin session granted access (status 200 / NextResponse.next)');
  });

  await it('Security Headers: next.config.ts defines HSTS, nosniff, SAMEORIGIN, Referrer-Policy, and Permissions-Policy', async () => {
    const nextConfigModule = await import('../next.config.ts');
    const nextConfig = nextConfigModule.default;
    assert.ok(typeof nextConfig.headers === 'function', 'nextConfig.headers must be defined');

    const headersConfig = await nextConfig.headers();
    assert.ok(Array.isArray(headersConfig), 'headersConfig must return an array');

    const globalHeadersRule = headersConfig.find((r) => r.source === '/:path*');
    assert.ok(globalHeadersRule, 'Global header rule (/:path*) must exist');

    const headersMap = new Map(globalHeadersRule.headers.map((h) => [h.key, h.value]));

    assert.equal(headersMap.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(headersMap.get('X-Frame-Options'), 'SAMEORIGIN');
    assert.equal(headersMap.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.ok(headersMap.get('Strict-Transport-Security')?.includes('max-age=63072000'));
    assert.ok(headersMap.get('Strict-Transport-Security')?.includes('includeSubDomains'));
    assert.ok(headersMap.get('Permissions-Policy')?.includes('camera=(self)'));
  });

  console.log('\n================================================================');
  console.log(`TOTAL AUDIT TESTS: ${totalTests} | PASSED: ${passedTests} | FAILED: 0`);
  console.log('================================================================');
  console.log('🎉 ALL PROXY, RATE LIMITING & SECURITY HEADER TESTS PASSED (100%)');
}

runSuite().catch((err) => {
  console.error('Fatal Test Execution Error:', err);
  process.exit(1);
});

