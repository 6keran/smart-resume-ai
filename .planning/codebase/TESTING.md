---
last_mapped_commit: b16da905db1cc8496e77a4cca519a181a5e6cd0c
last_mapped_at: 2026-11-06T17:10:00.000Z
---
# Testing Patterns

**Analysis Date:** 2026-11-06

## Test Framework

**Runners:**
- **Playwright Test** (`@playwright/test` ^1.64.1) - Multi-viewport browser automation, UI interaction, visual snapshot audit (`playwright.config.ts`, `scripts/run-playwright.mjs`).
- **Node.js ESM Test Runner / TSX** (`tsx`, `node:assert`, `node:test`) - Integration test scripts, API contract verification, and security isolation harnesses (`scripts/`).

**Assertion Libraries:**
- Playwright `expect` with auto-retrying matchers (`toBeVisible`, `toHaveText`, `toHaveCount`).
- Node built-in `node:assert` (`assert.strictEqual`, `assert.deepStrictEqual`, `assert.ok`).

**Primary Test Commands:**
```bash
# Production verification suites
npm run test:builder         # Resume builder validation and A4 print pagination tests
npm run test:auth            # Cryptographic session security and authentication suite
npm run test:admin           # Administrator role isolation and authorization checks
npm run test:gemini          # Google Gemini 3.5 Flash resilience, timeouts, and fallbacks
npm run test:jobs            # Job discovery, Adzuna/Jooble provider adapters, and cooldown
npm run test:workflow        # Job tailoring and application assistant workflow
npm run test:career          # Integrated career platform and readiness calculation
npm run test:assistant       # Application assistant, cover letter, and interview simulation
npm run test:security        # Session secret length enforcement and fail-closed security
npm run test:proctoring      # Skill assessment anti-cheat and tab-switch proctoring

# End-to-end student journey & staging validation
npx tsx scripts/test_student_full_journey_e2e.mjs   # 17-step end-to-end student journey
node scripts/test_career_command_center.mjs         # 43-test Career Command Center integrity
node scripts/test_staging_validation.mjs             # 13-workflow staging environment validation

# Playwright browser suites
npm run test:e2e:smoke       # Quick desktop smoke test
npm run test:e2e:public      # Public pages (landing, jobs, analyzer, theme, navigation)
```

## Test File Organization

**Locations:**
- `scripts/`: 54 curated automated test suites testing backend APIs, business logic, security boundaries, and database migrations.
- `e2e/`: Playwright browser test specifications.

**Directory Structure:**
```
smart-resume-ai/
├── e2e/
│   ├── smoke.spec.ts                     # Desktop & mobile smoke testing
│   ├── landing.spec.ts                   # Landing page interactions & CTA
│   ├── ats-analyzer.spec.ts              # In-browser ATS analysis flow
│   ├── jobs.spec.ts                      # Job search, filters, and cards
│   ├── theme.spec.ts                     # Dark/light theme switching
│   └── responsive-navigation.spec.ts     # Mobile hamburger & drawer navigation
└── scripts/
    ├── test_student_full_journey_e2e.mjs # 17-step student lifecycle
    ├── test_career_command_center.mjs    # Readiness score & timeline integrity
    ├── test_staging_validation.mjs       # Staging environment 13-step validation
    ├── test_auth_security_comprehensive.mjs
    ├── test_p0_p1_security_fixes.mjs
    ├── test_gemini_service_resilience.mjs
    ├── test_resume_builder_and_pdf.mjs
    └── test_job_platform_regression.mjs
```

## Test Structure & Patterns

**Sequential Step-by-Step E2E Runner Pattern:**
```javascript
// scripts/test_student_full_journey_e2e.mjs
let passedCount = 0;
async function runStep(stepNumber, description, fn) {
  console.log(`\n[Step ${stepNumber}] ${description}`);
  try {
    await fn();
    console.log(`✓ Step ${stepNumber} passed.`);
    passedCount++;
  } catch (err) {
    console.error(`✗ Step ${stepNumber} failed:`, err);
    throw err;
  }
}

// Execution
await runStep(1, 'Register Fresh Student Account', async () => {
  const res = await fetch('http://localhost:3000/api/auth/register', { ... });
  assert.strictEqual(res.status, 201);
});
```

**Playwright Browser Spec Pattern:**
```typescript
// e2e/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Smart Resume AI Smoke Suite', () => {
  test('Landing page renders without console errors or visual slop', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('text=Build Your Career')).toBeVisible();
  });
});
```

## Mocking & Fault Injection

**Gemini AI Resiliency Testing (`scripts/test_gemini_service_resilience.mjs`):**
- Simulates network timeouts, HTTP 429 quota exhaustion, and HTTP 500 service errors.
- Verifies that `analyzeResumeWithGemini` seamlessly falls back to candidate models and deterministic algorithms without crashing the parent process.

**Job Aggregator Fault Testing (`scripts/test_job_platform_regression.mjs`):**
- Simulates external API provider outages (Adzuna down, Jooble offline).
- Verifies that cached local jobs and fallback links are served, and error states do not break job discovery.

**Data Isolation & Fixtures:**
- **Zero Production Overwrite:** Automated tests NEVER execute against production databases.
- **Isolated SQLite Databases:** Test suites use environment variable `PLAYWRIGHT_TEST_DB_PATH` or `STAGING_DB_PATH` (e.g. `test-results/db/test-db.sqlite`) created in temporary test directories and deleted upon test completion.
- **Dynamic Credentials:** Unique test student emails are generated per run (`student_${Date.now()}@example.com`) to guarantee complete test isolation.

## Verification Checklist

Before opening a pull request or deploying:
1. `npx tsc --noEmit` exits with code 0 (zero TypeScript errors).
2. `npm run lint` exits with code 0 (zero ESLint errors).
3. `npm run build` exits with code 0 (all 85 routes compile cleanly).
4. `npm run test:builder`, `npm run test:auth`, `npm run test:security`, and `scripts/test_staging_validation.mjs` all report 100% pass rates.

---

*Testing analysis: 2026-11-06*
*Update when test patterns change*

