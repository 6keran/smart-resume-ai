---
last_mapped_commit: b16da905db1cc8496e77a4cca519a181a5e6cd0c
last_mapped_at: 2026-11-06T17:10:00.000Z
---
# Architecture

**Analysis Date:** 2026-11-06

## Pattern Overview

**Overall:** Full-Stack Next.js 16 App Router application with React 19 Server Components (RSC), serverless API route handlers, dual-engine database abstraction, and a multi-tier generative AI / deterministic fallback pipeline.

**Key Characteristics:**
- **Stateless Serverless Execution:** Zero dependency on persistent local filesystem storage or long-lived in-memory server state. All session information is stored in cryptographically signed HMAC-SHA256 cookies.
- **Dual-Engine Persistence:** A unified database adapter seamlessly powers SQLite for zero-setup local development and isolated offline testing, while targeting Neon PostgreSQL with connection pooling for staging and production environments.
- **Multi-Tier AI Resilience:** AI operations query Google Gemini 3.5 Flash, automatically fall back to Gemini 3.5 Flash Lite on failure/timeout, and gracefully degrade to high-precision deterministic rules with zero user-facing downtime.
- **Client-Side Document Rendering:** Resumes are styled with CSS `@page` print rules and rendered directly in the user's browser, eliminating heavy headless browser (Puppeteer) overhead in serverless lambdas.

## Layers

```
┌───────────────────────────────────────────────────────────┐
│                    Presentation Layer                     │
│   React 19 Components (RSC & Client), Next.js Pages UI    │
│   (src/app/**/page.tsx, src/components/**)                │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                 Routing & Security Proxy                  │
│   Next.js Edge Proxy, Session Verification, Rate Limiting │
│   (src/proxy.ts, src/lib/sessionAuth.ts)                  │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                     API Route Handlers                    │
│   HTTP endpoints handling JSON payloads & Multipart files │
│   (src/app/api/**/route.ts)                               │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                    Domain Service Layer                   │
│   Pure TypeScript services encapsulating business logic   │
│   (src/server/services/**, src/server/auth/**)            │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                 Unified Database Adapter                  │
│   Dual-dialect query execution, transactions, savepoints  │
│   (src/server/db/adapter.ts, src/server/db/index.ts)      │
└─────────────────────────────┬─────────────────────────────┘
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
    ┌──────────────────────┐     ┌──────────────────────┐
    │  SQLite (node:sqlite)│     │  Neon PostgreSQL (pg)│
    │  (Local Dev / Tests) │     │  (Staging / Prod)    │
    └──────────────────────┘     └──────────────────────┘
```

**1. Presentation Layer:**
- **Purpose:** Deliver responsive, accessible student career tooling and administrative controls.
- **Contains:** Next.js App Router pages (`src/app/`), modular UI components (`src/components/ui/`, `src/components/builder/`, `src/components/dashboard/`), and client state contexts.
- **Depends on:** API Route Handlers for data mutations; shared types in `src/types/`.

**2. Routing & Security Proxy Layer:**
- **Purpose:** Request filtering, brute-force protection, rate limiting, and session verification.
- **Contains:** `src/proxy.ts`, `src/lib/rateLimit.ts`, `src/lib/sessionAuth.ts`.
- **Enforces:** Cryptographic validation of `sra_user_session` and `sra_admin_session` cookies before allowing access to protected dashboard and admin routes.

**3. API Route Layer:**
- **Purpose:** RESTful endpoints for student workflows, resume parsing, AI analysis, skill quizzes, and admin management.
- **Contains:** 30+ route handlers in `src/app/api/`.
- **Depends on:** Domain services and unified database adapter.

**4. Domain Service Layer:**
- **Purpose:** Core career intelligence, resume parsing, job deduplication, and assessment grading.
- **Contains:**
  - `src/server/services/unifiedStudentContext.ts`: Consolidated student profile and timeline aggregator.
  - `src/server/services/careerActionEngine.ts`: Dynamic readiness score calculation and qualifying milestone tracking.
  - `src/server/services/gemini.ts`: Multi-tier Gemini API client with retry and deterministic fallback.
  - `src/server/services/extractResumeText.ts`: In-memory PDF/DOCX extraction.
  - `src/server/services/jobs/`: Job aggregation, deduplication, search ranking, and cooldown management.
- **Guaranteed:** Protected by `import 'server-only'` to prevent leaking to client bundles.

**5. Database Access Layer:**
- **Purpose:** Abstract SQL dialect differences between SQLite and PostgreSQL.
- **Contains:** `src/server/db/adapter.ts`, `src/server/db/index.ts`.
- **Translates:** Parameter placeholders (`?` to `$1`), upserts (`INSERT OR IGNORE` to `ON CONFLICT DO NOTHING`), numeric aggregations (`ROUND(AVG(...))` casting), and nested savepoints.

## Data Flow

**1. Student Career Lifecycle Flow (17-Step Journey):**
1. **Registration & Auth:** User registers via `/api/auth/register`, password hashed via `scrypt`, HMAC cookie `sra_user_session` issued.
2. **Profile Setup:** Student inputs education, target domain, and skills via `/api/student/profile`.
3. **Resume Creation / Import:** User imports existing PDF/DOCX or builds structured resume in `/builder`. Text parsed in-memory via `extractResumeText.ts`.
4. **ATS Analysis:** Resume submitted to `/api/analyze-resume`. Evaluated by Gemini 3.5 Flash or deterministic engine. Returns ATS score, category ratings, and prioritized suggestions.
5. **Skill Assessment:** Student takes verified skill quiz in `/skills`. Proctoring detects tab switches. Score persisted to `skill_assessments`.
6. **Career Action Engine:** `careerActionEngine.ts` recalculates student readiness score (0-100) based strictly on genuine qualifying activities.
7. **Job Discovery & Matching:** User searches `/jobs`. Providers query Adzuna, Jooble, and cached indexes. Jobs ranked using student's verified skills and target role.
8. **Application Assistant & Prep:** Student generates tailored cover letter and practices simulated interview questions via `/api/career/assistant`.
9. **Career Dashboard:** Central command center displays real-time readiness breakdown, recommendations, and application pipeline.

**2. AI Request Lifecycle:**
1. Route handler invokes service function (e.g. `analyzeResumeWithGemini`).
2. Service inspects `GEMINI_API_KEY`. If unset, routes immediately to deterministic rule engine.
3. If key exists, attempts Google Gemini 3.5 Flash with strict timeout.
4. On model failure or quota exhaustion (429/503), tries secondary candidate (`gemini-3.5-flash-lite`).
5. If all network models fail, logs warning and seamlessly returns deterministic analysis result without throwing or breaking the user experience.

## Key Abstractions

**`DatabaseClient` (`src/server/db/adapter.ts`):**
- Unified interface with `prepare(sql)`, `exec(sql)`, `transaction(fn)`, and `isPostgres` boolean flag.
- Enables identical calling code across SQLite in local tests and Neon PostgreSQL in staging/production.

**`UnifiedStudentContext` (`src/server/services/unifiedStudentContext.ts`):**
- Aggregates student demographic data, claimed skills, verified assessment scores, completed projects, and job applications into a single immutable context for AI assistants.

**`CareerActionEngine` (`src/server/services/careerActionEngine.ts`):**
- Business rules engine computing student readiness scores. Protects against artificial inflation by requiring verifiable qualifying evidence.

**`A4ResumeDocument` (`src/components/builder/A4ResumeDocument.tsx`):**
- Print-accurate DOM component adhering to standard DIN A4 dimensions ($210\text{mm} \times 297\text{mm}$). Ensures perfect 1-page or 2-page pagination during browser print to PDF.

## Entry Points

**Web Routes:**
- Landing Page: `src/app/page.tsx`
- Dashboard: `src/app/dashboard/page.tsx`
- Resume Builder: `src/app/builder/page.tsx`
- ATS Analyzer: `src/app/analyzer/page.tsx`
- Job Discovery: `src/app/jobs/page.tsx`
- Admin Console: `src/app/admin/page.tsx`

**API Routes:**
- Authentication: `src/app/api/auth/`
- Resume Operations: `src/app/api/resumes/`, `src/app/api/analyze-resume/`
- Career Intelligence: `src/app/api/career/`
- Job Feeds: `src/app/api/jobs/`
- Administrative Control: `src/app/api/admin/`

## Error Handling

**Strategy:**
- Edge proxy rejects unauthorized requests with HTTP 401/403 or redirects unauthenticated browser sessions to `/login`.
- API route handlers encapsulate execution in `try / catch` blocks and return typed JSON: `{ error: string, details?: any }`.
- AI and external provider failures degrade gracefully to local deterministic services with zero application downtime.
- Database transactions use nested savepoints (`SAVEPOINT`) to guarantee atomic rollbacks on partial failure.

## Cross-Cutting Concerns

- **Stateless Authentication:** Stateless HMAC cookies ensure serverless scalability without server-side session stores.
- **Rate Limiting:** IP and endpoint based token bucket limiting in `src/proxy.ts` protects auth endpoints from brute-force attacks.
- **Server Boundary Protection:** Explicit `import 'server-only'` across all database and auth modules ensures zero leakage of backend logic or credentials into client JavaScript bundles.

---

*Architecture analysis: 2026-11-06*
*Update when major patterns change*

