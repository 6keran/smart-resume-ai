# Compact companion hover / pinned placement

Status: implemented; production build and browser verification await the user's development server stopping. No claim of completed browser verification or exact video match.

Changes:

- `src/components/chat/CareerChatbot.tsx`: 88px desktop/tablet and 72px phone sizing; one clear placement per page; removes recurring scroll/content/animation placement scans; navigation/reload resets only the companion; preserves panel placement, chat instance, messages and requests; cancels an active companion drag when navigating.
- `src/components/chat/CareerChatbot.module.css`: reduced launcher dimensions and matching mobile bottom clearance.
- `src/components/assistant/AssistantCompanion.tsx`: scoped mouse attention, bounded eased gaze, repeated hover gesture, hover disabled while actively dragging and subordinated to real lifecycle states; reduced-motion static gaze preserved.
- `src/components/assistant/companionMotion.ts`: original 900ms repeating coordinated hover arm/foot track. Existing walking solver/direction treatment retained.
- `src/components/assistant/companionPlacement.ts`: placement comment reflects the one-time scan.
- `src/components/assistant/ARTWORK.md`: documents sizes, hover, placement and behavioral reference.
- New `e2e/assistant-companion-placement.spec.ts`: default/manual anchoring during scrolling and content changes, client navigation/back reset with conversation retention, hover repeat/gaze, genuine pending/reply precedence, reduced-motion pixel freeze.
- `e2e/assistant-pixels.spec.ts`: compact dimensions and proportional visible-pixel checks; evidence in this task's directory.
- `e2e/assistant-mascot-chat.spec.ts`: compact-size assertion and updated reload behavior. Reload intentionally resets placement under this request; same-page manual position still checked.
- `scripts/test_companion_motion.mjs`: hover repetition/two-arm/foot checks replace the superseded one-shot-hover settling assertion.
- This report, `REFERENCE.md`, local reference frames/contact sheets/metadata, baseline status/protected hashes and `AGENT_LOG.md`.

Verification actually run:

| Command | Result |
|---|---|
| `node scripts/test_companion_motion.mjs` | Exit 0, 26 passed, 0 failed |
| `node scripts/test_companion_pixels.mjs` | Exit 0, 7 passed, 0 failed |
| `node node_modules/typescript/bin/tsc --noEmit` | Exit 0, no errors (two batches) |
| `npm run lint` | Exit 0 (two batches) |
| `npm run build` | Exit 1 before compilation: pre-existing Next.js security reminder and sandbox `spawn EPERM` |
| Guarded build retry | Build not started: actual local listener check found the user's dev server on port 3000 |
| Focused browser suites | Prepared, not run in this task |
| `git diff --check` | Exit 0; only Git CRLF notices |
| Protected source hashes | 165 files checked, 0 changes |
| Local video decoder | Exit 0; all 533 frames decoded and visual detail sheets inspected |

The first sandboxed listener probe returned no listener details; an unrestricted read-only check subsequently established that port 3000 was occupied by PID 10328 (`next dev`). No process was stopped. MASTER_PROMPT.md line 74 forbids build/test activity while the user's dev server uses the shared `.next` folder. Verification was paused once that state was established. No `.next`/lock deletion, dependency changes, staging, commit, push, database migration, remote AI call or deployment.

Still required after the server stops: run the production build, then the new placement/hover suite plus pixel, companion motion and existing chat suites on phone/tablet/desktop; inspect actual pixel captures against the decoded reference. These checks cover repeated/diagonal/reversed/touch dragging, edge stops/release/cancellation, chat open/minimize, real request states, history/copy/error/abort/retry and visible control clearance. No physical-device or live-provider testing has been performed.

Artwork/rig/locomotion, APIs/services/authentication/context/database files, print/global styles and package files are unchanged. Existing unrelated uncommitted changes remain. The pre-existing Next.js 16.4.3 security advisory recommends an upgrade; none was performed within this task.
