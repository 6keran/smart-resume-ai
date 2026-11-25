# Robot gait investigation — awaiting reference-video decoding

Status: application movement code has not changed in this investigation. The supplied video is present and readable, but its frames have not been inspected; no video-match claim is made.

Reference: C:/Users/kiran/OneDrive/Videos/Screen Recordings/Screen Recording 2026-11-25 070852.mp4 (3,814,025 bytes).

## Confirmed code findings

- AssistantCompanion.tsx interpolates a whole-body horizontal scale between +1 and -1. Every direction reversal passes through zero width and mirrors the robot. This is the source of squash/flip behavior; it does not preserve proportions during turning.
- CareerChatbot.tsx selects a new direction from any individual pointer sample with more than one pixel of horizontal travel. Vertical or diagonal dragging can therefore switch facing because of small horizontal jitter.
- companionMotion.ts uses `(distance % 56) / 56` as the walking phase. The advertised 720ms walking duration is bypassed. At 560 pixels/second this produces ten cycles/second, which cannot be sampled naturally at the renderer's 30 FPS walking cap.
- Distance is accumulated from raw pointer travel rather than actual clamped launcher displacement. The gait can continue at a viewport edge although the companion no longer moves.
- The current gait's hip rotations and arm curves do not establish a stable stance-foot contact/swing-foot trajectory. The phase must be separated from facing and constrained to a coordinated, sampled rhythm.

These are code findings, not observations from the attached video. The clip's actual cadence, bounce, direction-change treatment and stop/reveal timings remain unmeasured.

## Prepared read-only decoder

scripts/visual-qa/mascot/inspect-motion-reference.mjs reads the attached MP4 through a temporary loopback-only server, decodes quarter-second frames with installed Chromium, and saves frames plus overview contact sheets under this directory. It makes no uploads and does not change the app or reference file. After an initial overview, the same helper accepts a finer interval and a start/end window for detailed gait timing analysis.

Command from the project directory:

```powershell
node scripts/visual-qa/mascot/inspect-motion-reference.mjs 'C:/Users/kiran/OneDrive/Videos/Screen Recordings/Screen Recording 2026-11-25 070852.mp4'
```

## Execution results

- Requested outside-sandbox decoding: command did not execute. Automatic approval review returned HTTP 403 with a quota-exhaustion message. The service explicitly reported that this was a review failure, not a determination that the action was unsafe.
- Safer in-sandbox decoder attempt: exit 1, Chromium child-process startup failed with spawn EPERM. No video frames were produced.
- No dependencies installed. The available Python environment has Pillow but no OpenCV/PyAV/imageio video decoder; ffmpeg/ffprobe were not found in the checked command paths or bundled binary directories.
- No TypeScript, lint, build or gait browser verification was run for a revised implementation because no application change has been made.

## Intended next work after the video is available

1. Inspect the complete clip and higher-frequency movement windows; record observed gait timing, body displacement and stop/turn behavior without guessing them.
2. Replace whole-robot mirroring with a stable upright direction presentation; animate legs, feet and counter-swinging arms individually.
3. Drive cursor following and gait from actual rendered/clamped motion, with stable direction hysteresis and a bounded gait frequency. Maintain animation continuity through stop, reversal, dragging and real assistant request states.
4. Preserve the current robot art, assistant API/auth/history, viewport protection, pointer capture and click suppression.
5. Verify repeated cardinal/diagonal/rapid-reversal drags, release/cancel, viewport edges, real touch, state transitions and reduced motion, then compare captured output against the clip. Report measured similarities and remaining differences.

The artwork, app and protected source hashes remain unchanged. Only the isolated decoder helper, this investigation report and the task log were added/updated. No Git staging/commit/push, deployment, backend/database changes, process termination or lock deletion occurred.
