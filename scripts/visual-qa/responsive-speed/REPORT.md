# Responsive layout and frontend loading improvements

Implemented for the existing Smart Resume AI application on 2026-11-25. Existing uncommitted work was preserved. No dependency installation, staging, commit, push, deployment, database change or backend/API change was made.

## What improved

- Dashboard and admin headers use two rows on narrow phones so the page title and actions remain readable. Dashboard search appears only when the desktop header has enough space.
- Shared screen styles allow grid/flex content to shrink, long card text to wrap, mobile inputs to remain readable, and navigation drawers to scroll within the dynamic viewport. Resume document/preview geometry and print styles are excluded.
- Career readiness cards use two columns on intermediate screens and four on wider desktops. HUD labels and status badges wrap instead of crowding each other.
- The builder preview toolbar, Career Data export actions, admin proctoring filters, and admin skills/assessment action groups wrap within their containers.
- The authenticated assistant is loaded in a separate bundle when eligible. After activation, its component instance stays mounted across client navigation so existing conversations and in-flight requests remain intact. A queued open event preserves clicks made while its bundle loads.
- Resume initialization uses the existing user session context before requesting private saved-resume data. Guest pages recover their local draft without making the two unauthorized saved-resume requests. Existing server payloads, saving/versioning logic and draft recovery remain.
- Route reveal effects scan newly inserted subtrees in a frame batch instead of repeatedly scanning the entire route. Existing reveals and reduced-motion handling remain functional.

## Measured loading change

Matched 375px captures recorded the encoded JavaScript resource payloads below:

| Page | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Landing | 299,841 bytes | 283,761 bytes | 16,080 bytes (5.36%) |
| Login | 268,032 bytes | 251,947 bytes | 16,085 bytes (6.00%) |

The new loading tests confirm that guest landing/login pages do not download the full authenticated assistant and produce no console errors. The delayed-chunk test confirms that an early assistant click is retained and the conversation survives navigation to the builder.

These are JavaScript payload observations from the matched browser captures, not measurements of Core Web Vitals, physical-device CPU/GPU performance or AI/provider latency. Cold-run resource timing varied; the comparison uses the matched warmed 375px captures. Backend/provider response times were not changed.

## Exact files changed

| File | Purpose |
| --- | --- |
| `src/app/layout.tsx` | Use the lazy assistant entry and place the existing UserProvider outside ResumeProvider so resume initialization can read the existing session. |
| `src/context/ResumeContext.tsx` | Gate private initialization requests on the known session; preserve server handling and local draft recovery. |
| `src/components/chat/AssistantEntry.tsx` (new) | Lazy loading, persistent activation and queued early-open events. |
| `src/components/chat/assistantVisibility.ts` (new) | Share the unchanged route exclusions between entry and conversation components. |
| `src/components/chat/CareerChatbot.tsx` | Use shared exclusions and notify the entry after its existing open-event listener is ready. Chat request/history logic remains. |
| `src/components/ui/ReferenceExperience.tsx` | Batch observation of newly inserted content and release revealed elements from tracking. |
| `src/app/reference-experience.css` | Screen-only shrinking/wrapping, mobile headers/inputs, drawer viewport limits and intermediate card grids. |
| `src/components/dashboard/UserDashboardHeader.tsx` | Responsive header/search classes and scrollable navigation drawer. |
| `src/components/admin/AdminHeader.tsx` | Responsive header and scrollable drawer classes. |
| `src/components/layout/Header.tsx` | Apply the shared drawer viewport/scrolling class. |
| `src/components/dashboard/CareerReadinessHUD.tsx` | Wrap status text and use wider breakpoints for four columns. |
| `src/components/dashboard/DashboardContent.tsx` | Let onboarding actions wrap. |
| `src/app/dashboard/my-data/page.tsx` | Stack header/export controls until a wider screen; reduce narrow-screen padding. |
| `src/app/builder/page.tsx` | Wrap preview mode controls without changing the resume document. |
| `src/app/admin/(protected)/proctoring/page.tsx` | Wrap filters and constrain the search input. |
| `src/app/admin/(protected)/skills/page.tsx` | Wrap and preserve space for header actions. |
| `src/app/admin/(protected)/assessments/page.tsx` | Wrap and preserve space for header actions. |
| `e2e/application-responsive.spec.ts` (new) | Public/member/admin route sweep, overflow assertions, screenshots and loading-cost observations. |
| `e2e/assistant-loading.spec.ts` (new) | Guest loading/console checks, delayed-download click handling and conversation retention. |
| `e2e/assistant-companion.spec.ts` | Wait for real placement readiness and idle settling before the coordinate-based touch tap. All original behavior assertions remain. |
| `AGENT_LOG.md` | Appended task results. |

Generated evidence lives under `scripts/visual-qa/responsive-speed/` and the existing ignored test-results directories. `before/` and `after/` contain per-route screenshots and measurements. `summary.json` records all final viewport/page comparisons. `dashboard-comparison.png` shows the narrow-header improvement.

## Verification results

| Command | Result |
| --- | --- |
| `node node_modules/typescript/bin/tsc --noEmit` | Final exit 0, no errors. Ran after each implementation batch. |
| `npm run lint` | Final exit 0, no errors/warnings reported. Ran after the implementation batches. |
| `npm run build` | Final exit 0; compilation, TypeScript, page generation and traces completed. Builds encountered the existing Next.js security reminder and succeeded on the indicated retries. |
| Baseline production sweep: `RESPONSIVE_AUDIT_PHASE=before PLAYWRIGHT_USE_PRODUCTION=1 node scripts/run-playwright.mjs e2e/application-responsive.spec.ts --project=mobile-375x812 --project=tablet-768x1024 --project=desktop-1440x900` | Exit 1, 8 passed / 1 failed / 0 skipped. The baseline exposed actual 1024px overflow. A failed-test recording also hit ENOSPC; later layout sweeps disable video/trace recording while preserving stills and measurements. |
| First production verification on application-responsive, assistant-loading, assistant-companion and responsive-navigation suites | Exit 1, 24 passed / 5 failed / 4 conditional skips. Exposed guest saved-resume 401s, tablet admin action overflow, and a coordinate tap before placement settled. These were addressed, not hidden by removing assertions. The admin measurement files also identified the matching assessment-header overflow. |
| Final production verification (command below) | Exit 0, **32 passed / 0 failed / 4 conditional skips**, 11.7 minutes. |
| Scoped `git diff --check` and initial source hash comparison | Exit 0; no unrelated source modifications or whitespace defects introduced. |

Final command:

```powershell
$env:PLAYWRIGHT_USE_PRODUCTION='1'
$env:RESPONSIVE_AUDIT_PHASE='after'
node scripts/run-playwright.mjs e2e/application-responsive.spec.ts e2e/assistant-loading.spec.ts e2e/assistant-companion.spec.ts e2e/responsive-navigation.spec.ts e2e/builder.spec.ts --project=mobile-375x812 --project=tablet-768x1024 --project=desktop-1440x900 --trace=off
```

The four skips are touch input on non-touch tablet/desktop projects and duplicate enlarged artwork galleries on mobile/tablet. Real touch dragging/tapping ran on mobile; the artwork gallery ran on desktop.

The layout sweep covered **40 pages × 5 viewport sizes = 200 page/viewport checks**, inspecting visible content at the top and bottom. Final measurements found no horizontal page overflow or uncontained visible content in those checked views. Sizes: 320×740, 375×812, 768×1024, 1024×768, 1440×900.

Page coverage: landing, login, register, FAQ, legal pages, ATS score; dashboard, builder, analyzer, improver, job match/discovery, interview preparation, skills, projects, guidance, onboarding; dashboard resumes, analyses, improvements, jobs, applications/history, skills/assessments, certificates, courses, profile and Career Data; admin dashboard, users, resumes, analyses, jobs/matches, skills, assessments, proctoring, feedback and settings.

Assistant checks verified real request-state transitions with isolated intercepted replies, minimizing during requests, accepted responses, error/copy feedback, request history/context retention, opening after drag, early open during loading, client navigation retention, keyboard operation, reduced motion and hidden-tab pausing. The authenticated builder opens with the final provider wiring.

## Preservation and limits

Hash comparison confirms the robot artwork/rig/motion, backend/service/API sources, database adapter, ATS engine, resume templates, `globals.css`/print work, package files and other unrelated source edits remain unchanged. UserContext authentication implementation is unchanged; provider order and resume request timing changed as described above. No user process was stopped and no Next lock or cache was deleted.

Tests used disposable SQLite sandboxes and intercepted assistant responses. Live AI/job providers, the full service/full browser suites, physical devices, actual mobile keyboards and measured Core Web Vitals/GPU profiling were not tested. The screen sweep covers the listed routes and current isolated data, not every possible modal/data combination or live examination session.

Next.js 16.4.3 still reports a pre-existing security advisory and recommends an upgrade. No dependency upgrade was performed. Review the changes and evidence before any later release; no deployment was started.
