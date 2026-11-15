# Smart Resume AI — Production-Ready Staging & Cloud Verification

## What This Is

Smart Resume AI is an AI-powered student career companion and resume engineering platform built with Next.js 16, React 19, TypeScript, and a dual-engine SQLite/PostgreSQL architecture. It guides university students and early-career jobseekers through end-to-end career readiness: ATS-optimized resume building, verified skill assessments, guided project mentoring, job discovery aggregation, and simulated interview preparation.

## Core Value

Empower students to generate, evaluate, and tailor ATS-compliant resumes with verified career evidence and reliable multi-tier AI guidance that never crashes or fabricates achievements.

## Requirements

### Validated

<!-- Shipped, verified, and functioning in local brownfield codebase -->

- ✓ **VAL-01**: In-memory PDF and DOCX resume text extraction with magic-byte validation and zero local disk dependencies — `src/server/services/extractResumeText.ts`
- ✓ **VAL-02**: Multi-tier Google Gemini 3.5 Flash integration with 12s timeout and deterministic ATS fallback — `src/server/services/gemini.ts`
- ✓ **VAL-03**: Dual-engine database adapter supporting SQLite (`DatabaseSync`) and PostgreSQL (`pg.Pool`) — `src/server/db/adapter.ts`
- ✓ **VAL-04**: Stateless HMAC-SHA256 session management with fail-closed production secrets — `src/server/auth/adminSession.ts`
- ✓ **VAL-05**: Interactive Resume Builder studio with DIN A4 print styling and zero text clipping — `src/components/builder/A4ResumeDocument.tsx`
- ✓ **VAL-06**: Clean, slop-free professional design system (white, charcoal, slate, royal blue) — `src/app/globals.css`
- ✓ **VAL-07**: Complete 17-step end-to-end student journey verification suite — `scripts/test_student_full_journey_e2e.mjs`
- ✓ **VAL-08**: 13-workflow staging environment local validation suite — `scripts/test_staging_validation.mjs`

### Active

<!-- Scope of the current Production-Ready Staging milestone -->

- [ ] **STAGE-01**: Configure and validate isolated Neon PostgreSQL staging branch (`ep-*-pooler`) with connection pooling (max 5) and SSL enforcement.
- [ ] **STAGE-02**: Verify idempotent PostgreSQL schema initialization (`init_postgres_schema.mjs`) and verify all tables/indexes via `verify_postgres_schema.mjs`.
- [ ] **STAGE-03**: Verify stateless authentication, cookie persistence (`sra_user_session`, `sra_admin_session`), and session isolation across distributed serverless lambda executions.
- [ ] **STAGE-04**: Verify distributed rate limiting and brute-force defenses across independent Vercel serverless function instances.
- [ ] **STAGE-05**: Verify live Google Gemini model availability using actual API discovery/probe responses rather than assuming static fallback IDs.
- [ ] **STAGE-06**: Test ATS analyzer and interview simulator with live Gemini API, simulated timeouts, and graceful deterministic fallback.
- [ ] **STAGE-07**: Validate third-party job aggregators (Adzuna, Jooble, Naukri/LinkedIn builders) and cooldown circuit-breaker against rate limits.
- [ ] **STAGE-08**: Test all resume builder templates, single/multi-page A4 print accuracy, and browser PDF downloads.
- [ ] **STAGE-09**: Perform comprehensive security audit of API route authorization, HTTP security headers, and environment variable isolation.
- [ ] **STAGE-10**: Execute production build (`next build --webpack`), strict TypeScript check, and full Playwright test matrix.
- [ ] **STAGE-11**: Benchmark API response times and database query latency, targeting p95 under 800ms as an observational metric.
- [ ] **STAGE-12**: Perform real backup and point-in-time recovery testing against an isolated Neon staging branch.
- [ ] **STAGE-13**: Deliver comprehensive Staging Deployment Runbook, Environment Configuration Checklist, and Rollback Procedures.

### Out of Scope

<!-- Explicit boundaries to prevent scope creep and maintain safety -->

- Modifying the production database or running migrations against production — staging must use a dedicated Neon branch.
- Deploying directly to the production domain without explicit user approval.
- Introducing new UI redesigns or decorative elements (maintain royal blue / charcoal design system).
- Inventing fake metrics, fake testimonials, or placeholder marketing data.
- Hardcoding secrets or committing `.env` / `.env.local` files to Git.
- Automatic Git commits or branch pushes without explicit user authorization.

## Context

- **Current Repository State**: Clean, slop-free Next.js 16.4.3 codebase with 85 routes compiling in 18.2s, 19 passing test suites, and 0 TypeScript/ESLint errors.
- **Hosting Target**: Vercel Serverless (Node.js runtime).
- **Database Target**: Neon Serverless PostgreSQL with pgBouncer connection pooling.
- **Previous Validation**: Local staging validation suite passed 13/13 workflows using an isolated SQLite database.

## Constraints

- **Safety**: Zero destructive actions against production; all testing restricted to an isolated Neon branch.
- **Architecture**: Zero persistent local filesystem dependency; serverless stateless operations only.
- **Design System**: Strict adherence to white, charcoal, slate, and royal blue palette without gradients or visual slop.
- **Secrets**: Session secret must be $\ge 32$ characters; zero credentials exposed in logs or documentation.
- **Version Control**: Uncommitted working tree modifications must be preserved; no unapproved commits or pushes.

## Key Decisions

| Decision | Rationale | Outcome |
| :--- | :--- | :--- |
| Use isolated Neon PostgreSQL staging branch | Prevents any contamination or loss of production data | ✓ Approved |
| Dual-Engine Database Adapter (`adapter.ts`) | Allows rapid local offline testing via SQLite while deploying to Neon Postgres in staging/prod | ✓ Implemented |
| In-memory Buffer parsing for PDF/DOCX | Avoids serverless filesystem ephemeral data loss and container disk exhaustion | ✓ Implemented |
| Client-side A4 print CSS for PDF generation | Eliminates heavy headless Puppeteer runtime overhead in serverless lambdas | ✓ Implemented |
| Multi-tier Gemini + Deterministic AI fallback | Guarantees 100% uptime for students even during Google Gemini API outages or quota limits | ✓ Implemented |
| Distributed rate limiting validation | Serverless function instances do not share memory; must verify edge proxy protections | — Pending Phase 2 |
| Live probe for Gemini model availability | Model IDs evolve; probing live Google GenAI API prevents runtime 404 errors | — Pending Phase 3 |
| Backup & point-in-time restore verification | Runbook must include actual test evidence of database restoration | — Pending Phase 5 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason.
2. Requirements validated? → Move to Validated with phase reference.
3. New requirements emerged? → Add to Active.
4. Decisions to log? → Add to Key Decisions.
5. "What This Is" still accurate? → Update if drifted.

---
*Last updated: 2026-11-06 after milestone initialization*

