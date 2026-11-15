# Roadmap: Smart Resume AI — Production Staging Milestone

## Overview

This roadmap defines the path to making Smart Resume AI production-ready through a fully verified Vercel + Neon PostgreSQL staging deployment. Spanning 5 structured phases, it hardens cloud infrastructure, verifies distributed serverless authentication, validates multi-tier Gemini AI and print-accurate resume generation, tests job search resilience, audits performance under cloud conditions, and executes actual backup/recovery drills with zero risk to production.

## Phases

- [ ] **Phase 1: Cloud Architecture & Staging Database Hardening** - Configure staging environment variables, connection pooling, and verify idempotent schema initialization on an isolated Neon branch.
- [x] **Phase 2: Authentication, Security & Edge Proxy Validation** - Validate stateless HMAC cookies, session isolation across distributed lambdas, distributed rate limiting, and role authorization.
- [x] **Phase 3: Intelligence & Document Pipelines** - Probe live Gemini model availability, test candidate failovers and deterministic fallback, audit 10MB in-memory PDF parsing, and verify A4 print rendering.
- [x] **Phase 4: Job Aggregator, System Integration & Performance** - Validate external job feeds and circuit-breakers, execute the 17-step student journey E2E suite, run Playwright multi-viewport tests, and measure p95 latency.
- [x] **Phase 5: Operational Readiness, Recovery & Rollback Protocols** - Deliver Staging Deployment Runbook, document rollback procedures, verify recovery protocols, and establish acceptance gates.

---

## Phase Details

### Phase 1: Cloud Architecture & Staging Database Hardening
**Goal**: Establish and verify the Vercel serverless staging configuration and Neon PostgreSQL database architecture using an isolated staging branch without touching production.  
**Depends on**: Nothing (first phase)  
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05  
**Success Criteria** (what must be TRUE):
1. Environment variables for staging are clearly separated in `.env.example` with zero credential leaks.
2. Neon PostgreSQL pooled connection (`ep-*-pooler`, `sslmode=require`) in `src/server/db/adapter.ts` respects the serverless connection ceiling (`max: 5`, `idleTimeoutMillis: 10000`).
3. `scripts/init_postgres_schema.mjs` executes idempotently against an isolated Neon staging database with 100% of tables and columns verified by `scripts/verify_postgres_schema.mjs`.
4. Multi-statement transactions correctly execute and roll back using PostgreSQL `SAVEPOINT` nesting without poisoning connection pool clients.
**Plans**: 2 plans

Plans:
- [ ] 01-01: Standardize staging environment configuration schema and verify serverless connection pool parameters in `adapter.ts`.
- [ ] 01-02: Execute and verify idempotent PostgreSQL schema initialization and atomic savepoint rollbacks against isolated staging database.

---

### Phase 2: Authentication, Security & Edge Proxy Validation
**Goal**: Verify that authentication, sessions, cookies, and rate limiting operate reliably across distributed serverless function instances.  
**Depends on**: Phase 1  
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05  
**Success Criteria** (what must be TRUE):
1. Stateless HMAC-SHA256 session tokens (`sra_user_session`, `sra_admin_session`) persist and validate cleanly across distributed lambda invocations.
2. Complete multi-user data isolation is verified: student accounts have zero access to peer data or unauthorized admin APIs.
3. Edge proxy (`src/proxy.ts`) rate limiting enforces brute-force defenses across independent serverless instances for authentication endpoints.
4. `ADMIN_SESSION_SECRET` strictly enforces $\ge 32$ random characters in production mode, failing closed on startup if weak or missing.
5. All sensitive server code maintains build-time isolation via `import 'server-only'`.
**Plans**: 2 plans

Plans:
- [x] 02-01: Verify stateless session persistence, cryptographic token verification, and multi-user isolation under distributed serverless simulation.
- [x] 02-02: Audit edge proxy distributed rate limiting, route authorization guards, and production secret fail-closed enforcement.

---

### Phase 3: Intelligence & Document Pipelines
**Goal**: Verify Google Gemini AI integration, live model availability, deterministic fallback, and print-accurate A4 resume exports.  
**Depends on**: Phase 2  
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05  
**Success Criteria** (what must be TRUE):
1. Active Gemini model availability is verified via live API probe rather than assuming static fallback IDs.
2. Google Gemini 3.5 Flash correctly performs resume analysis and gracefully fails over to secondary candidate models on transient error.
3. Built-in deterministic ATS engine seamlessly handles external AI timeouts (12s abort) or quota limits with sub-500ms response time and zero user-facing errors.
4. In-memory PDF/DOCX file parser (`extractResumeText.ts`) reliably processes documents up to 10MB with zero local filesystem writes.
5. All resume templates render in standard DIN A4 dimensions ($210\text{mm} \times 297\text{mm}$) with zero text clipping or page overflow during PDF export.
**Plans**: 2 plans

Plans:
- [x] 03-01: Implement and verify live Gemini model capability probing, candidate failover, and deterministic ATS fallback under timeout/quota fault injection.
- [x] 03-02: Validate in-memory document parsing limits (10MB) and test all resume builder templates for single/multi-page A4 print accuracy.

---

### Phase 4: Job Aggregator, System Integration & Performance
**Goal**: Validate external job discovery providers, verify the complete 17-step student journey end-to-end, and audit cloud performance under load.  
**Depends on**: Phase 3  
**Requirements**: SYS-01, SYS-02, SYS-03, SYS-04, SYS-05  
**Success Criteria** (what must be TRUE):
1. Adzuna and Jooble providers gracefully handle missing credentials, rate limits, and outages without breaking the jobs search experience.
2. `naukriCooldown.ts` circuit-breaker prevents IP blocking during rapid repetitive queries.
3. The complete 17-step student career journey (`scripts/test_student_full_journey_e2e.mjs`) passes 17/17 steps against the staging configuration.
4. Multi-viewport Playwright regression tests (Desktop 1440x900, Tablet 768x1024, Mobile 390x844) execute with zero visual or layout regressions.
5. Performance profiling measures API response times, database query efficiency, and serverless cold start overhead, treating p95 under 800ms as an observational metric.
**Plans**: 2 plans

Plans:
- [x] 04-01: Verify job aggregator resilience, circuit-breaker cooldown, and execute full 17-step student lifecycle E2E verification suite.
- [x] 04-02: Run Playwright multi-viewport browser matrix and measure serverless performance benchmarks and database query latency.

---

### Phase 5: Operational Readiness, Recovery & Rollback Protocols
**Goal**: Deliver comprehensive staging deployment documentation, perform actual backup and recovery validation on an isolated branch, and establish rollback procedures.  
**Depends on**: Phase 4  
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05  
**Success Criteria** (what must be TRUE):
1. Authoritative `STAGING_DEPLOYMENT_RUNBOOK.md` provides reproducible step-by-step guidance for Vercel preview deployment and Neon branch configuration.
2. Environment configuration manifest explicitly details staging vs production variable boundaries and rotation procedures.
3. A live backup and recovery drill is executed on an isolated Neon staging database branch, verifying zero data loss.
4. Authoritative `ROLLBACK_PROCEDURES.md` documents instant Vercel deployment rollback and Neon point-in-time branch restores.
5. Final Staging Acceptance Sign-Off Report provides an auditable go/no-go production checklist.
**Plans**: 2 plans

Plans:
- [x] 05-01: Author Staging Deployment Runbook, environment configuration checklist, and document backup/recovery protocols for isolated Neon branch.
- [x] 05-02: Author Rollback Procedures, compile test evidence, and produce the final Staging Acceptance Sign-Off Report.

---

## Progress

**Execution Order:**
Phases execute strictly in numeric order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5.

| Phase | Plans Complete | Status | Completed |
| :--- | :---: | :---: | :---: |
| 1. Cloud Architecture & Staging Database Hardening | 1/2 | Local Done / Remote Pending | - |
| 2. Authentication, Security & Edge Proxy Validation | 2/2 | Complete | 2026-11-06 |
| 3. Intelligence & Document Pipelines | 2/2 | Complete | 2026-11-06 |
| 4. Job Aggregator, System Integration & Performance | 2/2 | Complete | 2026-11-06 |
| 5. Operational Readiness, Recovery & Rollback Protocols | 2/2 | Complete | 2026-11-06 |

---
*Roadmap defined: 2026-11-06*

