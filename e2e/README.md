# Playwright end-to-end tests

`npm run test:e2e` runs the complete Chromium suite at 375×812, 390×844, 768×1024, and 1440×900. `npm run test:e2e:public` runs public-route and responsive checks, and `npm run test:e2e:smoke` runs the desktop launch check.

Every run creates a uniquely named SQLite file under `test-results/db`, sets `DB_PROVIDER=sqlite`, clears PostgreSQL connection variables, and starts Next with `PLAYWRIGHT_TEST=1`. The database adapter refuses to start in test mode without the per-run path. The wrapper removes only that run's database, WAL/SHM files, and temporary browser auth state when Playwright exits. It never opens `data/smart_resume.db` or connects to PostgreSQL.

The global setup registers one test identity in that disposable database and stores its session state only in a temporary file. By default, the email and password are generated for that run. To set repeatable local values, provide both `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` in the shell. Those credentials are still registered only in the disposable SQLite database; use a dedicated test-only identity and do not commit the values.

Gemini is disabled in normal E2E runs. Chat and AI-backed workflows then use their real deterministic fallback implementations. To run the live Gemini browser checks, set `E2E_LIVE_GEMINI=1` and provide a key through `E2E_GEMINI_API_KEY` or the existing local Next environment (`GEMINI_API_KEY` / `GOOGLE_API_KEY` in `.env.local`), then run `npm run test:e2e -- e2e/gemini-live.spec.ts --project=desktop-1440x900`. The runner passes the key only to the local Next test server, never prints it, and records redacted provider model/status telemetry in `test-results/diagnostics`.

Screenshots and browser diagnostics are written under `test-results/screenshots` and `test-results/diagnostics`; Playwright traces, videos, failure screenshots, and the HTML report are under `test-results/playwright` and `test-results/report`. Workflow fixtures are labeled as test-only and exist only in the isolated database.
