# TASK MASCOT-1: "NIMBUS" AI ASSISTANT CHARACTER

Read first, in this order: AGENTS.md, MASTER_PROMPT.md (all rules stay in force), AGENT_LOG.md, docs/DESIGN.md.
Scope: a visual character for the existing AI Assistant (floating chat). Do NOT change chat logic, API routes, prompts, services, database code, resume templates, A4/print CSS or the ATS engine.
No new dependencies, no images, no Lottie, no 3D assets: inline SVG and CSS only. No git changes. One agent only; my dev server must be stopped before any build,
test or screenshot run (ask me if port 3000 is busy). Never kill processes or delete .next or its lock. Plan first.

---

## CHARACTER

Name of the character: Nimbus (a friendly cloud-shaped robot with a screen face). Original art, drawn by us. Do NOT use or imitate any third-party mascot or reference image.
IMPORTANT: Nimbus is only a visual avatar. The assistant's identity in the product stays "AI Assistant": keep every label, aria-label and the system-prompt identity rule
("AI Assistant", no human persona or name). Do not make the chat say "I'm Nimbus". Do not edit the system prompt.

Look: flat shapes only (no gradients, no glow, no blur, no outlines), two blues and a dark screen, cute but professional.
Tokens: body `var(--color-accent)` (#0071e3); shade `--mascot-shade: #005bb5` (feet and lower body); screen `var(--color-text)` (#1d1d1f);
face ink `--mascot-ink: #8fc4ff` (eyes, smile, dots, check). Add the two `--mascot-*` tokens to globals.css next to the other tokens.

Base art (use this structure and keep it recognizable; you may refine proportions slightly). viewBox 0 0 120 120:

```svg
<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <g class="nimbus-body">
    <g fill="var(--color-accent)">
      <circle cx="42" cy="52" r="22"/><circle cx="68" cy="44" r="26"/><circle cx="88" cy="58" r="18"/>
      <rect x="26" y="52" width="76" height="32" rx="16"/>
    </g>
    <rect class="nimbus-feet" x="42" y="84" width="44" height="18" rx="9" fill="var(--mascot-shade)"/>
    <g class="nimbus-face">
      <rect x="38" y="44" width="52" height="32" rx="12" fill="var(--color-text)"/>
      <g class="nimbus-eyes" fill="var(--mascot-ink)">
        <rect class="eye-l" x="49" y="55" width="9" height="5" rx="2.5"/>
        <rect class="eye-r" x="70" y="55" width="9" height="5" rx="2.5"/>
      </g>
      <path class="nimbus-smile" d="M57 66q7 6 14 0" stroke="var(--mascot-ink)" stroke-width="3" fill="none" stroke-linecap="round"/>
      <g class="nimbus-dots" fill="var(--mascot-ink)" opacity="0"><circle cx="54" cy="62" r="2.5"/><circle cx="64" cy="62" r="2.5"/><circle cx="74" cy="62" r="2.5"/></g>
      <path class="nimbus-check" d="M54 62l6 6 12-12" stroke="var(--mascot-ink)" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0"/>
      <g class="nimbus-prompt" fill="none" stroke="var(--mascot-ink)" stroke-width="3" stroke-linecap="round" opacity="0"><path d="M52 56l6 5-6 5"/><path class="caret" d="M63 67h10"/></g>
    </g>
  </g>
</svg>
```

---

## STATES AND MOTION (CSS keyframes, transform and opacity only; durations in brackets)

| State | Look | Motion |
|---|---|---|
| idle | smile and eyes | body bob 3px up and down (3.2s ease-in-out, loops); blink every about 4s (eyes scaleY to 0.15 for 120ms) |
| greeting (first open of a session) | smile | body tilts 6deg and back once (600ms); optional small bubble, see below |
| listening (user is typing in the chat input) | eyes slightly larger | eyes shift up 1px; no loop |
| thinking (request in flight) | three dots replace eyes and smile | dots pulse in sequence (900ms loop, 150ms stagger); body tilts 3deg |
| answering (response streaming or just arrived) | prompt symbol ">_" on the screen | caret blinks (1s steps); stops when the answer is complete |
| success (action completed, for example a suggestion applied) | check on the screen | check fades in, body hops 6px (400ms), returns to idle after 1.2s |
| limited (the assistant is using its offline or fallback answers) | sleepy flat eyes, small smile | no bob; a short text "Limited mode" appears next to it in the chat header ONLY when the API response truly indicates a fallback; never fake this |
| error | flat mouth | one 2px shake (300ms), then idle |

Extras: on desktop pointer devices the eyes follow the pointer within 3px (throttled with requestAnimationFrame, only while the launcher or panel is visible).
Only one looping animation runs at a time. Pause all looping when the tab is hidden (Page Visibility API). `prefers-reduced-motion`: static pose per state
(dots, check, prompt shown statically), no bob, no blink, no follow, no hop; everything still understandable.

---

## COMPONENT AND INTEGRATION

Create `src/components/assistant/NimbusMascot.tsx` (client component) with props: `state` (the table above), `size` (number, px), `decorative` (boolean, default true: svg aria-hidden), `className`.
Styles in a CSS module or a scoped block in globals.css (class prefix `.nimbus-`); no inline style colors. Total component size under 4 KB; no runtime animation library.

Use it in these places (do not change the behavior of any of them):
1. Chat launcher: 56px, bottom right, a real `<button>` with `aria-label="Open AI Assistant"`, visible focus ring, 44px minimum target. It must NOT cover primary buttons or form controls on any
   page at 390, 768, 1366 and 1440 widths (check dashboard, builder shell, jobs, analyzer, onboarding); use safe-area insets and a z-index below modals and drawers.
2. Chat header avatar: 32px with the label text "AI Assistant" next to it (idle, or limited when true).
3. Assistant message avatars: 24px, static pose only (no loops inside the message list).
4. Typing indicator: thinking state, replacing any existing generic spinner.
5. Empty chat state: 96px with greeting then idle, and the suggested questions below.
6. Onboarding helper (64px, idle) next to the intro text, and the My Career Data empty state (64px).
7. Landing page: a 96px idle Nimbus on the AI Assistant capability card only if that section exists and the landing batch is approved; otherwise skip.
First-visit greeting bubble: one small dismissible bubble next to the launcher with "Ask me about your resume, jobs or interviews." Show once per browser (localStorage in try/catch; render correctly when storage is empty or blocked),
never auto-open the chat, never re-show after dismiss, never show while a modal is open.

Accessibility: state changes announced through an aria-live="polite" visually-hidden text in the chat ("Assistant is thinking", "Answer ready"); no flashing; works with keyboard only; mascot svg stays aria-hidden because text labels carry the meaning.

---

## TESTS AND EVIDENCE

- Add e2e/assistant-mascot.spec.ts (Playwright, 4 viewports): launcher visible, keyboard-focusable and opens the chat; launcher bounding box does not overlap the main CTA or form controls on the pages listed above;
  state switches idle to thinking to answering to idle when a message is sent (mock the chat response if needed; do not call Gemini); reduced-motion emulation shows static states with no running animations
  (check computed animation-name or getAnimations length); first-visit bubble shows once and not after dismiss; no console errors.
- Add the mascot with all states and sizes to the internal style-guide page if it exists.
- Capture screenshots to scripts/visual-qa/mascot/ (do not commit): every state at 24, 32, 56 and 96px, the launcher on dashboard, builder, jobs and onboarding at 390x844 and 1366x768, and the chat open with each state.

---

## WORKFLOW

1. PLAN (STOP for my "approved"): files to create or change, where each placement goes in the existing code, how the real chat state (sending, streaming, fallback) will drive the mascot states, how "limited mode" is detected truthfully,
   and any placement that risks covering content.
2. Batch A: mascot component, tokens, states, style-guide entry, screenshots of all states. STOP for review.
3. Batch B: launcher, chat header, message avatars, typing indicator, empty chat state, greeting bubble. STOP for review.
4. Batch C: onboarding and My Career Data placements, optional landing placement, limited and error states wired to real conditions. STOP for review.
5. Batch D: tests, accessibility and responsive pass, performance note (component size, no layout shift). With the dev server stopped: npx tsc --noEmit, npm run lint, npm run build, npm run test:e2e:public,
   the new spec, test:chat_assistant_grounding, test:gemini. Confirm the ATS SHA256 (F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251) is unchanged and git diff shows no changes in templates,
   A4/print CSS, API routes, services or db code (the chat UI component may change only for placement and state wiring; no change to message handling or the request payload).
6. Report each batch: files changed, commands with exit codes and counts, screenshot paths, what is NOT verified, risks. Append to AGENT_LOG.md and STOP.

START: step 1 only (the plan). No code changes.
