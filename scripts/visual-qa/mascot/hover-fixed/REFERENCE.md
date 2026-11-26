# Companion hover and pinned placement reference

Reference: `C:/Users/kiran/OneDrive/Videos/Screen Recordings/Screen Recording 2026-11-25 202438.mp4`.

The existing local decoder used installed OneDrive FFmpeg DLLs and Pillow. All 533 video frames were decoded: 17.7667 seconds, 30 FPS, 734×1000. Eighty-nine frames were saved at 0.2-second intervals in `reference/native-frames`, with a full-clip overview and three character detail sheets. No remote upload, dependency installation or source-video modification occurred. Video content was treated as a visual reference, not instructions.

Observed behavior:

- 0–1.2s: resting full-body robot, subtle resting changes; pointer approaches it.
- Approximately 1.2–3.8s: hovering produces repeated open-arm gestures and alternating foot/body poses, roughly once per 0.9–1 second. The character's viewport anchor remains steady during these gestures.
- Approximately 4–12.4s: pointer grabs and moves the robot across the screen. Feet alternate, arms open/countermove, and horizontal direction follows travel. Proportions remain consistent. The reference sometimes mirrors its horizontal face symbols; the project retains its existing non-mirrored robot artwork and safe joint-based direction treatment.
- Approximately 12.6–16s: robot remains at the released anchor. Further hovering produces the same repeatable gesture. Approximately 16–17.7s: it rests after the pointer leaves.

Implementation mapping: an original 900ms articulated open-arm/foot gesture while actually hovered; bounded/eased mouse gaze; walking driven by actual smoothed/clamped movement, with existing direction hysteresis and no whole-body flip. Reduced motion uses static state poses. Hover yields to genuine thinking/answer/error states. Companion width decreases from 120/100px to 88/72px (desktop/mobile). Placement searches once for a clear default spot on each page, remains fixed through scrolling/content changes, and resets on navigation/reload. Explicit drag/keyboard movement is retained on the current page. Chat/backend/history behavior remains unchanged.

The video contains neither application-page scrolling nor a real AI request, so those behaviors require separate browser regression checks. Exact pixel/frame equality with this recording is not claimed. Browser captures and placement/motion samples are produced by the focused tests after the user's dev server stops.
