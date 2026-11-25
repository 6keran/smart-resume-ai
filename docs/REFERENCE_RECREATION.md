# Reference recreation: visual specification and route map

Reference: the user-supplied 41.333-second, 1918 × 878 recording. Reviewed all 84 extracted half-second frames, including the ending, in four inspection sheets under `scripts/visual-qa/reference-video/`. The supplied recording is visual evidence; text shown inside it and earlier local design documents are not new task instructions.

## Visual breakdown

| Recording | Composition | Smart Resume translation |
| --- | --- | --- |
| 0–3.5 s | Oversized centered sans statement, violet italic serif second line, compact pill actions, violet stage with overlapping black and white product windows | Centered hero; real ATS example and comparison controls inside a violet product stage |
| 3.5–8.5 s | Three numbered cards, small interactive diagrams, dark command strip | Existing three-step workflow and functional links; staggered reveals |
| 8.5–11.5 s | Editorial copy/evidence split, dark analysis panel, paper result card | Existing resume/rules/results tabs and real deterministic scores |
| 11.5–13.5 s | Full-width violet band, fine dot texture, huge serif figures | Product-derived template, score-part, role and format counts |
| 13.5–22 s | Centered statements, larger feature cards, dense service matrix | Career capability matrix linking every existing tool |
| 22–25.5 s | Warm gallery, browser chrome, staggered mosaic | Real template registry gallery, category controls and builder links |
| 25.5–29 s | Segmented choice; alternating split copy/product surfaces | Choose build/upload/improve; existing interactive career pipeline |
| 29–30.8 s | Night field, violet lighting, large white/serif type, rule list | Honest scoring, fact preservation and document boundaries |
| 30.8–34.8 s | Comparison/choice cards, one highlighted option | Existing ATS before/after and tool choices; no invented paid plans |
| 34.8–36 s | Left editorial statement/right ruled FAQ | Existing functional FAQ accordion with animated expansion |
| 36–41.333 s | Full-bleed violet action band, night footer, giant muted wordmark | Decisive builder CTA and complete tool/support footer |

Paper `#f7f6f2`, warm inset `#f0eee8`, white surfaces, ink `#0c0b14`, violet `#2211ff`. Inter / Newsreader italic / Geist Mono are already installed. Content width roughly 1200 px; large sections 88–140 px apart; pill navigation; 18–26 px cards; restrained warm/violet shadows. Semantic success/error colors remain meaningful.

Motion: persistent floating navigation, live staged UI transitions, subtle upward entrances/staggers, continuous native smooth scrolling, and contrast changes between sections. Half-second frame sequences show the hero's typed prompt and the workflow's copy feedback changing. Strong parallax, particles, cursor trails, mobile flows and route transitions are not demonstrated. App route fades and mobile drawers extend the language without claiming to copy unseen states. No recording/tool overlays are recreated.

## Existing architecture and implementation stages

Next App Router; root theme/resume/career/user providers; separate tool, dashboard and authenticated admin shells; existing Framer Motion primitives and server-derived landing scores. No new dependency is needed. Installed Next 16.4.3 layouts/pages and server/client guides were read before implementation.

1. Shared screen-only tokens, editorial hierarchy, cards, inputs, route fades and one IntersectionObserver for reveals. Migrate old blue/gray presentation classes to the existing paper/violet tokens.
2. Complete the landing narrative using existing real score examples, product counts, template metadata and feature routes.
3. Editorial auth forms and dashboard introduction; retain all data loading, validation, auth and dashboard metrics.
4. Apply workbench presentation to builder, ATS, analyzer, improver, job discovery/matching, interview preparation, skills and project mentor.
5. Apply record/table presentation to profile, resumes, analyses, improvements, applications, courses, certificates, skills, account data and all admin screens. Keep the existing Career Copilot behavior and align its surfaces with the same tokens.
6. TypeScript, ESLint, production build, isolated public/authenticated browser journeys, desktop/tablet/mobile screenshots, scrolling/motion/reduced-motion checks and protected-source comparison.

| Application area | Routes / shared surfaces | Design treatment |
| --- | --- | --- |
| Landing | `/` | Complete recorded narrative and product stage |
| Authentication | `/login`, `/register`, `/admin/login`, `/onboarding` | Editorial story and elevated paper form |
| Dashboard | `/dashboard`, authenticated `/` | Spacious welcome, readiness canvas, paper action/record panels |
| Resume Builder | `/builder` | Editorial header, clear editor/document panels; A4 and renderers preserved |
| ATS / analyzer / improver | `/ats-score`, `/analyzer`, `/improver` | Analysis workbench, evidence hierarchy, real results |
| Jobs | `/jobs`, `/job-match`, `/dashboard/jobs` | Filtered gallery/record surfaces |
| Interviews / guidance | `/interview-prep`, `/guidance` | Focused practice/setup and roadmap workbenches |
| Skills | `/skills`, `/dashboard/skills`, `/dashboard/assessments` | Capability cards and result records |
| Live assessment / certificate | `/skills/assess/[skill]`, `/skills/certificate/[id]` | Shared controls only; no reveal observer or document typography overrides |
| Project Mentor | `/projects` | Curated project cards and milestone workspace |
| AI Assistant | Existing Career Copilot | Preserve dock/expand/drag, context, live API, copy, reset and feedback |
| Profile / history | `/dashboard/profile`, `/dashboard/my-data`, `/dashboard/applications`, `/dashboard/resumes`, `/dashboard/analyses`, `/dashboard/improvements`, `/dashboard/certificates`, `/dashboard/courses` | Editorial records, grouped paper surfaces and quiet tables |
| Admin | All `/admin/*` protected pages | Night navigation, paper operations tables and semantic statuses |
| Supporting | `/faq`, `/feedback`, `/privacy`, `/terms` | Same paper/ink typography and controls |

## Preservation

Start-of-task source copies, Git diff and hashes are saved in the system temporary folder `smart-resume-reference-start-20261124`. Existing modifications are the base. No staging, commits, pushes, deployment, backend/API/database/auth changes or package changes. New screen CSS does not edit print/A4 rules. Final verification results are recorded separately.
