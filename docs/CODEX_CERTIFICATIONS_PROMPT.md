# TASK CERT-1: EXTERNAL CERTIFICATIONS AND COURSES (recommend, track, add to resume) + LEGACY CERTIFICATE RETIREMENT

Save as: docs/CODEX_CERTIFICATIONS_PROMPT.md. THIS FILE SUPERSEDES docs/CODEX_LEARNING_PROMPT.md wherever they conflict (especially anything about issuing, generating, storing or verifying certificates).
Read first, in this order: AGENTS.md, MASTER_PROMPT.md (all rules stay in force), AGENT_LOG.md, docs/LEARNING_PROGRESS.md, docs/LEARNING_PHASE_0_AUDIT.md, docs/DESIGN.md.

---

## PRODUCT REQUIREMENT (final)

Smart Resume AI does NOT issue, generate, award, store or publicly verify certificates. It RECOMMENDS genuine external certifications and courses so users can improve their skills, resume and job opportunities,
lets users track them, and lets users list the ones they have ACTUALLY COMPLETED on their profile and resume.

Rules that never change:
1. No internally generated certificate, certificate code or public certificate verification is presented as a qualification earned by a user.
2. A user can list a certification as Completed only after confirming they really completed it (attestation). It is labelled "Self-reported". It is never shown as verified and never counts as a verified skill.
3. Every recommendation links to a genuine external provider page that has been opened and verified (URL, provider, last_verified_at). Anything without a verified URL is excluded and listed separately.
4. Never fabricate provider names, certification names, prices, durations, credentials, ratings, enrollment counts or completion status. Prices are shown exactly as the provider lists them with a checked date, or "See provider".
5. Three states, always clearly distinguished everywhere (UI, chatbot, dashboard, resume): Recommended (suggested by us, computed), In progress (user started), Completed (user confirmed). "Saved" is an optional bookmark state.

Hard constraints for the whole task: no git changes (no add, commit, push, restore, stash, clean); no new dependencies; no remote database access, and no migration or SQL run against any remote database (SQL is written and shown for approval);
never read or print .env values; no deletion of certificate records, tables or any user data in this task; do not touch resume templates, A4/print CSS, the ATS engine or its weights; one agent only; my dev server must be stopped before any build, test or screenshot run
(ask me if port 3000 is busy); never kill a process you did not start; never delete .next or its lock; never use a test helper that copies the project database (always pass a fresh empty SQLite sandbox under data/test_sandboxes/).
Disk guard: before any backup or large run, check free space on D: (Get-PSDrive D); if less than 5 GB would remain, STOP and tell me. One safety copy per session.

---

## FEATURE SPEC

Menu: Learn -> Certifications (Free | Paid), Courses, My Learning (Recommended, In progress, Completed). Old URLs (/dashboard/courses, /dashboard/certificates) keep working through redirects or reuse, but must no longer present internal certificates as qualifications once the approved retirement stage is done.

Catalog item kinds: certification or exam, professional certificate, course, learning path. All are EXTERNAL and open on the provider's site ("Opens <provider>").
Categories: FREE (the certificate itself costs nothing) and PAID (the certificate or exam has a fee; badge "Free to learn" when the learning is free but the certificate or exam costs money).
Card: name, provider (plain text, no logos unless the brand rules allow it and I approve), kind, cost badge, price text as listed with "as of <price_checked_at>" or "See provider", level, duration only if stated by the provider, skills covered,
related roles, format, language, last verified date, link status, and "Why recommended" (for example "Covers 2 skills in your gap for <target role>"). Short ORIGINAL summary in our own words; never copy provider marketing text.
Filters: role (default = target role; if not set show all and a "Set your goal" prompt; never assume a role), skill, level, provider, format, language, search with suggestions. Sort: relevance to my role (explainable), A to Z, recently verified.
Tracking: Recommended is computed from the target role, skill gaps and curated role profiles. Saved, In progress and Completed are stored per user.
Completed requires an attestation checkbox ("I completed this certification"), a completion date (not in the future; the date comes from the user, NEVER a default such as 2024), and optionally a credential URL (https only) and credential ID.
Show "Self-reported" and, when a link is given, "Credential link provided (not verified by us)".
Resume: "Add to resume" appears only for Completed items, asks for confirmation, writes a Certification entry with the real provider as issuer and the user's completion year (never a hard-coded year), and never overwrites existing entries.
My Career Data: shows tracked items with their state and source labels. Readiness and skill provenance: self-reported certifications are shown separately and do NOT count as verified skills; do not change readiness weights without my approval.
AI Assistant: may mention only directory items that exist and links they have; must use the right state wording ("recommended", "you are in progress", "you marked completed (self-reported)"); never claims the user has a certificate unless they marked it Completed; update the prompt and grounding tests accordingly (no change to the "AI Assistant" identity rule).
Report a problem: users can flag a bad link or changed price; creates a feedback record.
Admin: simple page to add, edit, deactivate directory entries, see link status and problem reports (reuse admin components; every change recorded in audit_events).

DATA SOURCES (compliance first):
1. Primary: a curated, reviewed data file (for example src/lib/learning/certificationDirectory.ts) with source URL, last_verified_at and price_checked_at for every record. Propose 30 to 40 entries across the 9 role domains, split between free and paid. Each provider page must be opened and verified. Unverified entries are excluded and listed separately.
   The existing role profile certification mentions (12 found; 4 have no URL) must be mapped to directory entries or removed from recommendations until verified.
2. Optional official feeds only where a provider offers a permitted API whose terms allow this use (example to evaluate: the Microsoft Learn Catalog API: documented as free and without authentication, but the older endpoint is documented as planned for deprecation after June 2026 and the newer one needs authentication and onboarding; verify current status and terms first).
   For each candidate source report endpoint, authentication, terms, rate limits, which fields exist (is price included?), caching rules and attribution. Any new source needs my approval. Keys only in environment variables.
3. FORBIDDEN: scraping provider sites, bypassing logins, rate limits or bot protection, copying descriptions, images, logos or reviews, affiliate or sponsored links, tracking parameters.
Freshness: scripts/verify_certification_links.mjs checks every URL (status and redirects), flags "link problem"; prices older than 90 days show "Price may have changed. Check the provider."

DATA MODEL (PLAN first: SQL for SQLite and Postgres, idempotent, not run remotely; added to scripts/init_postgres_schema.mjs and a new file in scripts/migrations/):
- external_learning_items (id, slug, kind, name, provider, cost_type 'free' or 'paid', free_to_learn boolean, price_text, price_amount nullable, price_currency nullable, price_checked_at, level, duration_text nullable, format, language, skills json, roles json, summary (our words), url, source ('curated' or API name), last_verified_at, link_status, is_active, created_at, updated_at).
- user_learning_tracking (id, user_id, item_id, status 'saved' or 'in_progress' or 'completed', completed_on nullable, attested boolean, credential_url nullable, credential_id nullable, notes nullable, created_at, updated_at; unique (user_id, item_id)). Constraint: status completed requires attested = true and completed_on present.
- Validate credential_url (https only, max length, no javascript: or data: schemes, escaped on render, never fetched server-side). Ownership checks on every tracking read and write. Add both tables to the account deletion routine and its test.

---

## LEGACY INTERNAL CERTIFICATE RETIREMENT (staged; analysis first; nothing is deleted)

Known from Phase 0: the server writes certificate records; the browser independently generates and stores a second code that can replace the server's code in the result link; public HTML and JSON routes expose holder name and score;
dashboards, exports and chatbot responses reference these credentials. Assessment scores and history (assessments, verified_skills, user_skills) are legitimate and must be preserved.
Stages (each needs my approval; each has a rollback; each has tests before and after):
- Stage 0: impact review report (read-only): exact files, routes, tables, components, tests, dependencies and user-visible behavior that would change; what assessment features depend on certificate data; data preservation requirements; recommended order.
- Stage 1 (low risk): stop presenting internal certificates as qualifications (relabel or hide in UI, exports and chatbot answers, behind a flag if possible); remove the browser's ability to override the server's code. No data change.
- Stage 2 (security and privacy): close the public routes that expose holder and score (retire with a clear response); keep records.
- Stage 3: stop writing new certificate records on assessment pass; assessment results remain the source of truth (score, passed, date, skill status).
- Stage 4: archive plan for existing records (documented, reversible); any deletion or table drop is a separate decision by me and never part of this task.
Rollback notes for every stage; feature flags where useful; before and after test list.

---

## SECURITY AND INTEGRITY FIXES FOUND IN PHASE 0 (plan, then implement after approval, each with tests)

1. HIGH: assessment ownership. A finished attempt returns its result before checking that the requester owns it. Fix: ownership check first, return 404 for not-owned; add tests (user B cannot read user A's attempt, results, snapshots or certificate data; unauthenticated gets 401).
2. Truthful data: the resume builder pre-fills the certification issue year as 2024. Remove any hard-coded year or default; require the user's own date.
3. Guidance skips the In progress state: add it.
4. Course catalog parity: SQLite seeds six checklists and PostgreSQL seeds five. Move seeds to a single code source with idempotent upsert and add a parity test; do not change data on any remote database.
5. Learning progress integrity: reject fractional or negative counts, clamp to 0..total, clear completion date when not complete, and validate statuses server-side; add tests.
6. Test helper: scripts/testDbIsolation.mjs must default to a fresh empty database and never copy the project database (propose first; change after approval).

---

## SHARED UI RULES (every screen)

Use docs/DESIGN.md tokens and shared components in src/components/ui only (light theme, Inter, hairline cards, one accent). App shell and navigation with the Learn group in sidebar, header and mobile drawer. Real empty, loading and error states; responsive at 390, 768, 1366 and 1440;
keyboard accessible; 44px touch targets on mobile. Motion in moderation: reveal on scroll 200ms; crossfade 150ms and a sliding underline for the Free | Paid switch; card hover lift 2px; counts animate once; all disabled under prefers-reduced-motion; no looping decoration.
If the Nimbus mascot component exists, use it in empty states and as a small helper in a static or idle pose; if not, do not build it here. Copy is plain and honest: every card says the price and certificate come from the provider and may change. No fake numbers or urgency.

---

## TESTS AND EVIDENCE

- Service tests: Free versus Paid classification (the Free tab never lists an item with a fee), computed Recommended list and its explanation, tracking state machine (completed requires attestation and a past date), credential URL validation, resume entry uses the user's year and requires confirmation,
  ownership isolation between two users, account deletion removes tracking rows, catalog parity SQLite versus Postgres seeds, progress integrity rules, assessment ownership (see above), chatbot grounding for the three states and for "no certificate claimed unless Completed".
- Security tests: unauthenticated 401; cross-user reads and writes refused; unsafe credential URL schemes rejected.
- e2e (Playwright, 4 viewports and reduced motion): switch Free | Paid, filters, save, mark In progress, mark Completed with attestation, add to resume with confirmation, empty states, no console errors, no external images or provider logos load.
- Link check script over the seed; report the table. No item without a verified URL appears in recommendations.
- Run with the dev server stopped: npx tsc --noEmit, npm run lint, npm run build, npm run test:e2e:public, the new tests, test_account_deletion_completeness, test_career_path_security, test:phase1, test:templates, test_deterministic_ats_scoring.
  ATS SHA256 must stay F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251; templates and print CSS unchanged. Report real counts; skipped is not passed; state exactly which suites ran.

---

## PHASES (STOP for my "approved" after each unless I start a continuous run; report format: files changed, commands with exit codes and counts, what is NOT verified, risks; append to AGENT_LOG.md and docs/LEARNING_PROGRESS.md)

R0: LEGACY CERTIFICATE RETIREMENT IMPACT REVIEW (read-only; this was interrupted; resume it): complete the report in docs/LEARNING_PHASE_0_AUDIT.md (or a new docs/LEGACY_CERTIFICATE_IMPACT.md) with exact dependencies, risks and severity, proposed changes, data preservation requirements, tests before and after, rollback and implementation order. No code or data changes.
S1: ASSESSMENT OWNERSHIP FIX: plan, then implement and test after approval (high severity, independent of the rest).
P1: PLAN: data model SQL, source candidates with terms, the seed list (30 to 40) with evidence, page and API list, chatbot and resume changes, test plan. No code. STOP.
P2: data layer, seed (only approved entries), link checker, tracking service, progress integrity and parity fixes, tests. STOP.
P3: APIs, pages (Free | Paid, filters, cards, states, attestation form, report a problem), navigation, resume and My Career Data integration, chatbot grounding changes, admin page, e2e, screenshots to scripts/visual-qa/certifications/ (not committed). STOP.
P4: legacy retirement Stages 1 to 3 as I approve them, each with before and after tests and rollback notes. STOP after each stage.
P5: full verification, docs/CERTIFICATIONS.md, source terms summary, Neon migration runbook (Neon branch first; I run it myself). Report what is NOT verified. STOP.

START: R0 only. Check port 3000 is free and free space on D:; if either is a problem, STOP and ask me.
