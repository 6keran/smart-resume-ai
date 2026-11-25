# Landing Batch 3 — Step 3b report

Completed on 2026-11-23. Only the approved Batch 3 work was implemented.

## Result

The anonymous landing route now calls a server-only React `cache()` helper on
the approved synthetic resume pair. React caches the helper within a server
render; this is not persistent, cross-request caching. One serializable object
feeds the hero timeline and Section 02. Only the overall and four component
scores cross the server/client boundary; engine-detected keyword and section
lists do not. Both surfaces render explanatory text with no scores or bars when
either example fails.

| Engine output | Before | After |
| --- | ---: | ---: |
| Overall | 79 | 82 |
| Keywords | 60 | 60 |
| Formatting | 95 | 95 |
| Content | 75 | 90 |
| Sections | 100 | 100 |

The texts match
`D:/projects/builder-github/scripts/visual-qa/landing/batch-3/STEP_3A.md`
exactly. No facts, dates, metrics, employers, or skills were added in Step 3b.
The four landing weights are 0.35 keywords, 0.25 content, 0.25 formatting, and
0.15 sections. The unit test checks the requested rounded formula for both
outputs and checks the frozen reviewed outputs independently.

The hero has Before/After tabs, Arrow/Home/End navigation, manual pause/play,
and automatic comparison every 5.2 seconds. Selecting a tab pauses playback.
Reduced motion disables autoplay and uses the existing reduced-motion-aware
tab/scroll primitives. The drawer has one close button, an opaque layer,
100dvh height, scrollable navigation, dialog semantics, initial close-button
focus, a Tab/Shift+Tab focus trap, Escape dismissal, and opener focus restoration.
The new demo copy is at least 12px; its version controls meet the 44px target.

## Files changed in Step 3b

| File | Change |
| --- | --- |
| `D:/projects/builder-github/src/components/landing/landingExampleData.ts` | Approved texts, serializable types, landing weights, and upload labels; removed static score exports. |
| `D:/projects/builder-github/src/lib/landingPageData.server.ts` | New server-only memoized adapter; real engine scores, safe failure state, and source-derived product facts. |
| `D:/projects/builder-github/src/app/page.tsx` | Loads the landing data only for anonymous visitors. |
| `D:/projects/builder-github/src/components/landing/ProfessionalLandingPage.tsx` | Shares the object with both score surfaces; derives the template count in the existing FAQ. |
| `D:/projects/builder-github/src/components/landing/sections/Hero.tsx` | Real-score Before/After timeline and accessible playback/tab controls. |
| `D:/projects/builder-github/src/components/landing/sections/ScoredByRules.tsx` | Approved raw texts and real scores; removed detected-section/keyword displays and static scores. |
| `D:/projects/builder-github/src/components/landing/sections/Header.tsx` | Drawer close-control, opacity, focus, Escape, and modal behavior fixes. |
| `D:/projects/builder-github/src/components/landing/sections/Numbers.tsx` | Product metrics from passed source counts; upload labels instead of an upload count. |
| `D:/projects/builder-github/src/components/landing/sections/HowItWorks.tsx` | Reuses landing upload labels and the keyword weight. |
| `D:/projects/builder-github/src/components/landing/ProfessionalLandingPage.module.css` | Timeline, score, failure, drawer, and minimum new-demo type/touch sizing. |
| `D:/projects/builder-github/e2e/landing.spec.ts` | Real-score and keyboard assertions, absence of detected lists, and dialog-scoped close locator. |
| `D:/projects/builder-github/e2e/responsive-navigation.spec.ts` | Unique close button, initial focus, focus wrapping, Escape, focus restoration, and navigation. |
| `D:/projects/builder-github/e2e/landing-batch-3-visual.spec.ts` | New visual harness, full-page captures, motion frames, reduced-motion evidence, and drawer-height/overflow checks. |
| `D:/projects/builder-github/scripts/test_landing_ats_example.mjs` | New 31-check fixture/formula/helper/failure regression using the installed Next compiler. |
| `D:/projects/builder-github/scripts/visual-qa/design-system/INDEX.md` | Added the Batch 3 landing row with before/after paths. |
| `D:/projects/builder-github/AGENT_LOG.md` | Appended the complete Batch 3 entry. |
| `D:/projects/builder-github/scripts/visual-qa/landing/batch-3/REPORT.md` | This report. |

The 30 PNGs under the Batch 3 QA folder are generated local artifacts, not
committed screenshots. Existing unrelated working-tree changes were preserved.

## Facts and exact upload support

| Section 03 value | Source |
| --- | --- |
| 17 listed templates | `RESUME_TEMPLATES.length` in `D:/projects/builder-github/src/lib/templates.ts`, computed in the server helper. |
| 4 score parts | `LANDING_SCORE_WEIGHTS.length` in the landing data file, checked against the real formula. |
| 9 curated role roadmaps | `ROLE_PROFILES.length` in `D:/projects/builder-github/src/lib/career/roleProfiles.ts`, computed in the server helper. |
| PDF · DOCX · TXT | Landing labels checked against the upload UI and extractor. The numeric upload count is omitted because there is no shared accepted-format constant with the extractor. |

The `03` section label is an ordinal, not a product metric. No template number
is typed into the FAQ. Section 05 has not been implemented, so there is no
"Twelve layouts" heading; its future heading must omit a number word.

Exact UI support:

- ATS input: `.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain`
  at `D:/projects/builder-github/src/app/ats-score/page.tsx:296`.
- Analyzer input: `.pdf,.docx,.txt` at
  `D:/projects/builder-github/src/app/analyzer/page.tsx:607`.
- Builder input: `.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  at `D:/projects/builder-github/src/app/builder/page.tsx:5258`.
- `extractResumeText` supports PDF, DOCX, and TXT/plain text through signature,
  extension, or MIME checks at
  `D:/projects/builder-github/src/server/services/extractResumeText.ts:670`.
  It explicitly rejects legacy DOC and image formats. Pasted text is a separate
  input mode. The upload pages and extractor were not modified.

## Verification

The comparison baseline is the completed Batch 2 verification entry at
2026-11-23T15:59:24+05:30, including its valid 52/52 public run. It is distinct
from the older 48/52 stale-locator baseline. Before results below are retained
baseline evidence, not commands re-run on an earlier checkout.

| Check | Before | Final after |
| --- | --- | --- |
| `npx tsc --noEmit` | Exit 0, 0 errors | Exit 0, 0 errors |
| `npm run lint` | Exit 0, 0 errors | Exit 0, 0 errors, 0 warnings |
| `npm run build` | Exit 0, 90/90 pages generated | Exit 0, 90/90 pages generated |
| `npm run test:e2e:public` | Exit 0, 52 passed / 0 failed / 0 skipped | Exit 0, 52 passed / 0 failed / 0 skipped, 1.0m |
| New landing unit test | Did not exist | Exit 0, 31/31 checks passed |
| New visual spec | Did not exist | Exit 0, 5 passed / 0 failed / 3 deliberately inapplicable viewport cases skipped, 32.7s |
| `test:templates` | Earlier retained result: 63/63 | Not run in this Batch 3 checkpoint; not claimed passed |
| ATS SHA256 | `F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251` | Identical |

The public suite ran exactly these six files: landing, public-routes,
ats-analyzer, jobs, theme, and responsive-navigation, across the four configured
Chromium viewports. An earlier focused landing/navigation run passed 8/8.
The new visual spec has two tests per project; drawer evidence is inapplicable
on desktop, while score-surface captures are intentionally limited to 390 and
1366 widths, producing three explicit skips. Skips are not passes.

The unit test covers exact approved text parity, reviewed score outputs, the
weighted formula, shared-helper output, serialization, absence of detected
lists, derived counts, injected failure in the second example, and both
rendered fallback surfaces containing no scores or progress bars.

Intermediate failures were not hidden: the first native-TypeScript unit runner
failed before checks because existing type imports were treated as runtime
exports; using the bundled compiler fixed the runner without engine edits.
One wiring type-check failed on union narrowing and passed after a single
local correction. Early reduced-motion visual output exposed a hero hydration
mismatch; the landing-local subscription now uses the same stable server
snapshot pattern as the existing motion primitives. Its subsequent runs were
clean. Some early command results were interrupted during user/model handoffs;
final results above come from completed commands with their output read.

The final public gate's first attempt ended with 3 passed / 49 failed / 0 skipped
because the Next security reminder stopped its own test server. The unchanged
retry passed 52/52. The final visual gate's first attempt had 1 passed / 4 failed /
3 skipped for the same connection-refused interruption; its unchanged retry
passed all five applicable cases. The final build after the type/touch correction
passed on its first invocation; earlier build attempts generated 90/90 pages
but exited for the security reminder before a successful unchanged retry.

Exact core interruption text shown by the first build/E2E server runs:

```text
Your version of Next.js is affected by a known security vulnerability.

**We strongly recommend you upgrade Next.js.**

This command stopped to show the upgrade recommendation. Retry the same command to continue the original task.
```

No dependency upgrade, background task, worktree, Git mutation, process kill,
or lock deletion was performed. Test processes use the existing runner's
disposable SQLite database; no remote database test or migration was run.

## Protected paths

The final diff is empty for templates, A4ResumeDocument.tsx, API routes,
services, package.json, and package-lock.json. The whole working tree is not
clean: the earlier account-deletion edit to `src/server/db/index.ts` remains,
as do earlier base/landing changes. Batch 3 introduced no protected-path edits.
Both the database file and the complete global CSS file match the recorded
Step 3b start hashes, including all print/A4 CSS:

| File | SHA256 at start and end |
| --- | --- |
| `D:/projects/builder-github/src/server/db/index.ts` | `D0554CC4FCBFDA2B562787F4506D7D804E30FD37670B36EBE4B890FA86E2775A` |
| `D:/projects/builder-github/src/app/globals.css` | `8898DF816BE058E97F0C96F61B6649AE146F838D59A8753897E3870FE1FF49B8` |

Ports 3000/3100 were checked free and build/dev locks absent before server
commands. They were free with all four checked locks absent after final QA.

## Read-only commit audit

Commit `ee20a245f76c2154ac8f8228416a4d5d72d6307e`, dated
2026-11-19T11:20:32+05:30, tracks `.env.example`, but no real `.env` filename,
`data/*.db` file, backup folder, or `.bak` file in the inspected patterns.
Its parent tracks
`data/test_sandboxes/career_command_center_1794671182199_4k7w3.db`; the commit
deletes that file. The current `git ls-files` match is only `.env.example`.
Names/history were inspected only; env and database contents were not opened.

## Screenshot evidence

Base folder: `D:/projects/builder-github/scripts/visual-qa/landing/batch-3/`.

| Capture | Path under that folder |
| --- | --- |
| Desktop full page | `1366x768/full-page.png` |
| Mobile full page | `390x844/full-page.png` |
| Hero comparison, three frames plus reduced motion | `{1366x768,390x844}/motion/hero-real-score-timeline/{frame-1,frame-2,frame-3,reduced-motion}.png` |
| Section 02 transition, three frames plus reduced motion | `{1366x768,390x844}/motion/section-02-real-score-result/{frame-1,frame-2,frame-3,reduced-motion}.png` |
| Drawer, three frames plus reduced motion | `{375x812,390x844,768x1024}/motion/mobile-drawer/{frame-1,frame-2,frame-3,reduced-motion}.png` |

There are 30 PNGs: 2 full pages, 16 score-surface images, and 12 drawer images.
The before screenshots referenced by INDEX.md are the genuine earlier Batch 2
captures; they were not recreated after Step 3b edits.

The capture-only harness sets the sticky header to relative positioning for
stitching, scrolls slowly to reveal the full page, and hides the Next dev portal.
It also uses viewport screenshots for the fixed drawer. A normal, unmodified
header/hero geometry assertion runs before the harness style is injected.
The misplaced sticky header was a capture artifact. The duplicate close and
drawer/underlying-page overlap were real defects, fixed in this batch.

## Remaining work, limits, and next step

- `/`: header/drawer, hero, Sections 01–03 and the approved real-score comparison
  are done. Requested Sections 04–09, the replacement final CTA, and replacement
  footer remain unimplemented; their legacy equivalents are still present.
- The full formal contrast/type audit and assistive-technology testing are not
  verified. Earlier compact labels outside the new demo remain in the existing
  styling. The synthetic resume preview scrolls internally to keep a stable
  layout.
- The existing motion system was preserved; exact animation timing is not a
  formal performance benchmark. Captures sample three frames and reduced motion.
- No Firefox/WebKit, live AI, production deployment, remote PostgreSQL/Neon,
  full `npm test`, service/security suites, or template/PDF suite was run in this
  checkpoint. Failure UI was tested in-process, not by adding a production
  failure trigger.
- Next.js 16.4.3 still reports a known security vulnerability and recommends an
  upgrade. It remains a release risk; no upgrade was authorized or performed.
- Landing-side weights deliberately duplicate the frozen engine weights. The
  formula/output tests and hash gate guard against drift; they must remain in
  the review workflow when the engine changes in a future approved task.

Next step: review this Batch 3 result and the screenshot paths. Stop here.
After explicit approval of the next batch, plan Sections 04–06 using
`Capabilities.tsx`, `TemplatesGallery.tsx`, and `ThreeWays.tsx`; keep the gallery
heading free of a template number. Those files were not created in this batch.
