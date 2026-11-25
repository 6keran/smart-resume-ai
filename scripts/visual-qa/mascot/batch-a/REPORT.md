# MASCOT-1 — Batch A

Status: **Batch A complete and verified for review.** The user stopped the existing dev server; the current TypeScript, ESLint and focused browser checks pass. Batch B has not started.

## Changes

| File | Change |
| --- | --- |
| [NimbusMascot.tsx](D:/projects/builder-github/src/components/assistant/NimbusMascot.tsx) (new) | Original inline cloud-robot SVG, eight states, numeric size and decorative/className props, visibility gating, one-shot idle blink, RAF-throttled mouse eye-follow bounded within 3px. |
| [NimbusMascot.module.css](D:/projects/builder-github/src/components/assistant/NimbusMascot.module.css) (new) | Scoped blue/screen colors, flat shapes, CSS transform/opacity motion, static variants and reduced-motion overrides. Direct animation declarations preserve CSS Modules keyframe scoping. |
| [globals.css](D:/projects/builder-github/src/app/globals.css) | Added only --mascot-shade: #005bb5 and --mascot-ink: #8fc4ff. The rest of the file, including A4/print CSS, matches the starting snapshot after newline normalization. |
| [StyleGuideClient.tsx](D:/projects/builder-github/src/app/dev/style-guide/StyleGuideClient.tsx) | One selectable animated preview, replay/pause/size controls and static gallery of all eight states at 24, 32, 56, 64 and 96px. Preview becomes static while the existing modal/drawer is open. |
| [run-playwright.mjs](D:/projects/builder-github/scripts/run-playwright.mjs) | Approved one-line correction moves disposable databases/auth state from test-results/db to data/test_sandboxes. Existing per-run safe cleanup retained. |
| [assistant-mascot.spec.ts](D:/projects/builder-github/e2e/assistant-mascot.spec.ts) (new) | Batch A artwork/color/size, real loop count, static/reduced-motion, visibility-event, pointer and layout checks; screenshot evidence. Pause/resume now explicitly stops and restarts a running idle loop. Chat integration coverage remains for later batches. |
| [REPORT.md](D:/projects/builder-github/scripts/visual-qa/mascot/batch-a/REPORT.md) (new) | This report. |
| [AGENT_LOG.md](D:/projects/builder-github/AGENT_LOG.md) | Appended implementation, blocked preflight and successful verification checkpoints. |

The assistant identity stays AI Assistant. CareerChatbot, onboarding, My Data and landing were not edited in this batch. No runtime animation-library import or dependency changes.

Raw UTF-8 source size: component 2,628 bytes + CSS module 1,467 bytes = **4,095 bytes**, under 4 KiB. Width and height attributes reserve space; preview width/height stayed constant during the executed state-cycle checks.

## Verification results

| Command/check | Exit | Results |
| --- | --- | --- |
| node node_modules/typescript/bin/tsc --noEmit | 0 | Current revision: no errors. Earlier listener-overload and test delete-operator errors were corrected. Test counts not applicable. |
| npm run lint | 0 | Current revision: no reported errors/warnings. Test counts not applicable. |
| node scripts/run-playwright.mjs e2e/assistant-mascot.spec.ts --project=desktop-1440x900 --project=mobile-390x844 — first executed run | 1 | 8 passed / 2 failed / 0 skipped. Body-animation custom-property values were not resolving to locally scoped keyframes. Corrected with direct declarations. |
| Same focused suite — second executed run | 1 | 9 passed / 1 failed / 0 skipped. Real motion/one-loop, pause, pointer and stable-size checks passed at both sizes. Mobile reduced-motion test reported a hydration warning caused by screenshot caret-color DOM instrumentation before hydration. |
| Capture-harness correction | Verified | Waits for the mascot effect/observer to be active and uses caret: initial. Console-error assertions remain intact and passed. Artwork captures temporarily hide fixed app chrome so it cannot obscure the isolated samples. |
| Approved resume: first focused-suite startup | 1 | 0 passed / 0 failed / 0 skipped / 0 executed. Next's recurring security reminder stopped the web server before tests started. |
| Approved resume: same focused command, permitted retry | 0 | **10 passed / 0 failed / 0 skipped**, 1.4 minutes. Actual viewports are 390x844 and 1366x768; the desktop project name contains 1440 but this Batch A spec explicitly sets 1366. |
| Other startup attempts | 1 | One spawn EPERM interruption and an earlier security-reminder interruption; neither executed tests. Local process permissions were approved automatically for subsequent runs. |
| git diff --check (repository settings) | 0 | No whitespace findings. An additional read-only check with core.autocrlf=false returned 1 because it treated existing CRLF endings as trailing whitespace; that temporary per-command setting was not persisted and no files were converted. |

The final executed checks confirmed the requested SVG colors while the page accent stayed #2211ff, 40 static SVG samples without animations, one continuous mascot loop, live pause/resume controls, offscreen/document-visibility pausing, reduced-motion static poses, fine-pointer limits and constant preview dimensions. Console-error assertions pass, including the previously affected reduced-motion capture. Page Visibility wiring was exercised with a controlled document.hidden override and visibilitychange event; native tab switching/minimization has not been manually tested.

No production build, public E2E, grounding/Gemini/service/template suites or full application journeys were run in Batch A; these remain for the approved later verification stage. The 768/1440 layouts, integrated placements and native assistive-technology checks remain pending. No deployment.

## Evidence

106 PNGs were regenerated by the successful final run:

- states/{state}-{size}.png: 40 labeled state/size samples, including 64px extras.
- 390x844/all-states-and-sizes.png and 1366x768/all-states-and-sizes.png.
- {viewport}/motion/{state}-{0,1,2}.png: 48 frames recorded with animations allowed.
- {viewport}/reduced-motion/{state}.png: 16 static reduced-motion captures.

Desktop and mobile galleries were visually inspected after regeneration and no longer contain fixed-header overlap. Success motion frames were also inspected to confirm movement and the check reveal. The capture harness hides app chrome only for these isolated artwork screenshots. These are local QA artifacts, not production bitmap assets.

Review: [desktop state gallery](D:/projects/builder-github/scripts/visual-qa/mascot/batch-a/1366x768/all-states-and-sizes.png) · [mobile state gallery](D:/projects/builder-github/scripts/visual-qa/mascot/batch-a/390x844/all-states-and-sizes.png).

## Preservation and stop

- ATS SHA256 remains F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251.
- Pre-existing src/server/db/index.ts changes remain at their starting hash D0554CC4FCBFDA2B562787F4506D7D804E30FD37670B36EBE4B890FA86E2775A.
- API/services/template/A4 document diffs contain no new Batch A changes. A4/print CSS matches the starting snapshot. Existing uncommitted work was preserved.
- No staging, commits, pushes, deployments, dependency changes, remote database operations, process killing or lock deletion.
- Final read-only check found ports 3000/3100 free and both inspected dev locks absent.

Next.js reports: **Your version of Next.js is affected by a known security vulnerability. We strongly recommend you upgrade Next.js.** No upgrade was started.

An earlier verification checkpoint stopped under MASTER_PROMPT.md rule 10 after the startup reminder repeated. The user subsequently approved resuming verification. The current resumed run passed after its permitted startup retry, so Batch A is now complete for review.

## Previous blocked resume preflight

No application/test code changed and no TypeScript, ESLint, browser tests, builds or screenshot captures ran during that blocked turn. Only this report and AGENT_LOG.md were updated.

- The local preflight command returned exit 2 because .next/dev/lock exists.
- The lock is 107 bytes, last written 2026-11-24 07:46:45 UTC (13:16:45 IST). Reading it failed because another process is using it, confirming an active file lock rather than mere leftover-file presence.
- Sandbox CIM process inspection was unavailable. Approved read-only inspection outside the sandbox succeeded (exit 0) and found PID 31220, parent 31524, running the project's Next CLI with dev -H localhost -p 3000; child PID 15304 runs the project's start-server.js.
- Neither process was started in this resumed turn. No process was stopped and the lock was left untouched.

MASTER_PROMPT.md rules 11–13 prohibit deleting the lock, stopping another session's process, or running verification while the user's dev server is running. The user then confirmed it was stopped. Read-only preflight confirmed both old PIDs were gone and both dev locks absent before the successful verification run. No manual process kill or lock deletion occurred.

## Next step

Stop for Batch A review. After explicit approval, start Batch B: chat launcher/header/message avatars, thinking/welcome placements and the first-visit bubble, preserving existing chat behavior. Do not begin Batch B or a dependency upgrade automatically.
