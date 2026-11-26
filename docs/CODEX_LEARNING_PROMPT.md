# TASK LEARN-1 MASTER PROMPT
# Part A · External course recommendations and My Learning
# Part B · External certification recommendations by provider and cost
# SHARED: the new UI system applies to every screen of both parts

Part A and Part B live under one menu section, "Learn". Do the phases in order; Part B starts at Phase 6.

Read first, in this order: AGENTS.md, MASTER_PROMPT.md (all rules stay in force, especially: no fabricated courses, certifications or links), AGENT_LOG.md, docs/DESIGN.md.
Extend the existing catalog, progress, role profiles, guidance and résumé entry flows. The assessment engine has a separate purpose in recording skill results. The two internal credential writers and their dependencies are documented in docs/LEARNING_PHASE_0_AUDIT.md. Investigate and report them before any separately approved change.
Keep Git read-only. Use existing dependencies. Present any proposed SQL for both adapters before execution. Remote database access, including Neon, is prohibited in this project audit.
No Neon access, no .env reading. One agent only; my dev server must be stopped before any build or test run (ask me if port 3000 is busy). Never kill processes or delete .next or its lock.
Do not touch: resume templates, A4/print CSS, the ATS engine, or the account deletion logic (but you must extend it, see below). Plan first for every phase marked PLAN.

---

## PRODUCT DEFINITION

Smart Resume AI recommends genuine courses and certifications delivered by external providers. Its role is discovery, accurate learning progress, and optional résumé entry for external certifications a user confirms they actually completed. Internal certificate issuance, generation, awards, storage, codes, printing, sharing and public verification are outside this product's scope.

Use the Learn section for courses, external certifications and My Learning. Preserve existing URLs and data under the standing review rules. Present the impact of any proposed change to legacy URLs, browser storage, exports or historical rows before requesting approval.

- **Recommended** means the external offering fits a role or skill. Verify the provider, the specific offering and its destination before listing it. Attribute the source and show where the link opens.
- **In progress** means the user explicitly recorded a start. It belongs in their learning tracker.
- **Completed** means the user confirmed actual completion with the external provider. Only a completed external certification can be added to the user's chosen résumé after confirmation. Keep actual course completion and internal assessment results accurately labelled as such.

Never infer completion from a recommendation, link visit, checklist count, internal score or generated badge. Record only supported provider names, titles, prices, dates and durations. Exclude unverified offerings and document the reason. Preserve existing user-authored résumé information. Never fabricate ratings, enrollments or credentials.

---

## Data model review for the plan phase

Review courses, course_progress, user_roadmap_progress and existing résumé certification metadata against the external recommendation and tracking requirements. Cover consistent SQLite/PostgreSQL catalog definitions, provider provenance, ownership, valid status transitions, concurrency and completion dates. Use the minimum approved changes. Preserve assessment history and user-entered résumé text.

Review legacy certificates, user_skills.certificate_id, audit references and browser storage for dependencies only. Hold any retirement, data conversion, cleanup or migration for an explicit decision. For approved new user-linked tracking, include account deletion and its discovery test. If a schema change is needed, present idempotent SQL for both adapters, the required initializer/migration changes and the test strategy for review. Use an explicit fresh disposable SQLite path for every database suite. Block production, existing user databases, prior sandboxes and remote connections.

---

## BACKEND RULES

- Audit external catalog reads, user-scoped progress reads/writes and confirmed résumé additions. Verify the owner on every path and keep assessment outcomes independent of external completion.
- Maintain existing skill assessments and audit ownership for active and finished attempts. Questions, answers and private results retain their existing access protections. Adding a platform course exam or credential workflow is outside this recommendation feature.
- Review each potential legacy retirement with its callers, stored data, existing links and approval requirements. Admin work for this feature concerns provider listings, source freshness, user reports and audit events.
- Suggest courses using a saved target role and skill gaps. If the user has no target, show the catalog and an optional goal prompt.

---

## FRONTEND RULES (use docs/DESIGN.md tokens and shared components only)

Review the external course catalog, offering detail with a genuine provider link, My Learning and the completed-certification résumé confirmation. Distinguish Recommended, In progress and Completed in all views. Keep internal scores in assessment history. Enter an external certification on a résumé only with the user's confirmation of actual completion and their choice of résumé. A provider-issued name or date must come from the source or the user.

Use the design system and shared components, real empty/loading/error states, keyboard accessibility and the existing mobile drawer. Preserve normal navigation at 390, 768, 1366 and 1440 pixels. Bring the existing internal certificate screens and routes to the owner for a compatibility decision.

---

## External course candidates for plan review

During the approved planning phase, propose up to three genuine provider courses aligned with the existing roles. Identify the specific provider page, date checked, skill relevance and provider-published details. Record exclusions if fewer than three qualify. Provider delivery and assessment belong to the provider. Submit sources for approval before catalog entry.

---

## PART B: CERTIFICATIONS DIRECTORY (external certifications, two categories: FREE and PAID)

Help users discover external certifications, filter by cost, level, skill and role, track their own progress, and list confirmed external completions. The provider delivers the offering and any credential. Link directly to the specific provider offering. The Learn menu groups external courses, external certifications and My Learning.

CATEGORIES (a segmented control "Free | Paid", default Free, with counts that come from real data):
- FREE: the certificate itself costs nothing to obtain.
- PAID: getting the certificate or sitting the exam has a fee. Add a badge "Free to learn" when the learning content is free but the certificate or exam costs money.
- "Financial aid or free trial available" may appear only as a small badge when the provider states it; it is never a third category.

EACH CARD: name, provider (plain text, no logos unless the provider's brand rules allow it and I approve), cost badge, price text exactly as listed by the provider with "as of <price_checked_at>" (if unknown show "See provider"; never guess,
never convert currencies), level, duration only if the provider states it, skills covered, related roles (from roleProfiles), format (online course, proctored exam, project), language, link "Opens <provider>", last verified date, and status (active or link problem).
NO ratings, popularity, "enrolled" counts, "best" or "top" labels unless computed from our own data (for example relevance to the user's target role) and explained ("Matches 3 skills in your gap").
Use a short original description, provider-stated prerequisites and what the provider says completion entails. Route bad links or changed prices through “Report a problem”.
Filters: role (default = the user's target role if set; if not set show everything and a "Set your goal" prompt), skill, level, provider, format, language, and search with suggestions. Sort: relevance to my role (explainable), A to Z, recently verified.
Show Recommended, In progress and Completed distinctly. Saving an item is a bookmark. The user explicitly confirms any completed external certification before adding it to My Career Data or a selected résumé. Store only recommendation and user-reported progress or résumé metadata. Certificate documents, platform credential IDs and verification records are outside scope. An internal assessment records a skill result and cannot establish external completion.

DATA SOURCES (compliance first):
1. Primary: a curated, reviewed data file (for example src/lib/learning/certificationDirectory.ts or a JSON file) maintained by us. Every record has source URL, last_verified_at and price_checked_at.
   Initial seed: propose 30 to 40 well-known certifications across the 9 role domains, split between free and paid. Candidates must be researched and each provider page opened and verified; anything unverified is excluded. I approve the list before it is seeded.
   Do not invent certifications, providers, prices, durations or URLs. Do not rely on memory for prices.
2. Optional automated feeds ONLY where a provider offers an official, permitted API or data feed whose terms allow this use. Example to evaluate: the Microsoft Learn Catalog API (public documentation says it is free, needs no authentication,
   and lists certifications and exams; the older endpoint is documented as planned for deprecation after June 2026 and the newer Learn Platform API requires authentication and onboarding). Check current status and terms before building anything.
   For every candidate source report: endpoint, authentication, terms of use, rate limits, which fields exist (is price included?), caching rules and attribution requirements. Do not add a source without my approval. Keys only in environment variables.
3. FORBIDDEN: scraping provider websites, bypassing logins, rate limits or bot protection, copying provider descriptions, images, logos or reviews, and presenting provider content as ours.
4. No affiliate or sponsored links in v1 and no tracking parameters. If ever added, they must be labelled "Sponsored" and must never influence ranking.
Freshness: scripts/verify_certification_links.mjs checks every URL (status and redirects) and flags "link problem"; document how to run it on a schedule. A price older than 90 days shows "Price may have changed. Check the provider."
Admin: a simple admin page to add, edit and deactivate directory entries, see link status and read user problem reports (reuse existing admin components); every change recorded in audit_events.

### Directory data model in the plan phase

Review the existing role profiles and progress model before proposing directory or tracking tables. Catalog fields must support the genuine provider, specific offering URL, source dates, externally stated cost, title, role/skill relevance and link status. Tracking is scoped to the user and offering and records user-reported state and an optional actual completion date. Preserve existing optional user-authored résumé fields. Validate any user-supplied external URL as HTTPS, limit its length, escape it when presented and avoid server-side fetching. Include ownership, account deletion and adapter parity in review. Present idempotent SQL for both adapters only during the approved plan phase.

---

## SHARED UI RULES (Part A and Part B; every screen)

- Use docs/DESIGN.md tokens and the shared components in src/components/ui only (light theme, Inter, hairline cards, one accent, rounded controls at 10px). No new visual style, no hard-coded colors, no emoji icons, no gradients or glows.
- Use the app shell and navigation (Learn group in sidebar, header menu and mobile drawer). Keep every old URL working.
- Every screen has real empty, loading and error states, works at 390, 768, 1366 and 1440 widths, is keyboard accessible, and has 44px touch targets on mobile.
- Motion in moderation: reveal on scroll (200ms), a crossfade (150ms) and sliding underline for the Free | Paid switch, card hover lift of 2px, progress bars animate once, tab counts count up once. Everything is disabled under prefers-reduced-motion.
  No looping decoration.
- If the Nimbus mascot component already exists (CODEX_MASCOT_PROMPT.md), use it in empty states and as a small helper ("Tell me your target role and I will suggest certifications") in a static or idle pose. If it does not exist, do not build it in this task.
- Copy is plain and honest: every card states that the price and certificate come from the provider and may change. No fake numbers, testimonials or urgency.

---

## TESTS AND EVIDENCE

- Cover source eligibility and exclusions, links and attribution, non-fabricated costs, catalog parity, explicit progress transitions, completion dates, concurrent writes, ownership and deletion. Verify that a recommendation, in-progress item, checklist or internal score cannot become an earned external qualification.
- Keep assessment ownership coverage for active and completed attempts, including all early-return paths. For approved legacy changes, verify that grading and profile history still work independently and that retired certificate paths no longer issue, store, display or verify internal credentials.
- Use the four existing Playwright viewports for browsing a genuine offering, recording progress and confirming a completed external certification for a chosen résumé. Review external sources by provider page and dated evidence. Link-check HTTP results alone are insufficient to establish the offering or its price.
- Run every database suite independently on an explicitly named fresh disposable SQLite sandbox. Verify the exact path and isolation before writes. Preserve existing data, sandboxes and the session backup.
- Run with my dev server stopped: npx tsc --noEmit, npm run lint, npm run build, npm run test:e2e:public, the new tests, test_account_deletion_completeness, test_career_path_security, test:phase1, test:templates, and the ATS determinism test. Confirm the ATS SHA256
  (F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251) is unchanged and templates and A4/print CSS have no changes. Report real counts; skipped is not passed.

---

## PHASES (STOP for my "approved" after each; report format: files changed, commands with exit codes and counts, what is NOT verified, risks; append to AGENT_LOG.md)

Phase 0 (read-only audit). Inventory internal credential dependencies, routes, storage and impact. Trace the distinct external recommendation, assessment ownership, catalog and progress flows. Report and wait.
Phase 1 (PLAN). After explicit approval, review external recommendation sources, the three user states, ownership, catalog consistency, proposed data/API/page changes and the fresh-empty isolation helper. Show any needed SQLite and PostgreSQL SQL and the impact of any proposed legacy retirement. Stop for review. No code.
Phase 2. Implement only approved data-layer and source changes for genuine provider courses and user-scoped tracking. Cover parity, deletion and progress integrity.
Phase 3. Verify approved catalog/progress APIs, ownership, provider attribution and completion eligibility. Keep existing assessment security in scope for audit. Changes to authentication, rate limiting, data ownership or legacy paths require separate approval.
Phase 4. Review external course pages and My Learning, including completed-item résumé confirmation. Capture each approved page group at 1366×768 and 390×844, full page plus three frames and a reduced-motion image for animations. Index under scripts/visual-qa/learning/ and stop for visual review.
Phase 5. Complete Part A tests, link evidence and documentation in docs/LEARNING.md. Document any approved migration procedure for the owner. No remote execution.
Phase 6 (Part B, read-only plus PLAN). Review the external certification directory, current data and source terms. Present endpoints, authentication, terms, rate limits, price fields and attribution. Target 30–40 real provider offerings only when supported by an opened provider page, exact price evidence and date. List exclusions separately. Stop for review.
Phase 7. Implement only approved external catalog data, link checks and user-scoped tracking. Test genuine provider destinations, cost classification, stale or unknown prices, explicit state transitions, completion eligibility, URL validation and account deletion. Stop.
Phase 8. Review the approved directory APIs and UI, Free/Paid filters, provider links, personal tracking, completed-only résumé action, reports and admin management. Run four-viewport tests. Capture and index the required screenshots under scripts/visual-qa/certifications/ and stop for visual review.
Phase 9. Consolidate test results, source terms, verified offerings, exclusions, open risks and any owner migration notes in docs/CERTIFICATIONS.md and AGENT_LOG.md. Stop.

Part B additional checks cover provider attribution, dated prices, the genuine cost of earning a qualification, working provider links, safe external URLs and exclusion of every unverified offering. Never display an internally generated credential as an earned qualification.

START: Phase 0 only. Check port 3000 is free (if not, STOP and ask me). Report and STOP.
