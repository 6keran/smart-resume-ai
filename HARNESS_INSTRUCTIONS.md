# SMART RESUME AI: AUTOMATION TASK INSTRUCTIONS

Project folder: D:\projects\builder-github
Branch: staging
Written: 2026-11-14

You are an engineering agent working on an EXISTING project. Improve it. Do not rebuild it.
Read this whole file before doing anything. If a rule here conflicts with a task, the rule wins: STOP and ask me.

---

## 0. PRODUCT PURPOSE (decides priority in every task)

Smart Resume AI helps users (students, freshers, job seekers) do this core loop:

1. Choose a target job role and build a resume for that role (12 templates, A4 PDF export).
2. Check it with the ATS checker and the analyzer (deterministic scores, honest feedback).
3. Improve it with AI (rewrites, tailoring to a job description) WITHOUT inventing facts.
4. Improve skills through role-based roadmaps: suggested projects, certifications, courses.
5. Find jobs through the job portal (real sources only; no fake listings).
6. Prepare for interviews for the target role.
7. Ask one AI Assistant chatbot anything about resumes, jobs and careers.

Priority order when choices conflict:
(1) data integrity and no fabrication, (2) ATS and analyzer accuracy, (3) resume builder and PDF reliability,
(4) AI improvement quality, (5) chatbot scope and grounding, (6) job portal honesty, (7) interview prep,
(8) skills assessment and proctoring, (9) visual polish.

The target role must drive resume content, scoring context, job matching, roadmap and interview questions.
If the role is not set, show "Goal not set" and ask. Never default to a software role.

Chatbot rules: answer resume, job, interview and career questions; use only the user's saved data and curated
sources; say "I don't know" or ask instead of guessing; decline unrelated topics briefly; never produce fake
achievements, employers, metrics or links.

Not in scope: automatic job applications. The Application Assistant was removed on 2026-11-09. Do not restore or
recreate it unless I say so.

---

## 1. PROJECT FACTS

- Stack: Next.js 16.4.3 App Router, React 19, TypeScript, Tailwind v4. NOT an Express app.
  Logic lives in src/app/api routes and src/server/services.
- Database: SQLite locally (node:sqlite), Neon PostgreSQL for staging and production.
  Postgres tables are NOT auto-created at runtime. scripts/init_postgres_schema.mjs and scripts/migrations/*.sql are used.
- AI: Google Gemini, qualitative suggestions ONLY. Gemini must never create or change numeric ATS scores.
- ATS engine: src/server/services/deterministicAtsEngine.ts
  Verified: 764 lines, 33,094 bytes,
  SHA256 = F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251
  If the hash changes without a task that allows it, report it immediately.
- ATS weights are FIXED: Keyword 35, Content 25, Formatting 25, Section 15.
  Never change them without my written approval.
- The 12 resume templates, the A4 / print CSS in globals.css, and A4ResumeDocument.tsx:
  DO NOT TOUCH unless the task names them.
- Dev server: I run "npm run dev" on port 3000 myself. NEVER kill processes.
  If .next\dev\lock blocks a command, STOP and ask me to stop the dev server.
- Git state is messy: 65+ staged files, many unstaged, some untracked
  (including deterministicAtsEngine.ts). Do not "clean" it.

---

## 2. HARD RULES (never, without my explicit written approval in this session)

1. Do not stage, commit, push, merge, rebase, reset, stash, clean, or checkout over changes.
   No git add / commit / push / reset / clean / restore / stash.
2. Do not deploy to Vercel. Do not run any migration or schema script against Neon or any remote database.
   Never read or print .env files or secret values.
3. Do not delete user data, databases, or existing features. Deleting files needs approval: list them first.
4. Do not install, upgrade or remove dependencies. Do not edit package-lock.json.
5. Never invent candidate data, skills, courses, certifications, job listings, URLs, metrics, reviews or statistics.
   If data is missing, show an empty state.
6. Never claim a test passed unless you ran it and read the output. Skipped tests are not passes.
   Report failures exactly.
7. Do not weaken or delete a test to make it pass. If a test is stale, explain why and change only what is stale.
8. Do not rewrite whole files for small changes. Do not refactor unrelated code.
9. Use only temporary SQLite sandboxes (data/test_sandboxes/) for tests. Never touch data/smart_resume.db.
10. Stop and ask when: a rule is unclear, a command would touch anything remote, the same test fails twice
    for the same reason, or you are unsure.

---

## 3. DESIGN RULES (for any UI change)

Palette: white #FFFFFF, light background #F6F7F9, charcoal #20242B, secondary text #626B78,
royal blue #3157C8, borders #E5E8ED.

Avoid: purple gradients, glassmorphism or backdrop-blur, decorative blobs or mesh backgrounds, excessive pill
buttons, emoji icons, heavy glows or shadows, fake stats, fake reviews, vague AI marketing copy.

Typography: body 14px in app pages, headings semibold (not font-black), no readable text below 12px.

Keep every existing URL working (add redirects instead of removing routes).

---

## 4. WORKFLOW FOR EVERY TASK

1. Read: list the files you will change and why (read-only). Run git status and record it.
2. Plan: write the smallest change that solves the problem.
3. Change: 1 to 5 files per batch.
4. Verify after EVERY batch (section 5). Fix only what you broke.
5. Report using the format in section 6.
6. STOP and wait for my message "approved" before the next batch. Do not chain batches.

---

## 5. VERIFICATION COMMANDS (run what is relevant, show real output)

Always:
- npx tsc --noEmit
- npm run lint

When the dev server is stopped:
- npm run build

Service suites:
- npm run test:security, test:phase1, test:gemini, test:career, test:jobs, test:validation,
  test:pipelines, test:spelling, test:workflow, test:proxy, test:templates

ATS:
- npx tsx scripts/test_deterministic_ats_scoring.mjs
- npx tsx scripts/audit_deterministic_ats_accuracy.mjs

HTTP suites (need a server):
- node scripts/run_live_e2e_isolated.mjs

Career path:
- npx tsx scripts/test_career_path_security.mjs
- node scripts/test_personalized_career_path.mjs

Browser:
- npm run test:e2e:public
- npm test

Links:
- node scripts/verify_career_links.mjs

For each command report: the command, exit code, and passed / failed / skipped counts.

---

## 6. REPORT FORMAT (every batch)

- Task and batch name
- Files changed (path and one line each)
- Commands run with exit code and counts
- What passed / what failed / what was skipped
- What is NOT verified
- Risks, and any rule that was close to being broken
- Proposed next batch

Then STOP.

---

## 7. TASK QUEUE (one task at a time; wait for my "approved" between tasks)

T1. VERIFY ROUND. With the dev server stopped by me: run build, run_live_e2e_isolated, career-path security and E2E
    tests, test:e2e:public, full npm test, and the ATS determinism tests. Fix ONLY stale tests (renamed dashboard
    copy, removed /apply-assistant route, admin users heading/URL assertion, tablet overflow, theme reduced-motion
    expectation). Explain each test change. Real app bugs: report with file and line, do not fix.

T5. ATS ACCURACY (weights frozen). Plan first, wait for "approved" before coding.
    - Section detection by standalone headings; real email and phone validation.
    - Formatting pillar must not double count sections.
    - Real metrics only (%, currency, units); ignore years and phone numbers; count unique action verbs.
    - Fresher rule: projects + education + skills count as evidence; employment is NOT required;
      strong fresher Section score must not drop to 67.
    - Anti-stuffing evidence discount: the keyword-stuffed fixture must never score higher than baseline.
    - JD parsing: required vs preferred, phrase extraction, no "any capitalized word is a skill".
    - Domain fairness: also use the candidate's own Skills section; add taxonomies beyond software.
    - Role-mismatch alert only (no overall cap until I choose).
    - One fix at a time, before/after tables on synthetic fixtures AND a holdout set.
    - Keep the 7 determinism tests passing.

T2. SECURITY A: RATE LIMITING. src/lib/rateLimit.ts is in-memory (does not work on Vercel serverless).
    Propose, then implement a DB-backed limiter for SQLite and Postgres through the existing adapter.
    Show the SQL first; do not run it on Neon. The anonymous ATS limit must key on IP first, not only the
    sra_visitor_id cookie. Add a test that rotating the cookie does not reset the limit.

T3. SECURITY B: PROCTORING. src/app/api/proctoring/frame and saveLiveStreamFrame keep frames in an in-memory Map
    (broken on serverless). Propose options with trade-offs BEFORE coding. Add a payload size limit and format
    check. Fix the ownership check when session.user_id is empty. Keep the consent flow.

T4. SECURITY C. Decide with me whether public certificate verification should be public. Add a
    Content-Security-Policy in report-only mode first. Remove debug logs that print auth details. Add in-handler
    auth checks to resume/improve, resume/tailor, jobs, nlp-search, suggestions. Check which callers use the
    synchronous verifyAdminToken (it skips the DB check on Postgres) and report them.

T10. ROLE-DRIVEN FLOW. Verify the target role reaches the builder, ATS check, job match, roadmap, interview prep
    and chatbot. Report every place that ignores the role or defaults silently. Plan first, wait for "approved".

T11. CHATBOT SCOPE AND GROUNDING. Audit CareerChatbot and its API: scope (resume, jobs, interviews, careers),
    grounding in the user's saved data, refusal of unrelated or fabricating requests, graceful Gemini failure.
    Extend scripts/test_chat_assistant_grounding.mjs. Plan first, wait for "approved".

T6. DATABASE SAFETY. Show me scripts/migrations/20261112_personalized_career_path.sql and the
    migrate_sqlite_to_postgres.mjs diff. Never run them on Neon. Audit all dual-database calls for a missing await
    (SQLite is synchronous, Postgres is async).

T7. CLEANUP (list first, delete only after approval): src/lib/mockData.ts, src/lib/sampleResume.ts,
    src/lib/career/companyData.ts, src/components/landing/LandingPage.tsx (prove no imports), root report markdown
    files, scripts/_manifest_dump.json, scripts/audit_results_dump.json. Rewrite README.md to match the real
    architecture. Replace SECURITY.md with a real vulnerability-reporting policy.

T8. TYPOGRAPHY. Define a type scale in globals.css, reduce the landing hero (max about 56px), replace font-black
    headings, normalize text-[Npx] values in small batches, remove the body mesh background image.
    Never touch templates or print CSS. Before/after screenshots at 1366x768 and 390x844.

T9. UX SIMPLIFICATION. Only after T1 to T4. Navigation into 5 groups (Home, Resume, Check, Jobs, Grow) with
    redirects for all old URLs. Keep /ats-score public and anonymous. Do not merge tools until the proxy
    public-route rules are reviewed.

Order to run them: T1, T5, T2, T3, T4, T10, T11, T6, T7, T8, T9.

---

## 8. WHEN SOMETHING IS WRONG

- Tool error, network error, or your own plan fails: retry once, then stop and report. Do not improvise a
  workaround that touches git, secrets or remote systems.
- If a past report of yours contradicts the files on disk, trust the disk and say so.
- If you find a security problem outside the current task, report it. Do not fix it silently.

---

## 9. START NOW

Do T1 only. Begin with: git status (record it), print the SHA256 and line count of deterministicAtsEngine.ts and
compare to section 1, then run the section 5 commands in order. Report using section 6, then STOP.



11. Never delete, rename or rebuild the .next folder while a dev server may be running. If a Turbopack cache panic or "lock" error appears, STOP and tell me; I will clear .next myself.