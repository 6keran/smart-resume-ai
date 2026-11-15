---
last_mapped_commit: b16da905db1cc8496e77a4cca519a181a5e6cd0c
last_mapped_at: 2026-11-06T17:10:00.000Z
---
# External Integrations

**Analysis Date:** 2026-11-06

## APIs & External Services

**AI & Natural Language Processing:**
- **Google Gemini API** (`@google/genai`)
  - **Purpose:** Resume structural analysis, skill extraction, ATS score assessment, interview practice feedback, and career chatbot guidance.
  - **Models:**
    - Primary: `gemini-3.5-flash`
    - Fallback: `gemini-3.5-flash-lite`, `gemini-flash-latest`
    - Deterministic fallback: Built-in deterministic ATS engine (`src/server/services/gemini.ts`, `src/server/services/resumeIntelligence.ts`)
  - **Authentication:** `GEMINI_API_KEY` or `GOOGLE_API_KEY` environment variable.
  - **Implementation Location:** `src/server/services/gemini.ts`, `src/server/services/careerIntelligence.ts`, `src/server/services/applicationAssistant.ts`.
  - **Fault Tolerance:** Automatic candidate model failover, 12-second timeout protection, and graceful zero-crash fallback to deterministic local rules when the API is unreachable or quota is exceeded.

**Job Aggregator Feeds:**
- **Adzuna Job API**
  - **Purpose:** Live job search feed and market compensation data.
  - **Integration:** REST API via standard `fetch`.
  - **Authentication:** `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`.
  - **Implementation Location:** `src/server/services/jobs/providers/adzuna.ts`.
  - **Resilience:** Gracefully skipped if credentials are omitted; returns empty list rather than throwing errors.
- **Jooble Job Search API**
  - **Purpose:** International and remote job search listings.
  - **Integration:** REST POST JSON API via `fetch`.
  - **Authentication:** `JOOBLE_API_KEY`.
  - **Implementation Location:** `src/server/services/jobs/providers/jooble.ts`.
  - **Resilience:** Returns structured empty arrays on network failure or rate limit.
- **Naukri & LinkedIn Integration**
  - **Purpose:** Direct candidate search URLs and contextual job aggregation with rate-limit protection.
  - **Implementation Location:** `src/server/services/jobs/providers/naukri.ts`, `src/server/services/jobs/providers/linkedin.ts`, `src/server/services/jobs/providers/naukriCooldown.ts`.
  - **Resilience:** Circuit-breaker cooldown timer (`naukriCooldown.ts`) prevents IP blocking or excessive requests during active user searches.

## Data Storage

**Databases:**
- **PostgreSQL (Neon Serverless PostgreSQL)**
  - **Target Environment:** Production and Remote Staging on Vercel.
  - **Connection:** Configured via `DATABASE_URL` or `POSTGRES_URL` (with `?sslmode=require`).
  - **Driver:** Node `pg` (`pg.Pool`) with pooled connection limits (max 5 clients in serverless runtime, 10s idle timeout).
  - **Migration & Verification Tooling:** `scripts/init_postgres_schema.mjs`, `scripts/migrate_sqlite_to_postgres.mjs`, `scripts/verify_postgres_schema.mjs`.
  - **Adapter Location:** `src/server/db/adapter.ts`, `src/server/db/index.ts`.
- **SQLite (`node:sqlite` DatabaseSync)**
  - **Target Environment:** Local development, offline testing, and isolated staging regression validation.
  - **Connection:** File path `data/smart_resume.db` or isolated test paths (e.g. `test-results/db/staging-environment.sqlite`).
  - **Adapter Location:** `src/server/db/adapter.ts` (synchronous execution with mutex-locked transactions).

**Document & File Storage:**
- **In-Memory Buffers (Serverless Compatible)**
  - **Storage:** No persistent local filesystem dependence. Uploaded resumes (PDF/DOCX) are parsed entirely in memory (`Buffer`) using `pdf-parse` and `mammoth` (`src/server/services/extractResumeText.ts`).
  - **Size Limit:** 10MB upload ceiling enforced with magic-byte validation (`%PDF-`, `PK\x03\x04`).
  - **Client-Side Export:** Resume PDFs are rendered client-side directly using CSS `@page` print rules (`src/components/builder/A4ResumeDocument.tsx`), eliminating serverless headless browser dependencies.

## Authentication & Identity

**Stateless HMAC Session Tokens:**
- **Provider:** Built-in cryptographic token system using Node.js `node:crypto`.
- **Cookies:**
  - Student Session: `sra_user_session` (httpOnly, sameSite: 'lax', secure in production).
  - Administrator Session: `sra_admin_session` (httpOnly, sameSite: 'strict', secure in production).
- **Signing Secret:** `ADMIN_SESSION_SECRET` (strictly enforced $\ge 32$ characters in production, fail-closed in `src/server/auth/adminSession.ts` and `src/lib/sessionAuth.ts`).
- **Password Security:** Scrypt password hashing with 16-byte random salt and 64-byte key output (`src/server/db/index.ts`).

## Monitoring & Observability

**Logging:**
- Standard output (`stdout` / `stderr`) with structured log prefixes: `[Smart Resume AI]`, `[Gemini]`, `[Database Adapter]`, `[Proxy]`.
- Compatible with Vercel Runtime Logs and external Log Drains (e.g. Datadog, Axiom).
- Telemetry logging for end-to-end testing supported via `E2E_GEMINI_TELEMETRY_PATH`.

**Security Auditing:**
- Rate limiting middleware in `src/proxy.ts` (`checkAuthRateLimit`, `checkAnonymousAtsRateLimit`) with standard HTTP 429 response headers (`Retry-After`, `X-RateLimit-*`).

## CI/CD & Deployment

**Hosting Platform:**
- **Vercel:** Optimized for Next.js App Router with automatic route splitting, static asset caching, and serverless API execution.
- **Build Command:** `npm run build` (`next build --webpack`).
- **Zero Local Disk Writes:** Codebase strictly conforms to serverless stateless architecture.

**Staging Infrastructure:**
- Remote Staging on Vercel preview environments paired with dedicated Neon PostgreSQL staging branches (`ep-*-pooler.us-east-2.aws.neon.tech`).
- Complete automated staging test harness: `scripts/test_staging_validation.mjs` (13/13 workflows passing).

## Environment Configuration

**Development (`.env.local`):**
- `ADMIN_SESSION_SECRET`: Random 32+ character string.
- `GEMINI_API_KEY`: Optional; deterministic engine used when absent.
- `DATABASE_URL`: Optional; SQLite used when absent.

**Staging & Production (Vercel Project Settings):**
- `ADMIN_SESSION_SECRET`: Production-grade cryptographically secure secret ($\ge 32$ chars).
- `GEMINI_API_KEY`: Google AI Studio production API key.
- `DATABASE_URL` / `POSTGRES_URL`: Neon pooled PostgreSQL connection string with `sslmode=require`.
- `DB_PROVIDER`: `postgres`.

---

*Integration audit: 2026-11-06*
*Update when adding/removing external services*

