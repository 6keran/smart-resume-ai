# SMART RESUME AI: MASTER PROMPT FOR ANY CODING AGENT
(Works for Antigravity AND DeepSeek. Same rules for both.)

Project folder: D:\projects\builder-github      Branch: staging      Written: 2026-11-15

You are an engineering agent working on an EXISTING project. Improve it. Do not rebuild it.
Read this whole file, then read AGENT_LOG.md, then do ONLY the next unfinished task.
If a rule here conflicts with a task, the rule wins: STOP and ask me.

---

## 0. PRODUCT PURPOSE (decides priority)

Smart Resume AI helps students, freshers and job seekers do one loop:
1. Choose a target job role and build a resume for it (12 templates, A4 PDF).
2. Check it with the ATS checker and analyzer (deterministic scores, honest feedback).
3. Improve it with AI (rewrites, tailoring to a job description) WITHOUT inventing facts.
4. Close skill gaps with a role-based roadmap: projects, certifications, courses.
5. Find jobs through the job portal (real sources only).
6. Prepare for interviews for the target role.
7. Ask one AI Assistant about resumes, jobs, interviews and careers.

Priority when choices conflict:
(1) data integrity, no fabrication  (2) security of user data  (3) ATS/analyzer accuracy
(4) resume builder + PDF reliability  (5) AI quality and grounding  (6) chatbot scope
(7) job portal honesty  (8) interview prep  (9) skills/proctoring/admin (maintenance only)  (10) visual polish.

Product direction: one "Career Intelligence" layer. Profile -> Career goal -> Skill gap -> Roadmap/Projects
-> Resume -> ATS -> Interview prep -> Jobs. All AI modules read the SAME student context.
FEATURE FREEZE: do not add new top-level modules. Skills assessment, proctoring and admin stay in
maintenance mode (fix bugs and security only). Do not delete any feature.

---

## 1. PROJECT FACTS

- Stack: Next.js 16.4.3 App Router, React 19, TypeScript, Tailwind v4. NOT Express.
  Logic lives in src/app/api routes and src/server/services. Edge gate: src/proxy.ts.
- Database: SQLite locally (node:sqlite), Neon PostgreSQL for staging/production.
  Postgres tables are NOT auto-created at runtime. Use scripts/init_postgres_schema.mjs and scripts/migrations/*.sql.
  SQLite calls are synchronous; Postgres calls are async. Every dual-DB call must be awaited.
- AI: Google Gemini, qualitative help only. Gemini NEVER creates or changes numeric ATS scores.
- ATS engine: src/server/services/deterministicAtsEngine.ts
  Current verified SHA256 = F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251 (764 lines).
  It changes ONLY under an approved ATS task; then record the new hash in AGENT_LOG.md.
- ATS weights are FIXED: Keyword 35, Content 25, Formatting 25, Section 15. Never change without my written approval.
- The 12 resume templates, A4/print CSS in globals.css, and A4ResumeDocument.tsx: DO NOT TOUCH unless the task names them.
- Application Assistant was removed on 2026-11-09. Do not restore or recreate it unless I say so.
- Already built (extend, never duplicate): unifiedStudentContext.ts, careerIntelligence.ts, careerActionEngine.ts,
  projectMentor.ts, roleProfiles.ts (9 curated roles), onboarding, /dashboard/my-data, goal roadmap, job suggestions autocomplete.
- Job providers (ALL KEPT, I decided to keep both API and scraping sources): Adzuna and Jooble (APIs); LinkedIn and Naukri (scraping,
  src/server/services/jobs/providers/). Never remove LinkedIn or Naukri without my explicit written approval.
- Known open problems: in-memory rate limiter (src/lib/rateLimit.ts) does not work on Vercel; anonymous ATS limit keyed on a
  client cookie; proctoring frames in an in-memory Map; public certificate verification is login-only; no CSP;
  Postgres migration for the career-path tables written but NOT run; remaining test failures are listed in AGENT_LOG.md.

---

## 2. HARD RULES (never, without my explicit written approval in this session)

1.  No git add / commit / push / merge / rebase / reset / stash / clean / restore / checkout over changes.
2.  No Vercel deploy. No migration or schema script against Neon or any remote DB. Never read or print .env or secrets.
3.  No deleting user data, databases or features. File deletion needs approval: list first.
4.  No installing, upgrading or removing dependencies. Do not edit package-lock.json. A new external API or new env key needs my approval.
5.  Never invent candidate data, skills, courses, certifications, job listings, URLs, metrics, reviews or statistics.
    If data is missing, show an empty state.
6.  Never claim a test passed unless you ran it and read the output. Skipped is not passed.
7.  Never weaken or delete a test to make it pass. If a test is stale, explain why and change only what is stale.
8.  No whole-file rewrites for small changes. No unrelated refactors.
9.  Tests use temporary SQLite sandboxes (data/test_sandboxes/) only. Never touch data/smart_resume.db.
10. Stop and ask when: a rule is unclear, a command touches anything remote, or the same failure happens twice.
11. Never delete, rename or rebuild .next, and never delete .next\dev\lock. If a lock/Turbopack error appears, STOP and tell me.
12. Never stop or kill a process you did not start in this session. Before stopping anything print PID, command line and parent. If it is not yours, ask me.
13. Only ONE agent may work on this folder at a time. Never run build/tests while my "npm run dev" is running (they share .next and corrupt it). If port 3000 is busy, STOP and ask me to stop it.
14. Fixing app code is out of scope unless the task says so. Report real bugs with file and line instead.
15. Never call a subset of tests "all tests". State exactly which suites ran and which did not.
16. AI prompts must never ask the model to invent facts about the candidate. Resume bullet suggestions must be built only from facts the user supplied or confirmed.

---

## 3. DESIGN RULES (any UI change)

Palette: white #FFFFFF, light bg #F6F7F9, charcoal #20242B, secondary text #626B78, royal blue #3157C8, border #E5E8ED. Light theme.
Avoid: purple gradients, glassmorphism/backdrop-blur, decorative blobs/mesh backgrounds, many pill buttons, emoji icons,
heavy shadows, fake stats/reviews/logos, vague AI marketing copy.
Type: body 14px in the app, headings semibold (not font-black), no readable text under 12px.
Keep every existing URL working (use redirects). Always add real empty, loading and error states.

---

## 4. WORKFLOW FOR EVERY TASK

1. Read AGENT_LOG.md. Run git status and record it. List the files you will change and why (read-only).
2. Plan: the smallest change that solves the problem. For tasks marked PLAN-FIRST, show the plan and STOP for "approved".
3. Change in batches of 1 to 5 files.
4. Verify after EVERY batch (section 5). Fix only what you broke.
5. Append an entry to AGENT_LOG.md (see section 7) and send the report (section 6).
6. STOP and wait for "approved". Never chain tasks.

---

## 5. VERIFICATION COMMANDS (run what is relevant, show real output)

Always: npx tsc --noEmit ; npm run lint
Only when my dev server is stopped: npm run build
Services: npm run test:security, test:phase1, test:gemini, test:career, test:jobs, test:validation, test:pipelines,
          test:spelling, test:workflow, test:proxy, test:templates
ATS: npx tsx scripts/test_deterministic_ats_scoring.mjs ; npx tsx scripts/audit_deterministic_ats_accuracy.mjs
Live HTTP suites: node scripts/run_live_e2e_isolated.mjs
Career path: npx tsx scripts/test_career_path_security.mjs ; node scripts/test_personalized_career_path.mjs
Resume: npx tsx scripts/test_resume_management_comprehensive.mjs ; node scripts/test_cross_user_resume_delete.mjs
Browser: npm run test:e2e:public ; npm test
Links: node scripts/verify_career_links.mjs
For each command report: command, exit code, passed/failed/skipped counts.

Timeouts: tsc/lint 3 min; build 6 min; single service tests 3 min; e2e:public 10 min; career-path browser test 10 min;
live isolated suites 20 min; full npm test 30 min; link check 5 min. One retry per command. Whole task: 60 min (T1: 90 min).

---

## 6. REPORT FORMAT (every task)

- Task name and what was done
- Files changed (path + one line)
- Commands run: exit code, passed/failed/skipped
- What passed / failed / skipped
- What is NOT verified
- Risks, and any rule that was close to being broken
- Proposed next step
Then STOP.

---

## 7. AGENT_LOG.md (shared memory between agents)

Keep a plain file AGENT_LOG.md in the project root (do not stage it). After each task append:
date/time | tool (Antigravity or DeepSeek) | task id | files changed | test results | open issues | next step.
When you start, read it so you do not repeat or contradict earlier work. If the disk disagrees with the log, trust the disk and say so.

---

## 8. TASK QUEUE (run in this order; one at a time; "approved" between tasks)

### PHASE A: VERIFY AND PROTECT
A1. VERIFY ROUND (read/report only). Dev server stopped by me. Run: git status; ATS engine hash; tsc; lint; build;
    run_live_e2e_isolated (run suites 6 and 7 separately if the runner stops early); career-path security and browser tests;
    templates; resume management; cross-user resume delete; ATS determinism; test:e2e:public; full npm test.
    Classify every failure: real app bug / stale test / environment. Do not fix app code.
A2. TEST ISOLATION (PLAN-FIRST). Playwright starts "next dev -p 3100" in the SAME .next folder as my dev server, and the harness
    scripts delete .next\dev\lock. This is the likely cause of the Turbopack cache panic. Propose a safe isolation:
    a separate distDir for tests (e.g. NEXT_DIST_DIR=.next-e2e read in next.config.ts), .gitignore entries, and replacing every
    "delete the lock" step with a clear failure message. Then implement after approval.
A3. STALE TESTS. Fix only stale tests (renamed dashboard copy, removed /apply-assistant route, admin users heading/URL, tablet
    overflow, reduced-motion). Project Mentor tests: check whether the test user has a target role (we removed the default) before
    blaming Gemini. Explain each change. Investigate the mobile-375 autocomplete "typed before hydration" failure: real UX bug or test timing?

### PHASE B: ACCURACY (the product's main promise)
B1. ATS ACCURACY (PLAN-FIRST, weights frozen, one fix at a time, before/after tables on synthetic fixtures AND a holdout set).
    - Detect sections by standalone headings, not substrings; real email/phone validation (remove /\+?\d{3}/).
    - Formatting pillar must measure real structure and must NOT reuse the section count.
    - Real metrics only (%, currency, units); ignore years/phones; count unique action verbs.
    - Fresher rule: projects + education + skills count as evidence; employment is NOT required; the strong fresher's Section score must not fall.
    - Anti-stuffing: skills not backed by project/experience bullets are discounted; stuffed fixtures never score above baseline.
    - JD parsing: required vs preferred, phrase extraction; remove "any capitalized word is a skill".
    - Domain fairness: also use the candidate's own Skills section; add non-software taxonomies; role-mismatch alert (no overall cap until I choose).
    - Keep the 7 determinism tests passing; record the new engine hash in AGENT_LOG.md.
B2. RESUME GAP ANALYZER (PLAN-FIRST). Build on B1 and roleProfiles.ts: for a resume + target role or job description return
    match %, matched skills, missing skills, and a suggested learning ORDER from curated data. Do NOT invent time estimates; show
    durations only when they come from a curated, verified source, otherwise omit. Deterministic first; Gemini only explains.

### PHASE C: SECURITY AND DATA SAFETY
C1. RATE LIMITING (PLAN-FIRST). Replace the in-memory limiter with a DB-backed one for SQLite + Postgres via the existing adapter.
    Show the SQL first; never run on Neon. Anonymous ATS limit keys on IP first, not only the sra_visitor_id cookie.
    Do not trust a client-supplied x-forwarded-for outside Vercel. Test: rotating the cookie does not reset the limit.
C2. PROCTORING (PLAN-FIRST). Frames live in an in-memory Map (broken on serverless). Compare options with trade-offs before coding.
    Add a payload size limit and data-URL check, fix the ownership check when session.user_id is empty, keep the consent flow, state retention.
C3. ENDPOINT HARDENING. Decide with me whether certificate verification is public (minimal fields, rate limited). CSP in report-only mode first.
    Remove debug logs that print auth details. Add in-handler auth checks to resume/improve, resume/tailor, jobs, nlp-search, suggestions.
    Report every caller of the synchronous verifyAdminToken (it skips the DB check on Postgres). Return 404 (not 403) for resources the user does not own;
    use crypto-random resource IDs for new records.
C4. DATABASE PARITY. Show me scripts/migrations/20261112_personalized_career_path.sql and the migrate_sqlite_to_postgres.mjs diff. Never run on Neon.
    Audit all dual-DB calls for a missing await. List which tables exist in Postgres init vs SQLite.

### PHASE D: CAREER INTELLIGENCE LAYER
D1. UNIFIED STUDENT CONTEXT (PLAN-FIRST). Audit unifiedStudentContext.ts: does ONE function (buildStudentContext) return name, education,
    confirmed/claimed/assessed/verified skills, projects, resume data, past ATS scores, saved jobs, assessment results and career goal?
    List every AI module (chatbot, project mentor, interview prep, resume improver, tailor, guidance) and whether it uses it. Report gaps;
    fix them after approval. Never expose another user's data; add isolation tests.
D2. PROMPT ARCHITECTURE (PLAN-FIRST). List every inline Gemini prompt in routes/services. Propose a central folder (src/server/prompts/) with
    one file per prompt (careerAssistant, interviewCoach, projectMentor, resumeAnalyzer, resumeImprover, careerRoadmap, jobMatcher), each exporting a
    typed builder. Move prompts with NO behavior change, add the anti-fabrication instruction (rule 16) to every one, keep grounding tests green.
D3. CHAT SESSION MEMORY (PLAN-FIRST). Check whether chat history is stored. If not, propose chat_sessions and chat_messages tables (SQLite + Postgres SQL,
    not run), per-user ownership, retention limit, "delete my chat history", export in My Data, and PII-safe logging. Show the API plan.
D4. CAREER ROADMAP ENGINE. Extend roleProfiles.ts-based roadmaps: goal -> skill gap -> ordered steps -> projects -> resume -> interview prep. Curated data only.
    Add roles carefully (each with verified links via scripts/verify_career_links.mjs). Label everything "Suggested".
D5. PROJECT COACH (PLAN-FIRST). Evolve Project Mentor: for current skills + target role + level output a project roadmap, folder structure, tech stack,
    milestones, git strategy, deployment plan, interview questions, and DRAFT resume bullets labelled "Draft: edit after you build it" (never claimed as
    achievements, never with invented metrics). With Gemini offline it must fall back to curated blueprints from roleProfiles.ts, never an empty page.
D6. CHATBOT SCOPE (PLAN-FIRST). Chatbot answers resume/job/interview/career questions using the student context; politely declines unrelated topics;
    says "I don't know" or asks instead of guessing; handles Gemini failure gracefully. Extend scripts/test_chat_assistant_grounding.mjs.
D7. ROLE-DRIVEN FLOW CHECK. Verify the target role reaches the builder, ATS check, job match, roadmap, interview prep and chatbot. Report every place that
    ignores the role or silently defaults.

### PHASE E: JOBS AND PRODUCTION READINESS
E1. JOB SOURCES (PLAN-FIRST). KEEP ALL EXISTING PROVIDERS. Existing: API providers Adzuna and Jooble; scraping providers LinkedIn
    (src/server/services/jobs/providers/linkedin.ts, public guest endpoints) and Naukri (providers/naukri.ts + naukriCooldown.ts).
    I have decided to keep BOTH API and scraping sources. DO NOT REMOVE the LinkedIn or Naukri providers.
    Your job is to make the multi-source search reliable and safe, not to delete sources:
    - Audit every provider: endpoint, auth, error handling, timeouts, cooldown, what happens when blocked (HTTP 403/429/999, CAPTCHA, empty HTML).
    - Put each provider behind its own on/off flag (env, default ON for APIs, ON for scraping providers but disableable instantly), plus a
      circuit breaker: after repeated failures a provider pauses and the search continues with the other providers. Persist the cooldown/breaker
      state in the DB (the current in-memory cooldown and in-memory cache reset on every Vercel serverless instance).
    - Scraping boundaries (hard limits): public pages only; no login, no cookies from real accounts, no fake accounts; NO CAPTCHA solving,
      NO proxy rotation or IP evasion, NO spoofing to bypass blocks. Respect a low request rate, short timeouts and caching. If a source blocks
      us, degrade gracefully and show an honest "source temporarily unavailable" message plus an external search link. Never fabricate listings.
    - Protect the server from abuse: /api/jobs/search must be rate limited per user and per IP (it must not become a free scraping proxy).
    - Show the source name on every listing, link out to the original posting, store only short-lived cached results, and do not republish
      full descriptions long term.
    - Add or keep API sources behind env keys only (RemoteOK, Wellfound, JSearch, official career pages are candidates). Any NEW API needs my approval
      (terms, key, cost) before you add it.
    - Tests with mocked provider responses: success, blocked, timeout, malformed HTML, cooldown, one provider down while others work.
    Report the known risks per provider (terms of service, blocking, breakage) so I can decide with full information.
E2. PRODUCTION READINESS. Env variable checklist (names only, no values), health endpoint, error logging without PII, backup plan for Neon,
    Postgres init and migration runbook, rollback notes, dependency audit (npm audit), build reproducibility. Report; change nothing without approval.

### PHASE F: CLEANUP AND UI
F1. CLEANUP (list first, delete only after approval): src/lib/mockData.ts (2,379 lines, no imports found), sampleResume.ts, companyData.ts,
    LandingPage.tsx (prove no imports), root report .md files, scripts/_manifest_dump.json, scripts/audit_results_dump.json.
    Replace SECURITY.md with a real policy. Keep README accurate.
F2. TYPOGRAPHY. Type scale in globals.css, smaller landing hero, no font-black headings, normalize text-[Npx] in small batches, remove the body mesh
    background. Never touch templates/print CSS. Before/after screenshots at 1366x768 and 390x844.
F3. UX SIMPLIFICATION. After Phase C. Navigation in 5 groups (Home, Resume, Check, Jobs, Grow) with redirects for all old URLs. Keep /ats-score public and
    anonymous; review proxy public-route rules before merging tools.
F4. STITCH REDESIGN. Implement approved Stitch screens one page at a time inside the existing code and Tailwind tokens; keep all logic. Replace every
    placeholder name/stat/logo with real data or an empty state.

Order: A1, A2, A3, B1, C1, C2, C3, C4, D1, D2, D3, B2, D4, D5, D6, D7, E1, E2, F1, F2, F3, F4.

---

## 9. WHEN SOMETHING IS WRONG

- Tool/network/API error or a failing plan: retry once, then stop and report. Never improvise a workaround that touches git, secrets, locks, processes or remote systems.
- If you cannot run a command or cannot see a file, say so. Do not pretend.
- If an earlier report (yours or another agent's) contradicts the files on disk, trust the disk and say so.
- Security problems outside the current task: report, do not silently fix.

---

## 10. START NOW

Read AGENT_LOG.md (create it if missing). Do task A1 only, unless AGENT_LOG.md shows A1 is complete, in which case do the next unfinished task.
Report using section 6, append to AGENT_LOG.md, then STOP.
