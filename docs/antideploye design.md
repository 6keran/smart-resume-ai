# Design System Inspired by Antideploy

> Auto-extracted from `https://antideploy.com/` on 2026-11-22

## 1. Visual Theme & Atmosphere

Friendly, approachable design with rounded shapes and generous whitespace.

The hero section leads with "Put your app online.
      Just ask your agent." followed by "Paste one sentence into Claude Code, Codex or Cursor. Antideploy sets it all up and hands you a live".

**Key Characteristics:**
- Geist as the heading font (custom web font loaded via @font-face)
- Geist as the body font for all running text
- Heading weight 600, letter-spacing -6.03434px
- Light/white background (#f7f6f2) as the primary canvas
- Primary accent `#2211ff` used for CTAs and brand highlights
- 8 shadow level(s) detected — tinted shadows
- Rounded corners (50px+) creating a friendly, approachable feel
- Tags: light, rounded, accented, bold-typography, monospace, serif

## 2. Color Palette & Roles

### Primary
- **Primary Accent** (`#2211ff`) · `--color-primary`: Brand color, CTA backgrounds, link text, interactive highlights.
- **Background** (`#f7f6f2`) · `--color-bg`: Page background, primary canvas.
- **Background Secondary** (`#111111`) · `--color-bg-secondary`: Cards, surfaces, alternating sections.

### Text
- **Text Primary** (`#0c0b14`) · `--color-text`: Headings and body text.
- **Text Secondary** (`#666666`) · `--color-text-secondary`: Muted text, captions, placeholders.

### Borders & Surfaces
- **Border** (`#111111`) · `--color-border`: Dividers, outlines, input borders.

### Full Extracted Palette

| # | Hex | CSS Variable | Role | Area | Contrast |
|---|---|---|---|---|---|
| 1 | `#ffffff` | `--palette-1` | section | large | text-dark |
| 2 | `#111111` | `--palette-2` | block | large | text-light |
| 3 | `#f7f6f2` | `--palette-3` | block | large | text-dark |
| 4 | `#f4ebdd` | `--palette-4` | block | large | text-dark |
| 5 | `#f0eee8` | `--palette-5` | badge | large | text-dark |
| 6 | `#2211ff` | `--palette-6` | text-accent | medium | text-light |

## 3. Typography Rules

- **Heading Font:** `Geist` (web font)
- **Body Font:** `Geist` (web font)

### Type Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing |
|---|---|---|---|---|---|
| H1 | Geist | 107.756px | 600 | 101.291px | -6.03434px |
| H2 | Geist | 72px | 600 | 73.44px | -3.24px |
| H3 | Geist | 22.72px | 600 | 27.7184px | -0.63616px |
| Body | Geist Mono | 10.88px | 500 | 17.408px | 1.088px |
| Small | Geist | 13.12px | 400 | 17.712px | normal |
| Code | Geist Mono | 12.8px | 400 | 19.2px | normal |

### Type Scale

| Token | Size | Suggested Usage |
|---|---|---|
| Display | `116.376px` | headings |
| H1 | `111.616px` | headings |
| H2 | `107.756px` | headings |
| H3 | `79.2px` | headings |
| H4 | `72px` | headings |
| Body L | `70.048px` | body / supporting text |
| Body | `63.68px` | body / supporting text |
| Small | `55.808px` | body / supporting text |
| XS | `48px` | body / supporting text |
| Caption | `42px` | body / supporting text |

## 4. Component Stylings

### Primary Button

```css
.btn-primary {
  background: transparent;
  color: #2211ff;
  border-radius: 0px;
  padding: 0px 0px;
  font-size: 14.4px;
  font-weight: 550;
  border: none;
  cursor: pointer;
}
```

### Pill Button

```css
.btn-pill {
  background: #2211ff;
  color: #ffffff;
  border-radius: 999px;
  padding: 0px 15px;
  font-size: 14.4px;
  font-weight: 560;
  border: none;
  cursor: pointer;
}
```

### Pill Button 2

```css
.btn-pill-2 {
  background: #ffffff;
  color: #0c0b14;
  border-radius: 999px;
  padding: 0px 34.4819px;
  font-size: 21.5512px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Pill Button 3

```css
.btn-pill-3 {
  background: transparent;
  color: #ffffff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 10.5px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
```

### Filled Button

```css
.btn-filled {
  background: #ffffff;
  color: #3a3946;
  border-radius: 11px;
  padding: 0px 0px;
  font-size: 13.5px;
  font-weight: 600;
  border: none;
  cursor: pointer;
}
```

### Filled Button 2

```css
.btn-filled-2 {
  background: #0d0d15;
  color: #ffffff;
  border-radius: 9px;
  padding: 9px 13px;
  font-size: 12px;
  font-weight: 400;
  border: none;
  cursor: pointer;
}
```

### Card

```css
.card {
  background: #ffffff;
  border-radius: 22px;
  padding: 12px;
  box-shadow: rgba(20, 18, 40, 0.14) 0px 0px 0px 1px inset, rgba(16, 14, 40, 0.04) 0px 2px 4px 0px, rgba(16, 14, 40, 0.2) 0px 18px 40px -14px, rgba(16, 14, 40, 0.3) 0px 44px 90px -34px;
}
```

## 5. Layout Principles

- **Base spacing unit:** `9px` — use multiples (18px, 27px, 36px, etc.)

### Spacing Scale (extracted from real elements)

| Token | Value | Role |
|---|---|---|
| spacing-1 | `9px` | element |
| spacing-2 | `12px` | element |
| spacing-3 | `22px` | element |
| spacing-4 | `3px` | element |
| spacing-5 | `6px` | element |
| spacing-6 | `26px` | card |
| spacing-7 | `4px` | element |
| spacing-8 | `8px` | element |

### Border Radius Scale

| Token | Value | Element |
|---|---|---|
| radius-card | `50px` | card |
| radius-button | `10px` | button |
| radius-button | `6px` | button |
| radius-subtle | `3px` | subtle |
| radius-button | `14px` | button |
| radius-button | `12px` | button |

## 6. Depth & Elevation

| Level | Shadow | Usage |
|---|---|---|
| Low | `rgba(20, 18, 40, 0.086) 0px 0px 0px 1px inset, rgba(16, 14, 40, 0.05) 0px 1px 2p...` | Cards, subtle elevation |
| Low | `rgb(231, 229, 255) 0px 0px 0px 1px inset` | Cards, subtle elevation |
| Low | `rgba(20, 18, 40, 0.086) 0px 0px 0px 1px inset` | Cards, subtle elevation |
| Low | `rgba(20, 18, 40, 0.086) 0px 0px 0px 1px inset, rgba(16, 14, 40, 0.05) 0px 1px 2p...` | Cards, subtle elevation |
| Low | `rgba(20, 18, 40, 0.14) 0px 0px 0px 1px inset, rgba(16, 14, 40, 0.05) 0px 1px 2px...` | Cards, subtle elevation |

> **Note:** This site uses chromatic (color-tinted) shadows rather than pure black — this is a deliberate brand choice that adds warmth to elevation.

## 7. Do's and Don'ts

### Do
- Use `#f7f6f2` as the primary background color
- Use `Geist` for all headings and `Geist` for body text
- Use `#2211ff` as the single dominant accent/CTA color
- Maintain `9px` as the base spacing unit — all gaps should be multiples
- Use rounded corners (`50px`+) consistently for all interactive elements
- Use serif fonts for headlines to maintain editorial authority
- Make headlines large and bold — typography is the hero element
- Apply the shadow system for elevation — use the extracted shadow values
- Use weight 600 for headings to match the brand's typographic voice

### Don't
- Don't use colors outside the extracted palette without justification
- Don't substitute Geist/Geist with generic alternatives
- Don't use irregular spacing — stick to 9px grid
- Don't use dark/black backgrounds — this is a light-themed design
- Don't use sharp corners — they feel hostile in this rounded design language
- Don't mix in geometric sans-serif headlines — it breaks the editorial tone
- Don't use pure black (#000000) for text — use `#0c0b14` instead
- Don't add decorative elements not present in the original design — no badges, ribbons, banners, or ornaments unless the source site uses them
- Don't invent UI patterns the source site doesn't have — if the original has no NEW badge, don't add one just because a red is in the palette

## 8. Responsive Behavior

| Breakpoint | Width | Notes |
|---|---|---|
| Mobile | < 640px | Single column, stack sections, reduce font sizes ~80% |
| Tablet | 640–1024px | 2-column where appropriate, maintain spacing ratios |
| Desktop | 1024–1440px | Full layout as designed |
| Wide | > 1440px | Max-width container, center content |

- Touch targets: minimum 44×44px on mobile
- Maintain 9px base unit across breakpoints — only scale multipliers

## 9. Agent Prompt Guide

### Quick Color Reference

```
Background:  #f7f6f2
Text:        #0c0b14
Accent:      #2211ff
Border:      #111111
```

### Example Prompts

1. "Build a hero section with a `#f7f6f2` background, `Geist` heading in `#0c0b14`, and a `#2211ff` CTA button with 999px radius."
2. "Create a pricing card using background `#111111`, border `#111111`, `Geist` for text, and 27px padding."
3. "Design a navigation bar — `#f7f6f2` background, `#0c0b14` links, `#2211ff` for active state."
4. "Build a feature grid with 3 columns, 27px gap, each card using the card component style."
5. "Create a footer with `#0c0b14` background, `#f7f6f2` text, and 18px padding."

### Iteration Guide

1. Start with layout structure (sections, grid, spacing)
2. Apply colors from the palette — background first, then text, then accents
3. Set typography — font families, sizes from the type scale, weights
4. Add components — buttons, cards, inputs using the specs above
5. Apply border-radius consistently across all elements
6. Add shadows for depth — use the extracted shadow values, not defaults
7. Check responsive behavior — test mobile and tablet layouts
8. Final pass — verify all colors match, spacing is consistent, fonts are correct

## 10. CSS Custom Properties

> 46 custom properties extracted from `:root` / `html` stylesheets.

### Color Variables

| Variable | Value |
|---|---|
| `--paper` | `#F7F6F2` |
| `--paper-2` | `#F0EEE8` |
| `--paper-3` | `#E6E3DB` |
| `--white` | `#FFFFFF` |
| `--ink` | `#0C0B14` |
| `--ink-2` | `#3A3946` |
| `--ink-3` | `#6B6977` |
| `--ink-4` | `#6F6D7B` |
| `--line` | `rgba(20, 18, 40, .085)` |
| `--line-2` | `rgba(20, 18, 40, .14)` |
| `--line-3` | `rgba(20, 18, 40, .22)` |
| `--blue` | `#2211FF` |
| `--blue-hi` | `#3A2BFF` |
| `--blue-600` | `#1A0BD6` |
| `--blue-700` | `#1800AD` |
| `--blue-800` | `#10077A` |
| `--blue-900` | `#09044A` |
| `--blue-300` | `#A39CFF` |
| `--blue-200` | `#C9C4FF` |
| `--blue-100` | `#E7E5FF` |
| `--blue-50` | `#F3F2FF` |
| `--green` | `#12994F` |
| `--green-2` | `#22C06E` |
| `--green-soft` | `#DCF4E6` |
| `--red` | `#DC3F45` |
| `--red-soft` | `#FDE9E9` |
| `--amber` | `#C98205` |
| `--amber-soft` | `#FFF4DC` |
| `--night` | `#0A0A12` |
| `--night-2` | `#12121C` |
| ... | *(6 more)* |

### Spacing Variables

| Variable | Value |
|---|---|
| `--wrap` | `1200px` |
| `--wrap-wide` | `1320px` |

### Other Variables

| Variable | Value |
|---|---|
| `--f-sans` | `"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--f-mono` | `"Geist Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |
| `--f-serif` | `"Instrument Serif", ui-serif, Georgia, "Times New Roman", serif` |
| `--ease` | `cubic-bezier(.2, .7, .1, 1)` |
| `--ease-out` | `cubic-bezier(.16, 1, .3, 1)` |
| `--ease-in-out` | `cubic-bezier(.65, 0, .35, 1)` |
| `--gutter` | `clamp(20px, 4vw, 40px)` |
| `--section` | `clamp(88px, 9.4vw, 140px)` |
