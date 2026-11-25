# Smart Resume AI reference robot — implementation and verification

Status: implemented and verified. The current companion follows the blue robot in the supplied `codex-clipboard-828d628a-1f89-40cd-acb0-c9d362a882bd.png` reference. It replaces the previous explorer artwork in the existing assistant interface.

## Appearance and animation

The project-authored vector artwork recreates the reference's large cloud-shaped head, blue shades, navy terminal screen, cyan chevron/cursor, compact blue torso with its light terminal mark, blue arms and hands, and short legs/feet. The cloud lobes, screen, torso and limbs were refined against an offline side-by-side preview. This is a scalable vector recreation, not a claim of identical image pixels or the original OpenAI Codex Pet. No OpenAI CDN sprite, proprietary app extraction or external artwork download was used.

The existing articulated animation system is reused with robot-specific joint anchors. Idle breathing, blinking of the terminal symbols, head/gaze movement, hover gestures, coordinated walking, left/right turning and release settling are functional. Walking advances with pointer travel and stops when the pointer stops. Thinking, answer acknowledgement, confirmed-copy celebration and actual error reactions use the same genuine chat lifecycle signals. Terminal face lettering stays readable when the body faces left.

The companion remains the launcher for the existing CareerChatbot. Clicking opens that chat; minimizing returns to the robot, including during an in-flight request. Existing request payloads, authentication, history, cancellation/retry and assistant identity remain intact. No separate chatbot, provider, API, database schema or mock production data was introduced.

Animation updates remain capped at 24 FPS, or 30 while walking, and update SVG joints without rendering React on every frame. Reduced motion uses a static semantic pose. Hidden-document and offscreen visibility pause animation. The loop performs no page-layout scans; collision checks run separately in response to layout/viewport changes. No new dependency or heavy 3D runtime was added.

## Placement fixes

Browser verification found two real issues in the earlier companion integration. The first-visit greeting bubble did not follow a repositioned launcher and could intercept clicks. Clearance could also become stale after page entry animations or font/layout changes. The hook now observes the launcher's placement, and clearance updates on relevant layout changes, animation/transition completion and font loading.

A tablet reload check found a one-pixel drift caused by reading the launcher's scaled entry bounds. Saved placement now uses canonical unscaled coordinates; readiness checks compare unscaled CSS dimensions, including fractional mobile sizes. Dragging/click suppression, pointer capture, safe-area/viewport bounds and keyboard movement remain supported.

## Exact files changed in this task

| File | Change |
| --- | --- |
| src/components/assistant/CompanionArtwork.tsx | Reference-guided full-body cloud robot artwork, terminal symbols, arms/hands and short legs/feet. |
| src/components/assistant/companionRig.ts | New isolated robot joint anchors and palette. |
| src/components/assistant/AssistantCompanion.tsx | Robot joint centers, terminal blinking/gaze/activity presentation and readable face lettering during turns. |
| src/components/assistant/companionPlacement.ts | Canonical unscaled positioning and fractional layout dimensions to prevent reload drift. |
| src/components/assistant/ARTWORK.md | Updated artwork provenance and reference-specific design brief. |
| src/components/chat/CareerChatbot.tsx | Pass placement to the presentation hook and refresh control clearance after layout/transition changes. |
| src/components/chat/useAssistantPresentation.ts | Keep the greeting bubble attached to the current robot position. |
| e2e/assistant-companion.spec.ts | Reference-feature/proportion assertions and robot evidence capture paths. |
| e2e/assistant-mascot-chat.spec.ts | Correct earlier navigation setup, wait for settled layout, account for safe keyboard repositioning, and test running animations rather than completed animation records. |
| scripts/visual-qa/mascot/render-reference-robot.mjs | New offline artwork/pose/comparison renderer using installed React, TypeScript and sharp. |
| scripts/visual-qa/mascot/reference-robot/ | Six SVG/PNG pose previews, side-by-side comparison, actual browser screenshots/gallery and this report. |
| AGENT_LOG.md | Completion and verification record. |

No other application page, global theme, print/A4 styling, resume template, backend route, authentication service or database implementation changed. Existing Nimbus files and other uncommitted work remain present. No staging, commit, push or deployment occurred.

## Verification results

| Command/check | Final result |
| --- | --- |
| node node_modules/typescript/bin/tsc --noEmit | Exit 0, 0 errors. |
| npm run lint | Exit 0, no reported lint errors or warnings. |
| node scripts/test_companion_motion.mjs | Exit 0, 19 checks passed, 0 failed. |
| npm run build | Exit 0 after the existing Next.js security-reminder retry; compilation, TypeScript, page generation and traces completed. |
| PLAYWRIGHT_USE_PRODUCTION=1 node scripts/run-playwright.mjs e2e/assistant-companion.spec.ts e2e/assistant-mascot-chat.spec.ts --project=mobile-390x844 --project=tablet-768x1024 --project=desktop-1440x900 | Exit 0, 35 passed / 0 failed / 4 intentional skips in 3.6 minutes. |
| Scoped git diff --check | Exit 0. Git emitted the existing CRLF-conversion warning; no whitespace findings. |
| Offline artwork rendering/comparison | Exit 0; six poses and side-by-side preview created and visually inspected. Fontconfig emitted cache-write warnings during this tooling render; the output images were produced. |

The four conditional skips are touch input on tablet/desktop and duplicate enlarged-gallery capture on mobile/tablet. Real touch dragging/tapping ran on the mobile project, and the gallery ran on desktop. Actual viewport coverage was 390x844, 768x1024, 1366x768 and 1440x900; the legacy desktop suite also checks 1366x768.

Verified behavior includes body-joint/gait movement, direction changes, held-still gait stopping, release, click suppression, mouse/touch interaction, keyboard movement and reload persistence, panel opening/minimizing/dragging, pending requests while minimized, accepted answers, actual copy success and denied-copy non-success, error reactions, history/context payload retention, abort/retry, first-visit greeting/dismissal, blocked storage, modal suppression, reduced motion, controlled hidden-document pause/resume, and visible control clearance on dashboard, builder, jobs, analyzer and onboarding at the top and bottom.

No unexpected browser console errors remained in the passing checks. The suites intentionally simulate HTTP 502 failures to exercise error/retry handling and explicitly account for those browser resource messages.

Earlier runs are not counted as passes: the first production run had 27 passed / 8 failed / 4 skipped (6.3 minutes); after the placement/setup fixes, another had 34 passed / 1 failed / 4 skipped (3.7 minutes). The remaining tablet drift was fixed and the complete final suites rerun successfully. Build attempts stopped on the pre-existing Next security reminder were retried, not treated as successful builds. The first sandbox build also encountered child-process EPERM; successful builds/tests used authorized outside-sandbox execution.

## Evidence and limits

- reference-comparison.png: supplied reference beside the project robot.
- artwork-gallery.png: poses captured from actual assistant lifecycle events.
- idle/thinking/walking/answering/success/error SVG and PNG files: offline pose previews.
- mobile-390x844/, tablet-768x1024/, desktop-1440x900/: actual launcher screenshots.

Browser tests used the existing disposable local SQLite harness and intercepted AI responses. Live Gemini/provider calls, the full application/service suites, physical devices, native screen-reader operation and measured GPU/device profiling were not run. Automated keyboard, responsive viewport, reduced-motion and visibility checks passed.

Next.js 16.4.3 reported a pre-existing security vulnerability and recommended an upgrade. No upgrade or dependency change was made as part of this task.

Final protected hashes match the starting baseline:

- ATS engine: F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251
- Existing database adapter work: D0554CC4FCBFDA2B562787F4506D7D804E30FD37670B36EBE4B890FA86E2775A
- globals.css/print/A4 work: BA837D0785C528C3DA397F50B9D7C2FA1D6889754453E36823BE9B9EC4DA64E1

Ports 3000/3100 were free and no Next dev lock remained after the runner completed. No unrelated process was stopped and no lock was deleted.
