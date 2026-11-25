# TASK F5: DESIGN SYSTEM ROLLOUT (for Codex or any coding agent)

Before anything else, read these files in the project root, in this order:
1. AGENTS.md (project agent rules; follow them. Do not edit AGENTS.md without my approval.)
2. MASTER_PROMPT.md (all hard rules stay in force, especially rules 1-16)
3. AGENT_LOG.md (what earlier agents did; append your entry when you finish a phase)
4. docs/DESIGN.md (the design system: tokens, components, exclusions)

Project: Smart Resume AI, folder D:\projects\builder-github, Next.js 16 App Router, React 19, TypeScript, Tailwind v4.
Goal: apply the new design system consistently to the WHOLE existing app, phase by phase, WITHOUT changing behavior.
This is a styling and layout task only. Improve what exists; do not rebuild features or pages.

---

## NON-NEGOTIABLE RULES

- No git add / commit / push / reset / stash / clean / restore. No deploy. No migrations. Never read or print .env values.
- No new dependencies and no package-lock changes. Use `next/font` for Inter; do not download or embed SF Pro or any proprietary font.
- One agent only. If my dev server is running (port 3000), STOP and ask me to stop it before any build, test or screenshot run.
  Never kill a process you did not start. Never delete or rebuild .next, never delete .next/dev/lock.
- Do NOT touch: src/components/builder/templates/*, A4ResumeDocument.tsx, any print/A4 CSS in globals.css, the ATS engine
  (deterministicAtsEngine.ts), API routes, database code, services, or business logic. Do not change copy except where a label
  is clearly wrong; update e2e locators only for intentional label changes and explain each change.
- Do not copy anything from the source website the design came from: no brand names, logos, text, images or icons.
- No fake content: no invented statistics, customer logos, reviews, user counts or people. Use real product facts or empty states.
- Keep every route, form, button action, API call and state working. Keep all empty, loading and error states (add them where missing).
- Do not remove ThemeToggle, ThemeContext or dark mode code in phases 1-5. Phase 6 only proposes what to do (see DECISION).
- Never claim a check passed unless you ran it and read the output. Skipped is not passed. Report what is NOT verified.
- Work in small batches (1 to 5 files). After each batch run: npx tsc --noEmit and npm run lint. After each phase also run
  npm run build (only if my dev server is stopped) and npm run test:e2e:public, and report real counts.

---

## HOW EACH PHASE WORKS

1. Read-only plan: list the files you will change, current problems, and which tokens/components you will use. Show it, then continue
   only if the phase says "no approval needed"; otherwise STOP for my "approved".
2. Implement in small batches using the tokens in docs/DESIGN.md (CSS variables and Tailwind theme classes). No hard-coded hex values,
   no `text-[Npx]` sizes, no arbitrary radius, no inline styles for colors in pages. Reuse components from src/components/ui; if one
   exists, update it instead of creating a duplicate.
3. Capture before and after screenshots with Playwright at 1366x768 and 390x844 into scripts/visual-qa/design-system/<phase>/
   (do not commit them). Test with a temporary SQLite sandbox account, never my real database.
4. Verify (commands above), then append a full entry to AGENT_LOG.md and send the report: files changed, commands with exit codes
   and counts, screenshots paths, what is NOT verified, risks. Then STOP and wait for "approved".

---

## PHASES

### Phase 0: Audit (read-only, no approval needed to start; STOP at the end)
Report counts and file lists (excluding templates and print CSS) for: hard-coded hex colors; purple/violet/indigo/fuchsia classes;
gradients; backdrop-blur; box-shadow and shadow-* usage; rounded-full usage; font-black/font-extrabold; text-[Npx] values and
text-xs..text-7xl usage; dark: variants; existing UI components and how many pages bypass them; the current font setup in layout.tsx.
Then propose the exact token file changes (Phase 1). Include a risk list (pages most likely to break).

### Phase 1: Tokens and base (plan first, STOP for approval)
- Add all tokens from docs/DESIGN.md to src/app/globals.css (Tailwind v4 theme + :root variables): colors, type scale, radius, shadows,
  focus ring, motion, container widths. Set the body font to Inter through next/font in layout.tsx with the stack in DESIGN.md.
- Set body text 14px, headings semibold, remove the body mesh/gradient background, set the canvas to the subtle grey and cards to white.
- Add a global focus-visible style and prefers-reduced-motion handling. Do not touch print CSS.
- Do not restyle pages yet. Show the diff summary and a style-guide page (internal route, not linked from navigation, e.g. /dev/style-guide,
  disabled in production) that renders every token and component for review.

### Phase 2: UI components (STOP for approval)
Create or update, in src/components/ui: Button (primary, secondary, outline, ghost, danger), Input, Select, Textarea, Checkbox, Radio, Switch,
Card, Badge, Tabs and SegmentedControl, Table, Modal/Drawer, Dropdown/Menu, Toast/Alert, EmptyState, Skeleton, ProgressBar, PageHeader
(title + one-line purpose + primary action). Typed props, accessible (labels, aria, keyboard, focus trap in dialogs), covered by the style guide.
No page migrations in this phase except the style guide.

### Phase 3: App shell and public pages (STOP for approval after each batch)
Batch 3a: Header, Sidebar, mobile drawer, footer, user menu, theme toggle placement.
Batch 3b: Landing page (restrained hero, display size max 56px, real product facts only, no stats or testimonials), FAQ, privacy, terms.
Batch 3c: Login, register, onboarding, public ATS score page.

### Phase 4: Student app (one batch per group; STOP for approval after each)
4a Dashboard and dashboard sub-pages (resumes, analyses, improvements, applications, jobs, assessments, certificates, skills, courses, profile, my-data).
4b Resume Builder shell (toolbar, stepper, forms, template picker, panels; NOT the resume paper or templates), Analyzer, Improver, Job Match.
4c Jobs, Career Guidance and Roadmap, Project Mentor, Interview Prep.
4d Skills list, assessment pages and certificate page (keep the proctoring flow and camera area behavior identical), Feedback.
4e AI Assistant panel (launcher must not cover primary buttons; keep behavior), toasts, modals.

### Phase 5: Admin console (STOP for approval after each batch)
Admin login, dashboard, users, resumes, analyses, job matches, jobs, assessments, skills, proctoring, feedback, settings. Same components, data-dense tables.

### Phase 6: Cleanup and audit (STOP at the end)
- Re-run the Phase 0 counts and show before and after. Targets outside templates and print CSS: purple/violet/indigo/fuchsia 0; gradients 0;
  backdrop-blur 0; font-black/extrabold 0; text-[Npx] only if listed in docs/DESIGN.md; no hard-coded hex outside the token file; rounded-full only on
  badges, chips, switches, avatars and progress bars; no text below 12px.
- Accessibility pass: contrast per DESIGN.md, visible focus on all controls, 44px touch targets on mobile, keyboard navigation of dialogs, tabs and menus,
  labels on every input, reduced motion.
- Responsive pass at 390, 768, 1366, 1440 for every page group. No horizontal page scroll.
- Full verification: tsc, lint, build (dev server stopped), test:e2e:public, the existing authenticated specs, test:templates, and
  test_deterministic_ats_scoring. Confirm the SHA256 of deterministicAtsEngine.ts is unchanged and git diff shows no changes in templates or print CSS.
- DECISION (do not act, ask me): light-only means dark: variants and the theme toggle become unused. Present options (A keep toggle but light only,
  B remove dark code, C keep both) with the effort of each, and wait.

---

## DEFINITION OF DONE FOR EVERY PAGE
Uses design tokens and shared components only; correct type scale; hairline cards; one accent; real empty/loading/error states; works at 390px and 1366px;
keyboard accessible; unchanged behavior and routes; before/after screenshots saved; tests still passing or failures explained honestly.

---

## START NOW
Do Phase 0 only. Check that port 3000 is free (if it is not, STOP and ask me). Report using the format above, append to AGENT_LOG.md, then STOP.
