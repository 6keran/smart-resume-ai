# Contributing to Smart Resume AI

Thank you for your interest in contributing. This guide explains how to propose changes, set up the project and what we expect from a pull request. By taking part you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Ways to contribute

- **Report a bug:** open an issue with steps to reproduce, what you expected, what happened, your browser and screen size, and screenshots if helpful.
- **Suggest a feature:** open an issue describing the problem it solves and who it helps. Please check the README's status section first.
- **Improve documentation:** fixes to the README, docs and comments are always welcome.
- **Fix an issue or add a feature:** comment on the issue first so work is not duplicated.
- **Security problems:** do **not** open a public issue. Follow [SECURITY.md](SECURITY.md).

## Development setup

Requirements: Node.js 20.9 or newer and npm.

```bash
git clone https://github.com/6keran/smart-resume-ai.git
cd smart-resume-ai
npm install
cp .env.example .env.local     # fill in only what you need; never commit it
npm run dev                    # http://localhost:3000
```

In development the app uses a local SQLite database created automatically. You do not need PostgreSQL or a Gemini key to work on most features; AI features fall back to deterministic behavior without a key.

## Branches and commits

- Create a branch from `main`: `feature/short-description`, `fix/short-description` or `docs/short-description`.
- Keep pull requests focused. One purpose per pull request.
- Write clear commit messages in the imperative mood. We suggest Conventional Commits: `feat: add ...`, `fix: handle ...`, `docs: update ...`, `test: cover ...`.

## Before you open a pull request

Run these locally and make sure they pass (and say so honestly in the pull request):

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run test:e2e:public
```

Also run the tests that relate to your change (for example `npm run test:security`, `test:templates`, `test:career`, `test:jobs`). Notes:

- Do **not** run builds or browser tests while `npm run dev` is running in the same folder; they share the `.next` build folder and can corrupt its cache.
- Tests must use **synthetic data** and a **fresh disposable database**. Never point tests at a real or shared database.
- Add or update tests for your change. A bug fix should include a test that fails without the fix.
- Never mark a test as passing if it was skipped, and never weaken a test just to make it pass.

## Project rules that matter

These come from the product's principles. Pull requests that break them will be asked to change.

1. **No fabricated data.** Never invent candidate facts, skills, courses, certifications, prices, ratings, job listings, testimonials or statistics. If data is missing, show an empty state.
2. **AI never sets the ATS score.** The score comes from the deterministic engine in `src/server/services/deterministicAtsEngine.ts`. Changes to its rules or weights need evidence (before and after results on synthetic test resumes, including freshers and non-software resumes) and maintainer approval.
3. **Preserve candidate facts in AI features.** Rewriting suggestions must not add skills, employers or numbers the user did not provide.
4. **No internal certificates.** The platform recommends external certifications and courses; it does not issue, generate or verify certificates.
5. **Users stay in control.** The app never applies to jobs on a user's behalf.
6. **Security and privacy first.** Every API checks authentication and ownership, validates input and avoids leaking data. Do not log secrets or personal data. Treat resume text, job descriptions and scraped content as untrusted input.
7. **Resume templates and print styles are sensitive.** Changes to templates, `A4ResumeDocument.tsx` or the A4/print CSS need before and after screenshots and the template tests.
8. **Third-party content.** Do not copy text, images, logos, fonts or code you do not have the right to use. Provider names appear as plain text only. Automated access to a website must respect its terms and `robots.txt`; do not add scraping of sites that forbid it.
9. **Database changes.** Provide idempotent SQL for both SQLite and PostgreSQL (`scripts/init_postgres_schema.mjs` and a file in `scripts/migrations/`), keep behaviour identical on both (SQLite calls are synchronous, PostgreSQL calls are asynchronous, so always `await`), update the account deletion routine and its test for any new user-linked table, and **never run a migration against a remote database in a pull request**.
10. **Dependencies.** Add a package only with a clear reason, an acceptable license and a quick check of its maintenance and size. Explain it in the pull request.

## Code style

- TypeScript, strict where possible; no `any` without a reason.
- Follow the existing structure: pages and routes in `src/app`, business logic in `src/server/services`, data access in `src/server/db`, prompts in `src/server/prompts`.
- Keep UI consistent with `docs/DESIGN.md`: reuse shared components and design tokens; no gradients, glow effects or decorative animation; all interactions must be keyboard accessible and respect reduced-motion settings.
- Write plain, honest copy.

## Pull request checklist

- [ ] The change is focused and described (what and why).
- [ ] Type check, lint, build and relevant tests pass locally (list what you ran).
- [ ] New or changed behavior has tests using synthetic data.
- [ ] No secrets, personal data, database files or build output are committed.
- [ ] Screenshots included for UI changes (mobile and desktop).
- [ ] Documentation updated where needed.
- [ ] The project rules above are respected.

## Using AI coding assistants

AI-assisted contributions are fine, but you are responsible for what you submit. Read and understand the code, run the checks yourself and follow `AGENTS.md` if present. Do not let an assistant commit secrets, delete files without review or claim tests passed that were not run.

## Review process

A maintainer will review your pull request as time allows (this is a student project, so please be patient). We may ask for changes. Once approved, a maintainer will merge it.

## Questions

Open a discussion or an issue and we will help where we can.
