# Smart Resume AI: Design System (v1)

Save as: docs/DESIGN.md
Style direction: clean, light, restrained, rounded and friendly, with generous whitespace.
Inspired by the look of a public product page (colors, spacing and shape language only).
This is NOT a copy: no brand names, logos, text, images or icons from that site, and no claim of affiliation.

---

## 1. Principles

1. Light theme. White canvas, soft grey sections, one blue accent.
2. Restraint: few colors, few shadows, no gradients, no decorative shapes.
3. Calm typography: small, consistent sizes; headings semibold, never black weight.
4. Rounded but not bubbly: pills only for badges, chips and switches.
5. Every screen has real empty, loading and error states. No fake stats, logos, reviews or placeholder people.
6. Accessible: text contrast 4.5:1 or more, UI boundaries 3:1 or more, visible focus, 44px touch targets on mobile.

---

## 2. Design tokens (put in src/app/globals.css, Tailwind v4 @theme and :root)

### Colors
| Token | Value | Use |
|---|---|---|
| --color-bg | #ffffff | Page and card surface |
| --color-bg-subtle | #f5f5f7 | App canvas, section bands, table header |
| --color-bg-subtle-2 | #fafafc | Hover rows, input fill on grey |
| --color-text | #1d1d1f | Headings and body (never pure black) |
| --color-text-secondary | #6e6e73 | Captions, hints, placeholders (5.1:1 on white) |
| --color-text-tertiary | #86868b | Disabled or decorative text only |
| --color-border-hairline | #e8e8ed | Card outlines, dividers |
| --color-border | #d2d2d7 | Stronger dividers (not for inputs) |
| --color-border-input | #86868b | Input, select, checkbox boundaries (3.6:1) |
| --color-accent | #0071e3 | Primary buttons, active states, focus ring (4.7:1 on white) |
| --color-accent-hover | #0066cc | Hover and links (5.6:1 on white) |
| --color-on-accent | #ffffff | Text on accent |
| --color-success | #008009 | Success text and icons (5.1:1) |
| --color-warning | #b64400 | Warning text and icons (5.5:1) |
| --color-danger | #e30000 | Errors (4.9:1) |
| tints | color-mix(in srgb, <semantic> 10%, white) | Backgrounds of alerts and badges |

Do not use #000000 for text. Do not introduce purple, violet, indigo, fuchsia or gradients.

### Typography
- Font family: `Inter` loaded with the existing font setup in `src/app/layout.tsx` (use `next/font`; add no dependency).
  Stack: `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`. Do NOT use or embed SF Pro files.
- Weights: 400 body, 500 labels and buttons, 600 headings. Never 800 or 900.
- Tracking: body 0; headings -0.01em; display -0.02em.

| Token | Size / line height | Weight | Use |
|---|---|---|---|
| text-caption | 12px / 16px | 400-500 | Captions, badges, table meta (minimum size) |
| text-small | 13px / 18px | 400 | Helper text, table cells |
| text-body | 14px / 20px | 400 | Default text in the app |
| text-body-lg | 16px / 24px | 400 | Long reading text, landing body |
| text-h3 | 18px / 24px | 600 | Card and section titles |
| text-h2 | 22px / 28px | 600 | Page sections |
| text-h1 | 28px / 34px | 600 | Page titles in the app |
| text-display | clamp(34px, 5vw, 56px) / 1.08 | 600 | Landing hero ONLY |

No other font sizes. No `text-[Npx]` arbitrary sizes outside this table. Do not shrink text on mobile by percentage;
keep body 14px (16px for inputs on mobile to avoid zoom).

### Spacing, layout, radius, shadow, motion
- Spacing: 4px grid (Tailwind default). Common steps: 4, 8, 12, 16, 24, 32, 48, 64.
- App header height 56px; sidebar width 240px (collapsed 72px); content max width 1120px (landing 1200px); page padding 24px (16px on mobile).
- Radius: controls (buttons) 10px; inputs 10px; chips and badges full; cards 16px; modals and large panels 20px; avatars full. Never 28px or more on controls.
- Elevation: none by default. Cards use a 1px hairline ring: `box-shadow: 0 0 0 1px var(--color-border-hairline)`.
  Menus, popovers and modals only: `0 8px 24px rgba(0,0,0,0.10)`. No glow, no colored shadows, no blur effects.
- Focus ring: `outline: 2px solid var(--color-accent); outline-offset: 2px` on every interactive element.
- Motion: 150-250ms ease-out for hover, focus and small transitions. Respect `prefers-reduced-motion`. No decorative animation.
- Breakpoints: mobile under 640px, tablet 640-1024px, desktop 1024-1440px, wide over 1440px (centered max-width).

---

## 3. Components (create or update in src/components/ui; do not duplicate existing ones)

| Component | Spec |
|---|---|
| Button primary | Background accent, text white, radius 10px, height 40px (44px on mobile), padding 0 16px, weight 500, hover accent-hover, disabled 42% opacity |
| Button secondary | Background #f5f5f7, text #1d1d1f, hover #e8e8ed |
| Button outline | White background, 1px #d2d2d7 border, text #1d1d1f |
| Button ghost / link | No background, text accent-hover, underline on hover |
| Button danger | Background danger, text white (only for destructive confirmations) |
| Input, select, textarea | White, 1px border-input, radius 10px, height 40px, 14px text (16px on mobile), label above, hint below in text-small secondary, error in danger with an icon and text (not color alone) |
| Checkbox, radio, switch | 20px (switch 44x24), border-input, accent when on, visible focus ring |
| Card | White, hairline ring, radius 16px, padding 24px (16px on mobile), no shadow |
| Section band | #f5f5f7 background, 48-64px vertical padding |
| Badge / chip | Full radius, 12px text, tint background with semantic text color (success, warning, danger, neutral, accent) |
| Tabs | Underline style: 2px accent underline on the active tab; segmented control (radius 10px, #f5f5f7 track) for mode switches |
| Table | Header #f5f5f7 text-small 600; rows with hairline dividers; hover #fafafc; horizontal scroll container on mobile |
| Navigation | White header, hairline bottom border, accent underline or accent text for the active item; sidebar white or #fafafc with hairline right border |
| Modal / drawer | White, radius 20px, popover shadow, focus trapped, Escape closes |
| Toast / alert | Tint background, 1px matching border, icon + text, dismissible |
| Empty state | Icon (line style), one-sentence explanation, one primary action |
| Skeleton | #f5f5f7 blocks with a slow shimmer (disabled by reduced motion) |
| Progress and score | Thin bars (6px, radius full) on #e8e8ed with accent fill; large numbers in text-h1 or text-display weight 600 |
| Icons | Lucide line icons, 16-20px, currentColor; no emoji |

---

## 4. Do and Don't

Do: white and #f5f5f7 surfaces, one accent, hairline outlines, consistent 4px spacing, semibold headings, real data and honest copy.
Don't: black or dark panels, gradients, glassmorphism or backdrop-blur, decorative blobs or mesh backgrounds, pill-shaped primary buttons,
oversized hero text, `font-black` or `font-extrabold`, text under 12px, fake statistics/testimonials/logos, new badges or ribbons that are not data.

---

## 5. Out of scope (do not restyle)

- The 12 resume templates, `A4ResumeDocument.tsx`, and all print / A4 CSS in `globals.css`. The resume paper keeps its own fonts and colors.
- The look of the PDF output.
- ATS scoring logic, API routes, database code and business logic.

---

## 6. Deviations from the extracted source (and why)

| Source value | Decision | Reason |
|---|---|---|
| SF Pro Display and Text | Inter with system fallback | Proprietary font license; not available on Windows |
| Type scale 80/48/44/40px and 24px body | Scale in section 2 | Marketing scale; too large for an app; contradicts the source's own 14px body |
| Card background #000000, radius 32px | White card, radius 16px | Contradicts the source's own no-dark-background rule |
| 28px+ radius on all interactive elements, 170px pill | 10px controls; pills only for badges | Avoid pill-heavy UI |
| Border #f5f5f7 | Hairline #e8e8ed for decoration; #86868b for inputs | #f5f5f7 is invisible (1.1:1); inputs need 3:1 |
| 7px spacing unit | 4px grid | Extraction artifact; conflicts with Tailwind |
| Shadows (1px rings) | Hairline rings; one soft popover shadow | Rings are outlines, not elevation |
| Reduce font sizes about 80% on mobile | Keep sizes; adjust layout | Readability in a data-dense app |
| Dark footer example | Footer on #f5f5f7 | Light-only direction |
| Secondary text #394452 | #6e6e73 | Matches the source's own glyph-secondary variable |
