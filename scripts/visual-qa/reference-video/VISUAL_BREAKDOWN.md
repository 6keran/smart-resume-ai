# Reference video visual breakdown and product mapping

Reference: `Screen Recording 2026-11-23 194730.mp4`

- Duration: 41.333 seconds
- Source size: 1918 x 878
- Inspection set: 84 frames at 0.5-second intervals, including the final frame
- Existing written reference: `docs/antideploye design.md`

## What the recording actually shows

The recording is one continuous desktop scroll through the Antideploy marketing site. It does not show a logged-in product, mobile behavior, hover states, route changes, loading states, or form validation. Those application states must therefore translate the demonstrated visual language rather than pretend that the video contains designs it does not show.

The black task toast and the small blue robot visible at the lower-right of many frames are recording/tool overlays. They are not part of the reference site and must not be recreated.

## Timeline

| Time | Evidence in the recording | Design implication |
| --- | --- | --- |
| 0.0-3.5s | Editorial hero, floating rounded navigation, one-sentence pill, large violet product stage with black code/browser windows | Large type leads; product UI is presented as a composed stage rather than a generic dashboard screenshot |
| 3.5-8.5s | Oversized two-line heading, three instruction cards, black command strip | Use numbered narrative sections, sparse copy, strong contrast changes, and compact functional diagrams |
| 8.5-11.5s | Split editorial statement beside code analysis panel and short evidence list | Pair concise claims with real product evidence; avoid decorative cards without information |
| 11.5-13.5s | Full-width cobalt metric band with four large values | Use cobalt bands for important verified product facts and transitions |
| 13.5-18.0s | Large centered statement followed by a dense service/capability card matrix | Capability pages can use compact grids, but hierarchy remains editorial and spacious |
| 18.0-22.0s | Centered serif/sans heading and fifteen-service grid | Application navigation should feel like one coherent system with reusable cards and labels |
| 22.0-25.5s | Project gallery mosaic with browser-like frames | Resume templates, jobs, projects, and history can use curated visual galleries rather than identical statistic cards |
| 25.5-29.0s | Alternating split sections with copy and black terminal/product canvases | Builder, ATS, jobs, and interview workflows should alternate explanation and working surfaces |
| 29.0-30.8s | Full-width near-black section with white/violet editorial type and a rules list | Dark sections are reserved for boundaries, constraints, security, and high-focus work—not used indiscriminately |
| 30.8-32.8s | Centered comparison heading and a two-option comparison surface | Before/after, score evidence, and review states should use explicit comparison layouts |
| 32.8-34.8s | Pricing card row with one cobalt/black emphasized card | Use one clear primary choice while keeping alternatives quiet and comparable |
| 34.8-36.0s | Editorial FAQ with simple rules and ample whitespace | Supporting pages should keep typography prominent and controls visually restrained |
| 36.0-37.5s | Full-width cobalt closing statement and action pill | End major journeys with a decisive, simple next action |
| 37.5-41.3s | Near-black footer, compact link grid, command strip, giant low-contrast wordmark | Footer/admin navigation can be dense only after the main content has established hierarchy |

## Visual system

### Palette

- Paper: `#f7f6f2`
- White surface: `#ffffff`
- Warm secondary surface: `#f0eee8`
- Ink: `#0c0b14`
- Muted ink: approximately `#666666`
- Cobalt/violet: `#2211ff`
- Night surface: approximately `#0a0a12`
- Green, amber, and red appear only as semantic state colors

The video contains a solid cobalt field and subtle tinted lighting/shadows around elevated product stages. It does not demonstrate multicolor neon gradients, particles, AI orbs, or ornamental glow effects.

### Typography

- Very large, tightly tracked, semibold sans-serif statements
- Italic editorial serif lines used as the emotional or explanatory second half of a heading
- Small uppercase or monospace eyebrows for numbers, stages, evidence, and metadata
- Body text is compact but not tiny; line length is controlled and surrounded by generous whitespace
- The product already has Inter, Newsreader, and Geist Mono, which can reproduce this hierarchy without a new font dependency

### Geometry and depth

- Floating desktop navigation with a large pill radius and a restrained tinted shadow
- Most content cards use 18-24px radii; marketing stages and closing panels use larger radii
- Thin warm-gray rules organize sections
- Product canvases use black or white, not translucent glass
- Shadows are tinted and broad, but remain restrained; they establish hierarchy rather than visual spectacle

### Layout rhythm

- Wide centered canvas with roughly 1200-1320px content limits
- Major sections use 88-140px vertical spacing
- Alternation between centered statements, split editorial/product layouts, compact grids, and full-width contrast bands
- Empty space is an active part of the composition
- Navigation remains visible while the page scrolls

## Motion evidence

Observed:

- Smooth continuous vertical scrolling
- Sticky/floating navigation that remains visually stable over changing sections
- Subtle entrance/reveal behavior as headings, cards, and product panels enter the viewport
- Short UI state transitions inside product demonstrations
- Section-to-section contrast transitions from paper to cobalt or night surfaces

Not demonstrated in the recording:

- Route/page transitions
- Hover behavior
- Mobile drawer animation
- Parallax strong enough to separate from the page scroll
- Loading screens
- Cursor-following effects

Implementation should therefore use restrained rise/fade/stagger motion, existing product interactions, and reduced-motion fallbacks. Strong parallax, looping decoration, or fabricated loading sequences would be invention rather than matching.

## Mapping to Smart Resume AI

| Product area | Reference pattern to use | Functional boundary |
| --- | --- | --- |
| Landing | Full narrative sequence: editorial hero, product stage, numbered workflow, evidence split, cobalt facts band, capability matrix, gallery, dark trust section, FAQ, closing band, night footer | Keep real engine results and real product-derived counts |
| Login / registration | Editorial split layout: concise statement beside one elevated form surface | Keep current authentication and validation unchanged |
| User dashboard | Editorial overview plus one primary readiness canvas, a small metric band, and curated next-action cards | Keep all real dashboard data and links |
| Resume Builder | Dark/white working canvas composition, strong step navigation, clear document/editor separation | Do not alter resume renderer, templates, A4 layout, or export behavior |
| ATS Analyzer | Reference analysis split: claim/evidence list beside a black or white scoring workbench | Do not alter deterministic scoring logic or API behavior |
| Job Discovery | Gallery/list hybrid with browser-like job frames, explicit filters, and one emphasized next action | Preserve providers, filters, saved jobs, and real results |
| Interview Preparation | Focused dark practice stage with paper setup/review panels | Preserve recording, prompts, session logic, and data |
| Skills Assessment | Capability grid for assessment directory; dark focused state for live examination | Preserve proctoring and assessment logic |
| Project Mentor | Project gallery mosaic and milestone workbench | Preserve generated roadmap and project data |
| Career Copilot | Existing docked/expanded/collapsed behavior; restyle as a compact product console with editorial spacing | Keep current API calls, context events, and message behavior |
| Profile / application history | Editorial record pages with grouped paper panels and a visible timeline | Preserve stored data and controls |
| Admin | Dense night/paper operations shell with compact tables and clear status color | Preserve permissions, routes, and data operations |

## Implementation stages

1. Shared foundation: scoped app-shell classes, typography, surfaces, buttons, fields, cards, sidebars, headers, and reduced-motion-aware reveals.
2. Landing completion: bring the existing evidence-backed page closer to the full reference sequence without replacing real data.
3. Auth and user dashboard: apply the editorial split and overview patterns.
4. Core workflows: builder shell, ATS/analyzer, jobs, interviews, skills, and projects.
5. Supporting and operations surfaces: profile/history, Career Copilot integration, admin, FAQ/legal/support pages.
6. Verification: TypeScript, lint, production build, public and authenticated journeys, major viewport captures, motion frames, reduced motion, console/hydration checks, and protected-file/hash verification.

## Protected scope

No stage may change:

- `src/server/services/deterministicAtsEngine.ts`
- `src/components/builder/templates/**`
- `src/components/builder/A4ResumeDocument.tsx`
- print/A4 CSS
- backend APIs, database behavior, authentication, or real-data sources solely for visual work

