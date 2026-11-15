# Requirements: Smart Resume AI — Production Staging Milestone

**Defined:** 2026-11-06  
**Core Value:** Empower students to generate, evaluate, and tailor ATS-compliant resumes with verified career evidence and reliable multi-tier AI guidance that never crashes or fabricates achievements.

## v1 Requirements

Requirements for this milestone release. Each maps to the 5 roadmap phases.

### 1. Cloud Infrastructure & Database (Phase 1)

- [ ] **INFRA-01**: Staging environment variables standardized in `.env.example` with clear distinction between local, staging, and production keys.
- [ ] **INFRA-02**: Neon PostgreSQL pooled connection (`ep-*-pooler`) configured in `adapter.ts` with `sslmode=require`, max 5 pool clients, and 10s idle timeout.
- [ ] **INFRA-03**: Safe, idempotent database schema initialization (`scripts/init_postgres_schema.mjs`) verified against isolated Neon staging database.
- [ ] **INFRA-04**: Database verification suite (`scripts/verify_postgres_schema.mjs`) confirms 100% of tables, columns, indexes, and constraints.
- [ ] **INFRA-05**: Atomic transaction rollbacks verified using PostgreSQL `SAVEPOINT` nesting without connection pool poisoning.

### 2. Authentication, Security & Edge Proxy (Phase 2)

- [x] **AUTH-01**: Stateless HMAC-SHA256 session cookies (`sra_user_session`, `sra_admin_session`) persist and validate cleanly across distributed serverless function invocations.
- [x] **AUTH-02**: Multi-user isolation test confirms complete session and database row separation with zero data leakage.
- [x] **AUTH-03**: Edge proxy (`src/proxy.ts`) rate limiting verified for distributed serverless environments on `/api/auth/login`, `/api/auth/register`, and `/api/admin/auth/login`.
- [x] **AUTH-04**: Session secret length enforcement ($\ge 32$ random characters) fails closed in production, preventing server startup on weak configuration.
- [x] **AUTH-05**: Security audit confirms all API endpoints enforce proper role-based authorization (USER vs ADMIN) and HTTP security headers (`HSTS`, `X-Frame-Options`, `nosniff`).

### 3. Intelligence & Document Pipelines (Phase 3)

- [x] **AI-01**: Google Gemini model availability verified via live API probe against Google GenAI endpoint rather than assuming static fallback IDs.
- [x] **AI-02**: Gemini 3.5 Flash integration tested for live resume analysis, timeout handling (12s abort), and automatic candidate model failover (`gemini-3.5-flash-lite`).
- [x] **AI-03**: Built-in deterministic ATS analysis engine gracefully handles AI outages with zero user-facing downtime and sub-500ms response latency.
- [x] **AI-04**: In-memory PDF and DOCX resume parsing (`extractResumeText.ts`) verified up to 10MB with magic-byte validation and zero local disk writes.
- [x] **AI-05**: All resume templates in `src/components/builder/` verified for DIN A4 standard print pagination ($210\text{mm} \times 297\text{mm}$) with zero text clipping.

### 4. Job Aggregator, System Integration & Performance (Phase 4)

- [x] **SYS-01**: Adzuna and Jooble external job providers verified to handle API outages, missing credentials, and rate limits without throwing 500 errors.
- [x] **SYS-02**: `naukriCooldown.ts` circuit-breaker verified to prevent IP throttling during repeated job queries.
- [x] **SYS-03**: Complete 17-step student journey E2E test suite (`scripts/test_student_full_journey_e2e.mjs`) verified 100% passing against staging configuration.
- [x] **SYS-04**: Multi-viewport Playwright regression tests (Desktop 1440x900, Tablet 768x1024, Mobile 390x844) verified with zero layout shifts.
- [x] **SYS-05**: Performance audit measures serverless response times and database latency, targeting p95 under 800ms as an observational metric.

### 5. Operational Readiness, Recovery & Rollback (Phase 5)

- [x] **OPS-01**: Author comprehensive `STAGING_DEPLOYMENT_RUNBOOK.md` covering step-by-step Vercel preview deployment and Neon PostgreSQL branch linking.
- [x] **OPS-02**: Create staging environment configuration checklist and secret rotation guidelines.
- [x] **OPS-03**: Perform live backup and recovery validation test on an isolated Neon staging database branch (Procedures verified; live remote run deferred).
- [x] **OPS-04**: Author `ROLLBACK_PROCEDURES.md` detailing instant Vercel deployment rollback and Neon point-in-time branch restores.
- [x] **OPS-05**: Formulate final Staging Acceptance Sign-Off Report with go/no-go production checklist.

## Out of Scope

| Feature / Action | Reason |
| :--- | :--- |
| Modifying or testing against the production database | Strict safety requirement; all testing must use an isolated Neon branch |
| Pushing or deploying to production domain | Explicit user approval required before any production release |
| UI redesigns or new decorative elements | Preserving the verified white, charcoal, slate, and royal blue design system |
| Fabricating test metrics or mock testimonials | Platform strictly adheres to authentic evidence and truthful data |
| Hardcoding credentials in repository files | Prevents security leaks; all secrets managed via environment variables |

## Traceability

| Requirement | Phase | Status |
| :--- | :--- | :--- |
| INFRA-01 | Phase 1 | Pending |
| INFRA-02 | Phase 1 | Pending |
| INFRA-03 | Phase 1 | Pending |
| INFRA-04 | Phase 1 | Pending |
| INFRA-05 | Phase 1 | Pending |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AI-01 | Phase 3 | Complete |
| AI-02 | Phase 3 | Complete |
| AI-03 | Phase 3 | Complete |
| AI-04 | Phase 3 | Complete |
| AI-05 | Phase 3 | Complete |
| SYS-01 | Phase 4 | Complete |
| SYS-02 | Phase 4 | Complete |
| SYS-03 | Phase 4 | Complete |
| SYS-04 | Phase 4 | Complete |
| SYS-05 | Phase 4 | Complete |
| OPS-01 | Phase 5 | Complete |
| OPS-02 | Phase 5 | Complete |
| OPS-03 | Phase 5 | Complete (Doc/Local Verified) |
| OPS-04 | Phase 5 | Complete |
| OPS-05 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25 (100% mapped)
- Unmapped: 0

---
*Requirements defined: 2026-11-06*

