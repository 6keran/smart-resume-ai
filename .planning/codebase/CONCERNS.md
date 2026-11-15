---
last_mapped_commit: b16da905db1cc8496e77a4cca519a181a5e6cd0c
last_mapped_at: 2026-11-06T17:10:00.000Z
---
# Codebase Concerns

**Analysis Date:** 2026-11-06

## Tech Debt

**Dual-Dialect SQL Adapter Maintenance:**
- **Issue:** `src/server/db/adapter.ts` dynamically translates SQLite SQL to PostgreSQL syntax (e.g. converting `?` to `$1`, transforming `INSERT OR IGNORE` to `ON CONFLICT DO NOTHING`, and typecasting `ROUND(AVG(...))` queries).
- **Files:** `src/server/db/adapter.ts`, `src/server/db/index.ts`.
- **Why:** To enable zero-configuration local development on SQLite while deploying seamlessly to Neon PostgreSQL on Vercel.
- **Impact:** Any developer writing raw SQL queries must be mindful of syntax differences between SQLite and Postgres. Complex Postgres-only features (e.g. JSONB operators, specific window functions) cannot be used without custom translation logic.
- **Fix approach:** When adding new queries, use parameterized statements and test against both SQLite (`DB_PROVIDER=sqlite`) and PostgreSQL (`DB_PROVIDER=postgres`). Long-term, consider a lightweight type-safe query builder like Kysely or Drizzle ORM.

**Handcrafted Schema Migrations:**
- **Issue:** Database schema initialization and column migrations are written as standalone scripts (`scripts/init_postgres_schema.mjs`, `scripts/migrate_sqlite_to_postgres.mjs`) rather than managed by an automated migration tool (like Prisma or Drizzle).
- **Files:** `scripts/init_postgres_schema.mjs`, `src/server/db/index.ts`.
- **Why:** Kept dependencies minimal and eliminated heavy build-time ORM overhead in serverless environments.
- **Impact:** Schema modifications must be manually updated in both `src/server/db/index.ts` (for SQLite) and `scripts/init_postgres_schema.mjs` (for PostgreSQL).
- **Fix approach:** Ensure any schema changes are verified using `scripts/verify_postgres_schema.mjs`.

## Security Considerations

**Production Admin Session Secret Enforcement:**
- **Risk:** If `ADMIN_SESSION_SECRET` is unset or trivial in production, attackers could forge admin session cookies and compromise user data.
- **Files:** `src/server/auth/adminSession.ts`, `src/lib/sessionAuth.ts`.
- **Current mitigation:** Cryptographic check enforces that `ADMIN_SESSION_SECRET` must be set and at least 32 characters in production (`NODE_ENV === 'production'`), failing closed and throwing an error on startup if weak.
- **Recommendations:** Ensure production deployment environment variables on Vercel are generated using high-entropy random generation (`openssl rand -base64 32`).

**In-Memory Document Buffer Safety:**
- **Risk:** Attackers uploading malicious or zip-bomb PDFs/DOCXs could cause memory exhaustion in serverless function instances.
- **Files:** `src/server/services/extractResumeText.ts`, `src/app/api/analyze-resume/route.ts`.
- **Current mitigation:** Strict 10MB file size limit enforced before processing, accompanied by magic-byte validation (`%PDF-` and `PK\x03\x04`). Processing is performed purely in memory with zero temp file disk writes.
- **Recommendations:** Configure Vercel function memory to at least 512MB-1024MB to accommodate parallel in-flight parsing.

## Performance Bottlenecks & Scaling Limits

**Serverless Database Connection Pooling:**
- **Resource:** Neon PostgreSQL connection pool.
- **Measurement / Limit:** Neon free/standard tier supports limited concurrent direct connections.
- **Files:** `src/server/db/adapter.ts`.
- **Cause:** In a serverless environment like Vercel, every incoming request can spawn a new function instance, quickly exhausting database connections if not pooled.
- **Current mitigation:** `adapter.ts` enforces `max: 5` clients per pool and a short `idleTimeoutMillis: 10000`. Staging and production configurations MUST connect through Neon's connection pooler endpoint (`-pooler` subdomain).
- **Improvement path:** Maintain connection string with Neon pooled endpoint and avoid long-running background queries inside HTTP request lifecycles.

**Serverless Execution Timeouts (Vercel Hobby 10s / Pro 60s):**
- **Operation:** Live Gemini AI resume analysis with large resumes.
- **Measurement:** Complex Gemini 3.5 Flash queries typically take 1.2s to 3.5s, but can experience transient latency up to 8s during Google API traffic spikes.
- **Files:** `src/server/services/gemini.ts`.
- **Current mitigation:** Built-in 12-second abort signal timeout. If the request times out or is in danger of exceeding function limits, it automatically falls back to deterministic local scoring.
- **Improvement path:** Keep client-facing API responses fast; stream responses for chatbot interactions where applicable.

## Fragile Areas

**SQLite Mutex Concurrency in Tests:**
- **File:** `src/server/db/adapter.ts` (lines 175-200).
- **Why fragile:** Node's built-in `DatabaseSync` is synchronous. Concurrent async operations attempting transactions can encounter file lock contention if not serialized.
- **Safe modification:** `adapter.ts` implements an in-memory `sqliteLock` promise chain to serialize transactions in SQLite mode. Do not remove this locking mechanism.
- **Test coverage:** Verified by `scripts/test_staging_validation.mjs` and multi-threaded stress scripts.

**Third-Party Job Feed Availability:**
- **Files:** `src/server/services/jobs/providers/adzuna.ts`, `src/server/services/jobs/providers/jooble.ts`, `src/server/services/jobs/providers/naukriCooldown.ts`.
- **Why fragile:** External job APIs can encounter rate limits (429) or downtime.
- **Safe modification:** The aggregator implements individual try/catch wrappers for each provider, a local SQLite/PostgreSQL caching layer (`cache.ts`), and the `naukriCooldown.ts` circuit-breaker. When providers fail, the system falls back to cached records and verified direct URLs.

## Test Coverage Gaps

**Live Cloud Neon Testing:**
- **What's not tested locally:** Local integration test runs rely on SQLite; automated remote testing against Neon PostgreSQL requires active internet access and a live Neon connection string (`DATABASE_URL`).
- **Risk:** Minor SQL dialect differences could slip through if new queries are not tested against PostgreSQL.
- **Current mitigation:** `scripts/init_postgres_schema.mjs` and `scripts/verify_postgres_schema.mjs` provide deterministic syntax checks for PostgreSQL.
- **Action required:** Run `npm run db:verify:postgres` when remote staging credentials are provisioned.

---

*Concerns audit: 2026-11-06*
*Update as issues are fixed or new ones discovered*

