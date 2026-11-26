# Larger pixel-style AI companion

Implemented on 2026-11-25 for the existing Smart Resume AI assistant. The robot's project artwork, proportions, articulated rig and request-driven motion tracks remain unchanged. No original OpenAI asset, new chatbot, backend change or dependency was introduced.

## Appearance and size

The visible character now uses a live low-resolution canvas with nearest-neighbor enlargement, stepped blue/cyan colors and hard alpha edges. Each canvas frame comes from the existing robot's current animated SVG pose. This preserves walking, gaze, arm/leg movement and real thinking/reply/error/success reactions while giving the character a crisp pixel finish.

The floating launcher is now **120×156px on desktop/tablet** (previously 80×104px) and **100×130px on phones** (previously 72×93.6px). Small chat avatars retain their original layout sizes and receive the same pixel treatment.

The renderer keeps only one image decode active, replaces queued work with the latest pose, revokes temporary object URLs, and retains reduced-motion/visibility pausing. The unchanged rig still updates at up to 24 FPS, or 30 while walking. Performance on physical devices has not been profiled.

## Placement

Saved positions and panel alignment now use the actual responsive launcher dimensions. Clearance searches include exact control edges so larger rectangles can fit gaps missed by the former coarse grid. Phone pages reserve bottom space while the assistant is available so the larger companion can remain clear of final form actions; the space persists while opening/minimizing the chat. These rules are screen-only and do not affect print output.

## Files changed

| File | Change |
| --- | --- |
| `src/components/assistant/AssistantCompanion.tsx` | Rasterize the live rig into the pixel canvas, manage resize/decode/cleanup and retain the original semantic SVG. |
| `src/components/assistant/companionPixels.ts` (new) | Responsive logical pixel grid and stepped-color/hard-edge processing. |
| `src/components/assistant/AssistantCompanion.module.css` | Pixel canvas scaling and layout wrapper. |
| `src/components/chat/CareerChatbot.tsx` | Larger dimensions, responsive position restoration/panel alignment and persistent clearance marker. Chat requests and conversations remain unchanged. |
| `src/components/chat/CareerChatbot.module.css` | Larger launcher footprint and phone end-of-content clearance. |
| `src/components/assistant/companionPlacement.ts` | Search exact obstacle edges in addition to grid candidates. |
| `src/components/assistant/ARTWORK.md` | Document the pixel presentation and retained original rig. |
| `scripts/test_companion_pixels.mjs` (new) | Verify grid dimensions, stepped colors and hard alpha edges. |
| `e2e/assistant-pixels.spec.ts` (new) | Verify actual painted pixels, larger dimensions, changing frames, opening/minimizing and reduced-motion freezing. |
| `e2e/assistant-companion.spec.ts` | Wait for painted frames and capture actual pixel output in the pose gallery; save new evidence separately. |
| `e2e/assistant-mascot-chat.spec.ts` | Update the launcher size expectation for the requested larger dimensions. |
| `AGENT_LOG.md` | Append results. |

## Verification

| Command/check | Result |
| --- | --- |
| `node scripts/test_companion_pixels.mjs` | Exit 0; 7 checks passed, 0 failed. |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0; no errors. |
| `npm run lint` | Exit 0; no reported errors/warnings. |
| `npm run build` | Final exit 0, after the existing Next.js security-reminder retry. Compilation, TypeScript and page generation completed. |
| Production browser command below | Final exit 0; **38 passed / 0 failed / 4 conditional skips** in 3.8 minutes. |
| Scoped diff/starting hash comparison | Exit 0; no unrelated source changes introduced. |

```powershell
$env:PLAYWRIGHT_USE_PRODUCTION='1'
node scripts/run-playwright.mjs e2e/assistant-pixels.spec.ts e2e/assistant-companion.spec.ts e2e/assistant-mascot-chat.spec.ts --project=mobile-375x812 --project=tablet-768x1024 --project=desktop-1440x900 --trace=off
```

The first browser run had 35 passes, 3 failures and 4 skips. It exposed an actual dense-onboarding clearance issue and a test reading width before the entry animation finished; these were fixed. A storage-denial test also timed out during a long execution interval and passed unchanged in the final run. Assertions were retained. The four skips are touch cases on non-touch tablet/desktop projects and duplicate pose galleries on mobile/tablet.

Checks covered actual canvas output with smoothing disabled, valid stepped colors/opaque edges, changing pixel frames, mouse/touch dragging, direction/settling, keyboard and saved placement, opening/minimizing, real request lifecycle transitions using isolated responses, reply/history/context retention, copy/error/abort/retry, reduced motion and hidden-tab behavior. Larger-launcher clearance passed on dashboard, builder, jobs, analyzer and onboarding at phone/tablet/desktop widths; the legacy desktop suite also checks 1366px.

The canvas snapshots and gallery were visually inspected. `preview.png` is a clean crop of the captured gallery. `artwork-gallery.png` shows actual pixel poses from the assistant lifecycle. Per-viewport files contain launcher and character screenshots. The underlying SVG is retained for the existing animation/semantic interface; the visible output is the canvas.

## Preservation and limits

Hash checks confirm `CompanionArtwork.tsx`, `companionRig.ts`, `companionMotion.ts`, `companionLocomotion.ts`, authentication/context/backend/API sources, database work, global/print styles, package files and other unrelated source work remain unchanged. Existing uncommitted changes were preserved. No staging, commit, push or deployment occurred.

Browser tests use disposable SQLite data and intercepted assistant responses. Live providers, physical devices/GPU profiling and the full application/service suites were not run for this visual change. No exact original Codex-asset or frame-match claim is made.

Next.js 16.4.3 still reports its pre-existing security advisory and recommends an upgrade; no upgrade was performed.
