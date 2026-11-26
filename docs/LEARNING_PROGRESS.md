# Learn and certifications progress

## Session checkpoint · 26 November 2026

**Phase 0 is complete. Phase 1 awaits approval.** The product recommends external provider offerings and records user-reported learning progress. Internal certificate systems are legacy dependencies under review. The previously completed ATS retry (8/8), public suite (52/52) and three isolated SQLite suites (103/103) are recorded below. [Dependency inventory](LEARNING_PHASE_0_AUDIT.md#legacy-certificate-dependencies-and-impact) · [Consolidated audit](../SMART_RESUME_AI_COMPLETE_PROJECT_AUDIT.md) · [Phase scope](CODEX_LEARNING_PROMPT.md) · [Agent log](../AGENT_LOG.md)

| Phase | Item | Status | File or evidence location |
| --- | --- | --- | --- |
| Preflight | Read the instructions and log. Check port 3000, Next.js locks, working tree and ATS fingerprint | Done | `AGENTS.md`, `MASTER_PROMPT.md`, `AGENT_LOG.md`, `docs/DESIGN.md`, `docs/CODEX_LEARNING_PROMPT.md`, `src/server/services/deterministicAtsEngine.ts` |
| Preflight | Select Phases 0–1 and take one verified source-only safety copy for the session | Done | `AGENT_LOG.md`, backup path below |
| 0 | Measure baseline checks and record the public browser failure | Done | `AGENT_LOG.md`, evidence directory below |
| 0 follow-up | Diagnose the lost first click and gate both input-mode buttons until mount | Done | `src/app/ats-score/page.tsx`, delayed-hydration evidence below |
| 0 follow-up | Verify the unchanged ATS Analyzer spec on the local application server | Done | [Individual results and screenshots](C:/Users/kiran/AppData/Local/Temp/ats-retry-phase0-fc9065c83c/INDEX.md), `e2e/ats-analyzer.spec.ts` |
| 0 | Browser/build/TypeScript/lint, templates, ATS determinism, protected-file comparison and handoff | Done | After-phase results below and `AGENT_LOG.md` |
| 0 | Account deletion completeness | Done | `scripts/test_account_deletion_completeness.mjs` · [74/74](C:/Users/kiran/AppData/Local/Temp/learn0-db-ff14e348e9c5/account-suite.txt) |
| 0 | Career-path security | Done | `scripts/test_career_path_security.mjs` · [5/5](C:/Users/kiran/AppData/Local/Temp/learn0-db-ff14e348e9c5/career-suite.txt) |
| 0 | Database and résumé versioning | Done | `scripts/test_phase1_database_and_versioning.mjs` · [24/24](C:/Users/kiran/AppData/Local/Temp/learn0-db-ff14e348e9c5/version-suite.txt) |
| 0 | Trace assessment ownership, server and browser credential writers, storage, APIs, public lookup, dashboards, exports, AI claims and retirement impact | Done | [Assessment audit](LEARNING_PHASE_0_AUDIT.md#assessment-ownership-and-grading) · [Dependency and impact map](LEARNING_PHASE_0_AUDIT.md#legacy-certificate-dependencies-and-impact) |
| 0 | Inventory catalog sources, course parity, roadmap states and the completed-only résumé boundary | Done | [Source inventory](LEARNING_PHASE_0_AUDIT.md#existing-external-references-excluded-from-verified-content) · [External recommendations and résumé gaps](LEARNING_PHASE_0_AUDIT.md#external-recommendations-and-completed-qualifications) |
| 1 | Review external recommendations, Recommended / In progress / Completed, ownership, catalog consistency, and any proposed API, page or adapter changes. Present legacy impact for a separate decision. | Not started | [Planning scope](CODEX_LEARNING_PROMPT.md) · [Audit findings](LEARNING_PHASE_0_AUDIT.md#recommended-priorities) |
| 1 | Propose defaulting test isolation to a fresh empty SQLite file and removing the fallback that copies the project database | Not started | `scripts/testDbIsolation.mjs` |
| 1 | Propose genuine external course candidates with offering-specific provider pages, dated evidence, relevance and exclusions | Not started | `src/lib/career/roleProfiles.ts`, `scripts/verify_career_links.mjs`, `docs/CODEX_LEARNING_PROMPT.md` |
| 2 | Implement only approved recommendation and progress data, adapter parity, account deletion coverage and tests | Not started | `src/server/db/index.ts`, `scripts/init_postgres_schema.mjs`, `scripts/migrations/`, `scripts/test_account_deletion_completeness.mjs` |
| 3 | Review catalog and user-scoped progress APIs, explicit state transitions, provider attribution and completion eligibility | Not started | `src/app/api/user/courses/route.ts`, `src/app/api/career/roadmap/progress/route.ts`, `docs/CODEX_LEARNING_PROMPT.md` |
| 3 | Verify assessment ownership independently of progress. Review separately authorized legacy changes against existing consumers and data-preservation obligations. | Not started | `src/app/api/assessments/submit/route.ts`, `src/server/db/index.ts`, [legacy dependencies](LEARNING_PHASE_0_AUDIT.md#legacy-certificate-dependencies-and-impact) |
| 4 | Review external offering pages, My Learning, status labels and navigation on mobile and desktop | Not started | `src/app/dashboard/courses/page.tsx`, `src/app/guidance/page.tsx`, `docs/CODEX_LEARNING_PROMPT.md` |
| 4 | Review completed-only résumé confirmation and each approved page group's accessibility and visual evidence | Not started | `src/app/builder/page.tsx`, planned `e2e/learning.spec.ts` and `scripts/visual-qa/learning/INDEX.md` |
| 5 | Run Part A verification, including link checks, service tests and four-viewport browser coverage. Document the feature and migration procedure | Not started | `scripts/verify_career_links.mjs`, planned `e2e/learning.spec.ts` and `docs/LEARNING.md` |
| 6 | Audit current external certification data. Design the directory, data model, pages and components | Not started | `src/lib/career/roleProfiles.ts`, `src/app/dashboard/courses/page.tsx`, `docs/CODEX_LEARNING_PROMPT.md` § Part B |
| 6 | Review source terms, endpoints, authentication, limits, price fields, caching and attribution. Present 30–40 candidates with provider-page and dated price evidence, and list exclusions | Not started | `docs/CODEX_LEARNING_PROMPT.md` § Data Sources and Phase 6 |
| 7 | Implement approved directory data and migrations, reviewed seed records, the link checker and per-user tracking | Not started | `scripts/init_postgres_schema.mjs`, `scripts/migrations/`, planned `scripts/verify_certification_links.mjs` |
| 7 | Test offering-specific provider links, cost classification, three distinct states, ownership, external URL safety and account deletion | Not started | `scripts/test_account_deletion_completeness.mjs`, `docs/CODEX_LEARNING_PROMPT.md` |
| 8 | Review directory APIs and UI, provider attribution, tracked states, completed-only confirmed résumé export, problem reports and admin management | Not started | `docs/CODEX_LEARNING_PROMPT.md` (Part B and Phase 8) |
| 8 | Review directory navigation, four-viewport browser tests and desktop/mobile screenshots with motion and reduced-motion evidence | Not started | Planned `scripts/visual-qa/certifications/INDEX.md` |
| 9 | Complete verification, document provider terms and exclusions, and update the migration runbook | Not started | Planned `docs/CERTIFICATIONS.md`, `scripts/verify_certification_links.mjs`, `AGENT_LOG.md` |

## Phase 0 baseline · 26 November 2026

| Check | Baseline | After phase |
| --- | --- | --- |
| TypeScript and ESLint | Both exited 0, with 0 errors or warnings | Both exited 0, zero diagnostics |
| Production build | Exit 0, 90/90 static pages generated | Exit 0, 90/90 generated |
| Public Playwright suite, four viewports | Exit 1, 51 passed, 1 failed, 0 skipped out of 52 | Exit 0, 52 passed, 0 failed, 0 skipped. Same six specs, production guest server and database-blocked configuration. |
| Account deletion completeness | Exit 0, 74/74 across 22 direct and 3 indirect tables | Exit 0, 74 passed, 0 failed, 0 skipped across the same 25 tables. The target session received 401 after deletion. |
| Career-path security | Exit 0, 5/5 after a local worker-permission retry. The first attempt ran 0 checks | Exit 0, 5 passed, 0 failed, 0 skipped. The verification launcher needed one module-loader retry before any assertion ran. |
| ATS engine SHA-256 | `F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251` | Exact match |
| Template suite | Outside this phase's baseline | Exit 0, 63/63 passed |
| ATS determinism | Outside this phase's baseline | Exit 0, 7/7 top-level checks passed. The two optional live HTTP comparisons in check 2 were skipped. |
| Database/versioning (`test:phase1` script) | Outside this phase's baseline | Exit 0, 24 passed, 0 failed, 0 skipped. Three local migration calls and preservation of synthetic records were verified. |

The 768×1024 baseline test found and clicked **Paste Text**, then waited 20 seconds for `aria-selected` to become `true`. It stayed `false`. A later replay confirmed that the click arrived before React attached the handler. The public suite used offline fallback fonts in the dev server. The previous complete public run was 52/52 on 23 November. [Failing assertion](../e2e/ats-analyzer.spec.ts)

Session backup — `D:\projects\backups\learn-phase\0-20261126-1423`. Verified 541 files (7,630,284 bytes) against source SHA-256 hashes. Free space before copying was 6,578,008,064 bytes, projected free space was 6,570,377,780 bytes, and the measured free space after copying was 6,538,231,808 bytes.

The source-only copy was reverified against its original manifest on this retry. The earlier disk inventory lists the 25 largest files and top-level folder sizes. The sandbox inventory contains names and sizes only. Legacy test-file provenance was not established. [Disk usage](C:/Users/kiran/AppData/Local/Temp/ats-tab-fix-fcb8412f17/disk-usage.md) · [Sandbox file sizes](C:/Users/kiran/AppData/Local/Temp/ats-tab-fix-fcb8412f17/sandbox-file-sizes.txt)

Local baseline evidence — `C:\Users\kiran\AppData\Local\Temp\learn0-baseline-497b4b0eaa30`. It includes the selected source-file list, the original `git status --short`, build and service output, and Playwright's failure screenshot, trace and error context. The initial status had 89 modified tracked paths and 14 untracked entries. The baseline career test added `?? data/`. That synthetic sandbox remains on disk. The three final suites used separate new directories. Read-only `git ls-files data/` returned zero tracked paths.

## Focused ATS verification · 26 November 2026

| Check | Before the fix | After the fix |
| --- | --- | --- |
| First click with client JavaScript held at 375×812, 390×844, 768×1024 and 1440×900 | Both buttons enabled in the HTML. The initial Paste click was lost at all four sizes. A second click after hydration worked at all four. | Both native buttons disabled in the HTML and enabled after mount at every size. The first enabled click selected Paste and displayed the textarea in 4/4 cases. Enter, Space, file selection and retention of typed text passed in 4/4. |
| TypeScript, ESLint and production build | Exited 0. Build generated 90/90 static pages. | All exited 0. TypeScript and ESLint reported zero diagnostics. Build generated 90/90 static pages. |
| Unchanged ATS Analyzer spec, both cases at four widths | 7 passed, 1 failed in the 52-case dev baseline | First launcher attempt had 0 passed, 8 failed, 0 skipped. All received HTTP 500 before the UI because the launcher omitted the disposable secret. The approved retry used the value generated by the standard configuration and passed all eight, with 0 failed and 0 skipped. |
| ATS engine SHA-256 | `F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251` | Exact match. The ATS spec also matches the verified backup byte for byte. |

The delayed-hydration probe used production HTML and JavaScript with a recorded guest response. Its first Chromium launch was blocked locally before any cases ran. Its permitted retry completed all four pre-fix observations. The subsequent server-backed retry exercised the actual public page and preserved the original fixtures and assertions. Its temporary launcher omitted account registration, restricted requests to GET/HEAD, and blocked SQLite and PostgreSQL. One desktop home-page background RSC request was canceled. All eight diagnostics reported zero console errors, HTTP errors and horizontal overflow. [Pre-fix observations](C:/Users/kiran/AppData/Local/Temp/ats-tab-fix-fcb8412f17/hydration-before.json) · [Post-fix observations](C:/Users/kiran/AppData/Local/Temp/ats-tab-fix-fcb8412f17/hydration-after.json) · [First server-backed attempt](C:/Users/kiran/AppData/Local/Temp/ats-tab-fix-fcb8412f17/ats-playwright.txt) · [Successful retry and screenshots](C:/Users/kiran/AppData/Local/Temp/ats-retry-phase0-fc9065c83c/INDEX.md)

## After-phase evidence and decision

`npm run test:e2e:public` ran with a temporary guest configuration. Individual suite counts were ATS Analyzer 8/8, jobs 4/4, landing 4/4, public routes 24/24, responsive navigation 4/4 and theme 8/8. The first launch approval timed out before starting a process. The permitted retry ran all 52 cases once. All 52 diagnostics reported zero console errors, HTTP errors and horizontal overflow. They recorded 17 browser-canceled requests. The server handled 2,176 GET requests. The backup verified against its original 541-file SHA-256 manifest. Metadata for all eight files under `data/` matched and no database-open attempt was recorded. [Full Playwright result](C:/Users/kiran/AppData/Local/Temp/ats-retry-phase0-fc9065c83c/public-result.json) · [Service and build evidence](C:/Users/kiran/AppData/Local/Temp/ats-retry-phase0-fc9065c83c)

No new learning tests apply to this read-only phase. The link checker was not run against providers. All 52 external catalog mentions are listed as unverified for admission, with their checked-in sources. The planned screenshot indexes `scripts/visual-qa/learning/INDEX.md` and `scripts/visual-qa/certifications/INDEX.md` are due when those page groups are built.

The three final service passes used fresh SQLite files with zero schema objects at first open. Each suite opened one assigned file. Each independent read-only inspection found only its own synthetic users and returned `ok` from SQLite's quick check. The fixture user, résumé and application in the versioning test matched their pre-test digest. The eight existing files matched their entry metadata throughout this run. Two sidecar timestamps already differed from the preceding audit before testing began. [Exact sandbox paths, launcher failures and evidence](LEARNING_PHASE_0_AUDIT.md#phase-0-verification-results)

**DECISION NEEDED before Phase 1.** Review the active legacy credential dependencies, the assessment ownership finding, catalog parity and progress integrity. Authorize any legacy behavior or data change separately. The next learning phase is planning for external recommendations and explicit user-reported completion. [Ranked findings](LEARNING_PHASE_0_AUDIT.md#recommended-priorities)
