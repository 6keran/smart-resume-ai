# TASK LANDING-1: NEW LANDING PAGE (structure and feel inspired by a reference page)

Read first, in this order: AGENTS.md, MASTER_PROMPT.md (all rules stay in force), AGENT_LOG.md, docs/DESIGN.md.
Scope: ONLY the public landing page at "/" and its components. Do not restyle or change any other page, route, API, service,
database code, resume template, A4/print CSS or the ATS engine. No new dependencies. No git changes. One agent only; my dev
server must be stopped before any build, test or screenshot run (ask me if port 3000 is busy). Never kill processes or delete
.next or its lock.

---

## REFERENCE AND WHAT TO TAKE FROM IT

Reference: https://antideploy.com/ (a different product: a deployment platform). Use it ONLY as inspiration for page structure,
rhythm and tone. Do NOT copy its text, headings, images, logos, icons, illustrations, code or brand. Do not mention the reference
site anywhere in the product. All copy below is original and based on real Smart Resume AI facts.

What to take (the pattern, not the content):
- Calm editorial layout on a warm off-white canvas, generous whitespace, one accent color.
- Headings where the second half is set in italic (for example plain first half, italic second half).
- Numbered section labels (01, 02, ...) above section headings.
- Hero with one short sentence, two buttons, and a product demo drawn in the page beside it.
- A three-step "how it works" with a visual per step.
- A "it reads your input" section that shows evidence (sample text next to a parsed result).
- A row of real numbers.
- A grid of capability cards (bento style) where each card shows a tiny piece of real UI.
- A tabbed "three ways in" section.
- An honest "Here's where it stops" section listing real limitations.
- FAQ accordion, final call to action, rich footer.
- A skip-to-content link, sticky header with grouped navigation, restrained scroll reveal animations.

---

## DESIGN RULES FOR THIS PAGE

- Use the tokens in docs/DESIGN.md. Landing-only addition: canvas color `--color-bg-landing: #F7F6F2` (warm off-white) for the page and
  alternate section bands in #ffffff. Everything else (text colors, accent, radius, focus ring, type scale) comes from DESIGN.md.
  If I later paste an extracted design file for the reference page, adjust the landing tokens from it, but never use its fonts if they are proprietary.
- Fonts: Inter via the existing next/font setup. Display size max 56px, section titles 36px max, body 16-18px.
- No gradients, glassmorphism, blur, dark panels, decorative blobs, emoji icons, stock photos of people, heavy shadows.
- Italic accent on the second half of each section heading: use the same font in italic style (no second font), same color or secondary text color.
- Motion: reveal on scroll (opacity and 8px translate, 200ms) and tab/accordion transitions only; disable with prefers-reduced-motion.
- Fully responsive (390, 768, 1366, 1440), no horizontal scroll, 44px touch targets on mobile, keyboard accessible, contrast per DESIGN.md.
- Images: none required. Draw product visuals with real components and CSS. If screenshots are used, they must be real screenshots of this app
  (captured with Playwright from a temporary SQLite sandbox account) of synthetic data labelled "Example data". No invented people or companies.

NO FAKE CONTENT: no customer logos, testimonials, ratings, user counts, press mentions, prices or invented statistics. Only the facts below.

---

## REAL FACTS YOU MAY USE (verify against the code before using; if one is wrong, tell me)

- 12 resume templates with A4 PDF export (selectable text).
- ATS score = 4 parts: keywords 35%, content 25%, formatting 25%, sections 15%. The score is calculated by fixed rules, so the same resume gives
  the same score. AI writes suggestions only and does not set the number.
- Upload formats: PDF, DOCX, images, or pasted text (10 MB limit). Uploaded files are processed in memory and not stored.
- An anonymous ATS check is available without an account, with a limited number of scans.
- 9 curated role roadmaps today (Software Engineer, Data Analyst, Mechanical Engineer, Electrical Engineer, Civil Engineer, Digital Marketing
  Specialist, Financial Analyst, HR Generalist, UI/UX Designer) with suggested projects, certifications and courses.
- AI rewriting is designed to keep your facts; you review every suggestion.
- Skills assessments are proctored multiple-choice tests with verifiable certificates.
- Job search combines several sources and may show a message when a source is temporarily unavailable; you apply on the employer's site; applications are tracked manually.
- My Career Data lets you view, export and delete the data the platform stores about you.
- The AI Assistant answers resume, job, interview and career questions using your own saved data.

---

## PAGE STRUCTURE AND COPY (original; keep it plain and honest)

Header (sticky): logo, navigation with grouped dropdown "Product" (Build: Resume builder, Templates; Check: ATS score, Analyzer, Improver; Grow: Jobs,
Roadmap, Skills, Interview prep, Assistant), FAQ, Sign in, button "Create your resume". Mobile: drawer.

HERO
- Kicker: "Resume builder and ATS checker for students and job seekers"
- H1: "Build a resume for the job you want. *Know how it will be read.*"
- Sub: "Pick a target role, build or upload your resume, and get a repeatable ATS score with a clear breakdown. AI suggests improvements and never invents facts about you."
- Buttons: "Create your resume" (primary), "Check your ATS score" (secondary). Small note: "The ATS check works without an account (limited scans)."
- Right side demo (drawn with components, labelled "Example data"): a small A4 resume for "Example Candidate" and beside it the four score bars with numbers.
  Optional gentle auto-switch between two example states; pausable; no autoplay under reduced motion.
- Row "Bring what you already have": PDF, DOCX, Image, Paste text (as small labelled chips).

01 HOW IT WORKS: "Three steps *from role to ready.*"
 1 "Choose your target role" (show a role selector with 3 of the 9 roles); 2 "Build or upload your resume" (show template picker and upload chip);
 3 "Check, improve and apply" (show score bars and an accept/reject suggestion row). After the steps: "Each later change is just edit, re-check, export."

02 SCORED BY RULES: "It reads your resume. *It does not guess.*"
 Three bullets: "Checked, not guessed: the same resume always gets the same score, and the breakdown tells you why." / "Problems before you apply: missing sections and
 keywords are flagged with the part of the score they affect." / "Your facts stay yours: suggestions never add skills, employers or numbers you did not provide."
 Evidence panel with tabs (Resume text / Result): sample text of "Example Candidate" on the left tab, the parsed sections, detected keywords and four sub-scores on the right tab.

03 REAL NUMBERS: "What is in *the product today.*" Four numbers: 12 templates; 4 score parts; 9 role roadmaps; 3 upload formats. Caption: "Counts from the current product."

04 WHAT YOU GET: "Everything between *role and offer.*" Bento grid (each card: title, one sentence, a tiny real-UI visual, link):
 Resume builder / ATS checker / AI improver / Job match and search / Role roadmap and projects / Skills assessments and certificates /
 Interview preparation / AI Assistant / Your data (view, export, delete).

05 TEMPLATES: "Twelve layouts, *one clean export.*" Horizontal gallery of 6 existing template components rendered with synthetic "Example Candidate" data (read-only,
 do not modify templates), label "Example data", link "See all templates".

06 THREE WAYS IN: "However you *start.*" Tabs: Upload your resume (check it first, then improve) / Start from scratch (guided builder) / Start from a role (roadmap, skills, projects).
 Each tab: short text, three bullets, one button.

07 INSIDE THE PRODUCT: "The actual screens, *not a mockup.*" Two real screenshots (builder and ATS result) from the app with synthetic data, or leave a clearly marked
 placeholder component if screenshots are not captured yet. Captions only.

08 WHERE IT STOPS: "Here is *where it stops.*" Numbered honest limits (real): 1 "The ATS score is guidance, not a guarantee of how any employer's system reads your resume."
 2 "Job results come from several sources; some may be temporarily unavailable." 3 "Role roadmaps cover 9 roles today; other roles get general guidance."
 4 "Skills tests are multiple-choice." 5 "AI suggestions need your review before you use them." 6 "The assistant answers career topics only."

09 QUESTIONS: "Asked, *answered plainly.*" Accordion, 6 items: Do I need an account for the ATS check? / Will the AI make up experience? / Which files can I upload? /
 Is my resume stored? / Which roles do you cover? / Does it apply to jobs for me? (No. You apply yourself; the tracker keeps your list.) Answers must match the facts above.

FINAL CTA: "Start with your *next application.*" Buttons: "Create your resume", "Check your ATS score". Note: "No payment step. No card."  (Only keep this line if the product truly has no payments; verify in code.)

FOOTER: product links (Resume builder, ATS score, Analyzer, Jobs, FAQ), legal (Privacy, Terms), team/project line from the docs if I provide it. No social icons unless real accounts exist. "All systems operational" style status lines are NOT allowed (no status page exists).

SEO and metadata: page title and meta description in plain original words; one H1; landmarks (header, main, footer); OG tags only if an image is provided later.

---

## IMPLEMENTATION RULES

- Replace the content of src/components/landing/ProfessionalLandingPage.tsx by composing small section components in src/components/landing/sections/ (Hero, HowItWorks,
  ScoredByRules, Numbers, Capabilities, TemplatesGallery, ThreeWays, ProductScreens, Limits, Faq, FinalCta, Footer). Keep src/app/page.tsx importing the same entry component.
  Keep the existing orphan LandingPage.tsx untouched (cleanup is a separate task).
- Use shared UI components from src/components/ui when they exist; otherwise add only the landing-specific pieces locally.
- Interactive pieces (tabs, accordion, hero demo, mobile menu) must be accessible (roles, aria-selected, aria-expanded, keyboard arrows, Escape) and work without layout shift.
- Every link must point to a real, working route. No dead buttons, no "#" links.
- Update e2e specs that assert landing copy (landing.spec, public-routes, responsive-navigation) ONLY for intentional copy changes, and explain each change.

---

## WORKFLOW AND GATES

1. PLAN FIRST (STOP for my "approved"): list files to create or change, section by section mapping to components, which real facts each section uses and where you verified them,
   the landing tokens you will add, and any fact you could not verify.
2. Implement in batches: (a) tokens, header, hero; (b) sections 01-03; (c) sections 04-06; (d) sections 07-09, final CTA, footer. After each batch run npx tsc --noEmit and npm run lint,
   capture screenshots at 1366x768 and 390x844 (full page) to scripts/visual-qa/landing/ (do not commit), and STOP for review.
3. After the last batch (dev server stopped): npm run build, npm run test:e2e:public, test:templates; confirm the SHA256 of deterministicAtsEngine.ts is unchanged and
   git diff shows no changes in templates, A4/print CSS, API routes or services.
4. Report: files changed, commands with exit codes and counts, screenshot paths, facts used and how verified, what is NOT verified, risks. Append to AGENT_LOG.md and STOP.

START: do step 1 only (the plan), no code changes.
