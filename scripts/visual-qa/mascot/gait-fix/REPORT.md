# Robot movement fixes — 2026-11-25

Implemented the confirmed locomotion defects in the existing AI Assistant companion. The original project artwork and joint anchors are unchanged. No new chatbot, animation dependency, backend change, authentication change, history change, Git staging/commit/push or deployment was introduced.

## Reference inspection and comparison

The attached `C:/Users/kiran/OneDrive/Videos/Screen Recordings/Screen Recording 2026-11-25 070852.mp4` was successfully decoded locally using the existing OneDrive FFmpeg libraries and the previously prepared Python decoder. No download, installation, upload or approval-service restoration was needed for decoding.

Metadata: 688 × 576, 30 FPS, 17.3 seconds, all 519 frames decoded. Inspected the full-video overview, 130 enlarged samples across the entire clip, and consecutive 30 FPS movement/stop/turn sequences. Evidence remains in `../gait-reference/`: `native-metadata.json`, `native-overview-0.png`, `robot-detail-0.png` through `robot-detail-3.png`, and `30fps-drag.png`, `30fps-stop.png`, `30fps-turn.png`.

Observed reference behavior: the large head stays upright; the short feet alternate contact/lift poses; arms move with the steps; body displacement is restrained; a stationary interval becomes a quiet resting pose. The video uses visibly held raster poses and abrupt terminal mirroring during reversals. The implementation retains the existing vector artwork and uses continuous joint animation, with direction expressed by head/gaze movement and directional limb articulation.

Compared actual browser-captured poses with the decoded frames. `reference-pose-comparison.png` shows the comparison, and `mobile-375x812/continuous-walking-contact.png` shows consecutive actual browser poses. `mobile-375x812/captured-walking.gif` replays those captured SVG frames with their measured timing. The `.webm` files here are actual browser recordings of the verification gestures. Tiny recordings for skipped non-touch projects contain no touch verification; use the mobile touch recordings.

This is a reference-informed correction, not an exact sprite or timing recreation. Exact reference cadence, cursor latency and a frame-identical turn are not claimed. The reference's apparent outstretched-arm reactions are not triggered indiscriminately; existing gestures remain connected to hover and genuine assistant events.

## Exact source changes

| File | Change |
| --- | --- |
| `src/components/chat/CareerChatbot.tsx` | Pointer events set a clamped target. A frame-based follower tracks the actual displayed position, feeds locomotion with its displacement, persists the displayed release position and preserves capture/cancel/click suppression. Following stops once position and velocity settle. |
| `src/components/assistant/companionLocomotion.ts` (new) | Frame-rate-independent 55 ms exponential following; smoothed actual velocity; 12 px reversal threshold with horizontal speed/dominance checks; speed-driven phase capped at 1.75 full cycles/second; no phase advancement at a stationary edge. |
| `src/components/assistant/companionMotion.ts` | Shared walking phase, opposite legs, 60% planted stance/40% lifted swing, inverse kinematics using the existing 11+6 unit leg anchors, level stance soles, counter-swinging arms and restrained body/head motion. Other assistant animation tracks remain. |
| `src/components/assistant/AssistantCompanion.tsx` | Removed complete-character signed scaling and terminal counter-mirroring. Bounded head/gaze facing and joint blending handle reversals. Walking/settling use real movement speed/recency. Existing reduced-motion, visibility and real assistant-state handling remain. |
| `scripts/test_companion_motion.mjs` | Updated the old distance-phase test for normalized phase and added physical contact, alternating limbs, jitter/reversal thresholds, cadence cap, edge stopping and frame-rate checks. |
| `e2e/assistant-companion-motion.spec.ts` (new) | Repeated eight-direction mouse drags, clear reversals, near-vertical jitter, edge holding, release/click behavior, real touch reversal/cancel/tap, continuous transform/proportion recording and browser videos. |
| `AGENT_LOG.md` | Appended task results. |

Generated evidence is isolated under `scripts/visual-qa/mascot/gait-reference/`, this `gait-fix/` directory and the existing ignored test-results directories. The prepared decoder itself did not change. Existing unrelated source edits remain intact.

## Verification results

| Command/check | Result |
| --- | --- |
| Bundled Python `scripts/visual-qa/mascot/decode-motion-reference.py` with 0.125 and 0.0333333333 sample intervals | Both exit 0; complete reference decoded, 519 frames. |
| `node scripts/test_companion_motion.mjs` | Final exit 0; 26 checks passed, 0 failed. Initial legacy distance-based assertion failed before being updated for the new phase contract. |
| `node node_modules/typescript/bin/tsc --noEmit` | Final exit 0; 0 errors. |
| `npm run lint` | Exit 0; no reported errors or warnings. |
| `npm run build` | Final exit 0. First invocation compiled/generated pages but exited 1 for the existing Next.js security reminder; the prescribed retry succeeded. |
| Development: `node scripts/run-playwright.mjs e2e/assistant-companion-motion.spec.ts e2e/assistant-companion.spec.ts e2e/assistant-mascot-chat.spec.ts` | After the existing startup reminder retry: exit 1, 52 passed / 1 failed / 7 skipped. The new test incorrectly required a left turn on a tablet gesture with only 24 px horizontal travel over 436 px vertical travel. Corrected the test to begin with an intentional horizontal movement; preserved the jitter behavior/assertion. |
| Production: `PLAYWRIGHT_USE_PRODUCTION=1 node scripts/run-playwright.mjs e2e/assistant-companion-motion.spec.ts e2e/assistant-companion.spec.ts e2e/assistant-mascot-chat.spec.ts` | Two sandbox launches exited 1 with spawn EPERM before tests; authorized execution with the needed process permission ran the suites. Exit 1, 52 passed / 1 failed / 7 skipped. All motion tests passed. One 375 px clearance check timed out during a long execution interruption with `ERR_NETWORK_CHANGED`; diagnostics saved here. |
| Production focused retry: `PLAYWRIGHT_USE_PRODUCTION=1 node scripts/run-playwright.mjs e2e/assistant-mascot-chat.spec.ts --project=mobile-375x812 --grep 'launcher is clear of visible controls'` | Exit 0; 1 passed / 0 failed / 0 skipped. No application or test change was made for this retry. |
| Source hash comparison and scoped `git diff --check` | Exit 0; no unrelated source edits or whitespace defects introduced. |

Final results across these browser cases: all 53 runnable cases passed, with 7 conditional skips. The full production command itself had the documented network-interrupted failure; its focused retry passed. Skips are duplicate enlarged galleries and touch cases on projects without touch input.

Viewport coverage: 375×812, 390×844, 768×1024, 1440×900; the existing legacy desktop suite also checks 1366×768. Verified chat opening/minimizing, pending requests while minimized, reply/error/success/copy feedback, denied-copy behavior, history/context request payloads, abort/retry, keyboard/placement persistence, reduced motion, hidden-tab freezing, and clearance on dashboard, builder, jobs, analyzer and onboarding.

Continuous transform recordings contain 261/310/294/359 samples on the four projects. Every complete-character transform had determinant 1, width variation 0, and maximum body tilt 1.2 degrees. These recordings verify the removal of the scale-through-zero/flip defect.

Protected hashes match the initial baseline: `CompanionArtwork.tsx`, `companionRig.ts`, `useAssistantPresentation.ts`, database adapter, deterministic ATS engine and `globals.css`. The initial source manifest also confirms other existing source files were preserved.

## Limits and remaining risks

AI replies were intercepted only in the isolated browser tests; live Gemini/provider calls and the full application/service suites were not run. Tests use disposable SQLite sandboxes. Physical devices, native screen-reader operation and measured GPU profiling were not performed. No exact video-match claim is made.

Next.js 16.4.3 reports a pre-existing security vulnerability and recommends an upgrade. No dependency upgrade was performed within this motion-only task.
