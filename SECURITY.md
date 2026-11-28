# Smart Resume AI

**Build a resume for the job you want. Know how it will be read.**

Smart Resume AI is a web platform that helps students, freshers and job seekers choose a target role, build a role-specific resume, check it with a repeatable ATS score, improve it with AI, close skill gaps, find jobs and prepare for interviews, with an AI Assistant that answers questions using the user's own saved data.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Status: active development. Some features are complete, some are in progress. See [Current status](#current-status) for an honest overview.

---

## Contents

- [Features](#features)
- [How the ATS score works](#how-the-ats-score-works)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Security and privacy](#security-and-privacy)
- [Current status](#current-status)
- [Contributing](#contributing)
- [Team](#team)
- [License](#license)

---

## Features

| Area | What it does |
|---|---|
| **Resume builder** | Multiple resumes per user, a guided step-by-step form, 17 A4 layouts, live preview, version history with restore, and PDF export with selectable text |
| **ATS checker and analyzer** | Repeatable score with a breakdown (keywords, content, formatting, sections), missing keywords and suggestions. A public ATS check works without an account (limited scans) |
| **Resume improver** | AI rewriting and tailoring to a job description, designed to preserve your facts; you accept, edit or reject every suggestion |
| **Job match and discovery** | Compare a resume with a role or job description; search several job sources; save jobs and track applications manually (the app never applies for you) |
| **Role roadmaps** | Curated roadmaps for nine roles with skill gaps, suggested projects and learning resources |
| **Skills assessments** | Timed multiple-choice assessments with optional camera proctoring and a skill status per user |
| **Project Mentor** | Guided portfolio projects with milestones and mentor hints |
| **Interview preparation** | Role-based questions, answers and feedback |
| **AI Assistant** | A chat assistant grounded in your profile, resume, skills and goals; it stays on career topics and says when data is missing |
| **My Career Data** | See, export and delete the data the platform stores about you |
| **Admin console** | User, question, assessment, proctoring and feedback management for administrators |
| **Learning discovery (in progress)** | Recommends external courses and certifications. Smart Resume AI does **not** issue, generate or verify certificates |

---

## How the ATS score works

The score is produced by fixed rules, not by a language model, so the same resume always gets the same score.

```
Overall = round(0.35 x Keywords + 0.25 x Content + 0.25 x Formatting + 0.15 x Sections)
```

- The generative AI (Google Gemini) writes suggestions and explanations only. It never sets or changes the number.
- Input text is normalized first (line endings, quotes, dashes, spacing), so formatting noise does not change the result.
- Regression tests check repeatability across runs, restarts and AI failures.

The score is guidance, not a guarantee of how any employer's system reads a resume. Accuracy work (heading-based section detection, domain-aware skills, evidence-based keyword scoring) is ongoing; see [Current status](#current-status).

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Database | SQLite (local development), PostgreSQL on Neon (staging and production) through one adapter |
| AI | Google Gemini via `@google/genai` |
| Document processing | `pdf-parse`, `mammoth` |
| Testing | Playwright, plus Node and `tsx` test scripts |
| Hosting | Vercel |

---

## Architecture

```
Browser (React UI)
      |  HTTPS + httpOnly session cookie
      v
Edge proxy (src/proxy.ts)   session and role checks, rate limits, security headers
      |
      v
Next.js route handlers (src/app/api)  ->  Services (src/server/services)
                                              |            |
                                              v            v
                                    DB adapter           External services
                                (SQLite / PostgreSQL)    (Gemini, job and course sources)
```

There is no separate backend server: the API lives in the Next.js app.

---

## Getting started

### Prerequisites

- Node.js 20.9 or newer (Node 22 recommended) and npm
- Git

### Install and run

```bash
git clone https://github.com/6keran/smart-resume-ai.git
cd smart-resume-ai
npm install
cp .env.example .env.local      # then edit .env.local (see below)
npm run dev
```

Open http://localhost:3000. In development the app creates a local SQLite database automatically; you do not need PostgreSQL to try it.

### Remote PostgreSQL (staging or production)

Tables are **not** created automatically on PostgreSQL. A schema script does it:

```bash
npm run db:init:postgres
```

The script has a safety gate and will refuse to run until you explicitly confirm the target. Read `scripts/init_postgres_schema.mjs` first, take a backup (for example a Neon branch) and never run it against a database you have not checked. Schema changes live in `scripts/migrations/`.

---

## Environment variables

Copy `.env.example` to `.env.local`. **Never commit real values.** The file lists the names; the most important ones are:

| Name | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (staging and production) |
| `ADMIN_SESSION_SECRET` | Secret used to sign sessions; at least 32 characters in production |
| `GEMINI_API_KEY` | Google Gemini API key. Without it, AI features fall back to deterministic answers where available |

Job and learning provider credentials, if used, are also environment variables.

---

## Testing

```bash
npx tsc --noEmit            # type check
npm run lint                # lint
npm run build               # production build
npm run test:e2e:public     # browser tests for public pages (Playwright)
npm test                    # full Playwright suite
```

Many service, security and workflow tests are Node scripts named in `package.json` (for example `npm run test:security`, `test:proxy`, `test:templates`, `test:career`, `test:jobs`). Some scripts need a running server; the live suite runner `scripts/run_live_e2e_isolated.mjs` starts an isolated one.

Rules for tests: use synthetic data only, use a fresh disposable database (never your real one), and do not run tests while `npm run dev` is using the same build folder.

---

## Project structure

```
src/
  app/            pages and API route handlers (App Router)
  components/     UI components, resume templates, landing sections
  context/        React contexts (resume, career, theme)
  lib/            shared helpers and curated data
  server/
    db/           database adapter and data access
    services/     ATS engine, text extraction, career intelligence, jobs, chat safety
    prompts/      AI prompt builders
  proxy.ts        edge proxy: authentication, authorization, rate limits
scripts/          tests, database scripts and migrations
e2e/              Playwright specifications
docs/             design system and project documents
```

---

## Security and privacy

- Passwords are hashed with scrypt and a per-user salt and compared in constant time.
- Sessions use signed tokens in httpOnly cookies (`secure` in production, `sameSite=lax`).
- Student requests are scoped to the signed-in user, with explicit ownership checks; admin routes are separate and role-protected.
- SQL is parameterised. Uploaded resumes are limited to 10 MB, checked by file signature, processed in memory and not stored.
- Camera frames from proctoring are not saved to the database.
- Users can export and delete their career data.

Found a vulnerability? Please read [SECURITY.md](SECURITY.md) and report it privately.

---

## Current status

Honest summary (details are in `docs/`):

- **Working:** resume builder and templates, ATS check and analyzer, improver, job match, role roadmaps, assistant, My Career Data, admin console.
- **In progress:** accuracy improvements to the ATS engine for non-software resumes and keyword stuffing; external course and certification discovery (offline foundation built, no live provider enabled); legacy internal certificate retirement.
- **Known limitations:** ATS scores are guidance only; some job sources are unofficial and may be unavailable; AI features depend on Gemini quota; rate limiting and live proctoring need hardening for serverless hosting; PDF export uses the browser print function.
- **Removed:** the Application Assistant module.

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md) first.

---

## Disclaimer

Smart Resume AI is an independent project. It is not affiliated with, endorsed by or sponsored by any course provider, job board or certification body mentioned in the app. All trademarks belong to their owners. The platform recommends external learning options and does not issue, generate or verify certificates.

---

## License

Released under the [MIT License](LICENSE).
