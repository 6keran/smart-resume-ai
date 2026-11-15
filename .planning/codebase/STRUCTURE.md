---
last_mapped_commit: b16da905db1cc8496e77a4cca519a181a5e6cd0c
last_mapped_at: 2026-11-06T17:10:00.000Z
---
# Codebase Structure

**Analysis Date:** 2026-11-06

## Directory Layout

```
smart-resume-ai/
├── .planning/              # GSD project plans, architecture documents, codebase maps
│   └── codebase/          # Technology, architecture, and testing reference maps
├── e2e/                   # Playwright browser end-to-end test specifications
├── public/                # Static public assets (images, icons, robots.txt)
├── scripts/               # Production test harnesses, validation suites, and DB migrations
└── src/                   # Main application source code
    ├── app/               # Next.js 16 App Router pages, layouts, and API routes
    ├── components/        # Reusable React 19 UI and feature components
    ├── context/           # React context providers for client state
    ├── lib/               # Shared client/isomorphic utilities and helpers
    ├── server/            # Backend server-only code (DB, Auth, AI, Job services)
    └── types/             # TypeScript interfaces and domain type definitions
```

## Directory Purposes

**`src/app/`**
- **Purpose:** Next.js App Router routing tree containing page views, layouts, and REST API endpoints.
- **Contains:** `page.tsx`, `layout.tsx`, and `route.ts` files.
- **Key Files:**
  - `src/app/page.tsx`: Main landing page view.
  - `src/app/layout.tsx`: Root HTML shell with font configuration, theme provider, and global styles.
  - `src/app/dashboard/page.tsx`: Student career command center.
  - `src/app/builder/page.tsx`: Interactive resume builder studio.
  - `src/app/analyzer/page.tsx`: Real-time ATS resume analyzer.
  - `src/app/jobs/page.tsx`: Job discovery search and filtering hub.
  - `src/app/skills/page.tsx`: Skill assessment and verified certificate center.
  - `src/app/admin/page.tsx`: Administrator control panel.
- **Subdirectories:**
  - `api/`: REST API handlers (`api/auth/`, `api/career/`, `api/resumes/`, `api/jobs/`, `api/admin/`).
  - `dashboard/`: Dedicated sub-pages (`profile`, `resumes`, `skills`, `jobs`, `applications`, `courses`, `assessments`, `certificates`, `improvements`).

**`src/components/`**
- **Purpose:** Modular UI components split by domain and design system responsibility.
- **Contains:** TypeScript React JSX components (`.tsx`).
- **Subdirectories:**
  - `builder/`: Resume builder components, section forms, and `A4ResumeDocument.tsx` print layout.
  - `chat/`: Floating career mentor chatbot widget (`CareerChatbot.tsx`).
  - `dashboard/`: Dashboard metric cards, readiness charts, and activity feeds.
  - `jobs/`: Job cards, filter bars, and application modal.
  - `landing/`: Landing page showcase sections and hero components.
  - `layout/`: Global header, sidebar, navigation, and footer.
  - `theme/`: Theme selector dropdown and mode toggle.
  - `ui/`: Design system primitives (`Button.tsx`, `Input.tsx`, `GlassCard.tsx`, `MotionPrimitives.tsx`).

**`src/server/`**
- **Purpose:** Secure server-only backend code protected by `import 'server-only'`.
- **Contains:**
  - `auth/`: Administrator session management and credential verification (`adminSession.ts`).
  - `db/`: Database abstraction adapter (`adapter.ts`) and schema initialization/queries (`index.ts`).
  - `services/`: Business domain logic:
    - `gemini.ts`: Multi-tier Gemini API client and deterministic fallback engine.
    - `extractResumeText.ts`: In-memory PDF and DOCX file parser.
    - `careerActionEngine.ts`: Student career readiness score calculator.
    - `careerIntelligence.ts`: Career path recommendations and skill gap analysis.
    - `applicationAssistant.ts`: Cover letter generation and interview simulation.
    - `unifiedStudentContext.ts`: Consolidated student profile and history aggregator.
    - `jobs/`: Job search aggregation, deduplication (`dedupe.ts`), filtering (`filters.ts`), ranking (`ranking.ts`), cache (`cache.ts`), and provider adapters (`adzuna.ts`, `jooble.ts`, `linkedin.ts`, `naukri.ts`).

**`src/lib/`**
- **Purpose:** Isomorphic and client-side utilities.
- **Contains:** Session cookie validation (`sessionAuth.ts`), rate limiting (`rateLimit.ts`), style merging (`utils.ts`), job URL generation (`jobs/naukriSearchUrl.ts`), and string formatting.

**`src/types/`**
- **Purpose:** TypeScript contract definitions and domain data interfaces.
- **Contains:** `resume.ts`, `jobs.ts`, `career.ts`, `assessment.ts`, `student.ts`, `user.ts`.

**`scripts/`**
- **Purpose:** 54 curated verification test suites, database migrations, and benchmark scripts.
- **Key Files:**
  - `scripts/test_student_full_journey_e2e.mjs`: Complete 17-step end-to-end student journey verification.
  - `scripts/test_career_command_center.mjs`: 43-test Career Command Center integrity suite.
  - `scripts/test_staging_validation.mjs`: 13-workflow staging environment validation harness.
  - `scripts/init_postgres_schema.mjs`: Safe and idempotent PostgreSQL table creation.
  - `scripts/migrate_sqlite_to_postgres.mjs`: Zero-loss data migration pipeline from SQLite to Neon Postgres.

**`e2e/`**
- **Purpose:** Playwright browser test specifications.
- **Contains:** `smoke.spec.ts`, `landing.spec.ts`, `ats-analyzer.spec.ts`, `jobs.spec.ts`, `theme.spec.ts`, `responsive-navigation.spec.ts`.

## Key File Locations

**Entry Points:**
- `src/app/page.tsx` - Web landing page entry point
- `src/app/layout.tsx` - Root layout and global context wrapper
- `src/proxy.ts` - Edge routing security and rate limiting proxy

**Configuration:**
- `package.json` - Dependencies and test execution scripts
- `tsconfig.json` - Strict TypeScript compiler configuration
- `next.config.ts` - Next.js 16 build options, external packages, and HTTP security headers
- `playwright.config.ts` - Multi-browser and multi-viewport end-to-end testing matrix
- `.env.example` - Template for environment variables

**Database & Auth Core:**
- `src/server/db/adapter.ts` - Dual-engine database adapter (SQLite / PostgreSQL)
- `src/server/db/index.ts` - SQL queries, table schemas, and scrypt password hashing
- `src/server/auth/adminSession.ts` - Cryptographic HMAC-SHA256 session management

**Core AI & Document Logic:**
- `src/server/services/gemini.ts` - Google Gemini 3.5 Flash integration with deterministic fallback
- `src/server/services/extractResumeText.ts` - In-memory PDF / DOCX document extraction
- `src/components/builder/A4ResumeDocument.tsx` - Print-accurate A4 document layout engine

## Naming Conventions

**Files:**
- React Components: `PascalCase.tsx` (e.g. `CareerChatbot.tsx`, `A4ResumeDocument.tsx`, `GlassCard.tsx`)
- TypeScript Services & Utilities: `camelCase.ts` (e.g. `adapter.ts`, `gemini.ts`, `careerActionEngine.ts`)
- Next.js App Router: Reserved lower-case filenames (`page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`)
- Test Scripts: `test_snake_case.mjs` or `test_snake_case.js` in `scripts/`
- Playwright Specs: `kebab-case.spec.ts` in `e2e/`

**Directories:**
- Feature & Route Folders: `kebab-case` (e.g. `job-match/`, `apply-assistant/`, `interview-prep/`)
- Component Groupings: `kebab-case` or lowercase (e.g. `builder/`, `chat/`, `dashboard/`, `ui/`)

## Where to Add New Code

**New Student Feature:**
- View Page: `src/app/<feature-name>/page.tsx`
- Dashboard Integration: `src/app/dashboard/<feature-name>/page.tsx`
- Domain Logic: `src/server/services/<featureName>.ts`
- API Endpoint: `src/app/api/<feature-name>/route.ts`
- Types: `src/types/<feature-name>.ts`
- Tests: `scripts/test_<feature_name>_comprehensive.mjs` and Playwright spec in `e2e/`

**New UI Component:**
- Implementation: `src/components/ui/<ComponentName>.tsx` (if primitive) or `src/components/<feature>/<ComponentName>.tsx`
- Styling: Tailwind CSS utility classes following the royal blue/charcoal design system

**New Database Table / Query:**
- Schema Definition: `src/server/db/index.ts` (SQLite) and `scripts/init_postgres_schema.mjs` (PostgreSQL)
- Query Methods: In `src/server/db/index.ts` using `getDb().prepare(...)` with dual-dialect compatibility

---

*Structure analysis: 2026-11-06*
*Update when directory structure changes*

