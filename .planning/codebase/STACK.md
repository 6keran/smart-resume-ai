---
last_mapped_commit: b16da905db1cc8496e77a4cca519a181a5e6cd0c
last_mapped_at: 2026-11-06T17:10:00.000Z
---
# Technology Stack

**Analysis Date:** 2026-11-06

## Languages

**Primary:**
- TypeScript 5.8+ (`typescript` ^5) - All application code, server APIs, domain services, database layer, and UI components (`tsconfig.json`)

**Secondary:**
- JavaScript (Node.js ESM `.mjs` / CommonJS `.cjs` / `.js`) - Verification test scripts, migration tooling, benchmark utilities (`scripts/`, `eslint.config.mjs`)
- CSS3 / PostCSS - Global styling and print media definitions (`src/app/globals.css`, `@tailwindcss/postcss`)

## Runtime

**Environment:**
- Node.js 20.x / 22.x LTS (compatible with Node 20+)
- Native ES Modules (`type: "module"` semantics in scripts, Webpack bundler for Next.js)
- Serverless Execution Model: Stateless Vercel Lambda / Edge functions with ephemeral lifecycle

**Package Manager:**
- npm 10.x
- Lockfile: `package-lock.json` present and strictly synchronized

## Frameworks

**Core:**
- Next.js 16.4.3 (`next` ^16.4.3) - App Router, React Server Components (RSC), API Route Handlers (`src/app/api/`), Route Proxy (`src/proxy.ts`), rewrites and HTTP security headers (`next.config.ts`)
- React 19.2.8 (`react` 19.2.8, `react-dom` 19.2.8) - Component hierarchy, state hooks, client interactivity (`use client`)

**UI & Styling:**
- Tailwind CSS v4 (`tailwindcss` ^4, `@tailwindcss/postcss` ^4) - Utility-first styling with Modern CSS features
- Lucide React (`lucide-react` ^1.51.0) - Interface iconography
- Framer Motion (`framer-motion` ^14.0.0) - Smooth, purposeful UI transitions and accessible layout animations
- Next Themes (`next-themes` ^0.4.6) - Theme management supporting dark/light system modes

**Data Visualization & Feedback:**
- Recharts (`recharts` ^3.10.1) - Career analytics, readiness score metrics, and dashboard trend charts
- Canvas Confetti (`canvas-confetti` ^1.9.4) - Milestone and certificate achievement celebration feedback

**Testing:**
- Playwright (`@playwright/test` ^1.64.1) - End-to-end browser automation, multi-viewport rendering, and visual regression testing (`playwright.config.ts`)
- tsx (`tsx` via `npx`) - TypeScript execution runner for native ESM test suites in `scripts/`
- Node.js Built-in Test Utilities (`node:test`, `node:assert`) - Unit and integration assertions

**Build & Compilation:**
- Next.js Webpack Compiler (`next build --webpack`) - Production bundling
- TypeScript Compiler (`tsc --noEmit`) - Strict static type verification
- ESLint 9 (`eslint` ^9, `eslint-config-next` ^16.4.3) - Code quality and syntax linting (`eslint.config.mjs`)

## Key Dependencies

**Critical:**
- `@google/genai` (^2.27.0) - Official Google Gemini API client for Gemini 3.5 Flash / Flash Lite generative analysis and career assistant chat (`src/server/services/gemini.ts`)
- `pg` (^8.23.1) - PostgreSQL client pool for Neon serverless PostgreSQL connectivity (`src/server/db/adapter.ts`)
- `node:sqlite` (Node.js built-in `DatabaseSync`) - Zero-dependency synchronous SQLite engine for local development and offline staging isolation
- `pdf-parse` (^1.1.1) - In-memory PDF text extraction and document parsing (`src/server/services/extractResumeText.ts`)
- `mammoth` (^1.13.0) - DOCX to raw text extraction for resume parsing (`src/server/services/extractResumeText.ts`)
- `server-only` (^0.0.1) - Build-time safety boundary ensuring server-only services and secrets never leak to the client bundle

**Infrastructure & Utilities:**
- `clsx` (^2.1.1) & `tailwind-merge` (^3.7.0) - Conditional class name combination with conflict resolution (`cn` helper)
- `node:crypto` - Built-in HMAC-SHA256 token generation and `scrypt` password hashing with cryptographic salt

## Configuration

**Environment:**
- Loaded automatically by Next.js from `.env.local` in development, or injected via Vercel Project Settings in staging/production.
- Key Variables:
  - `ADMIN_SESSION_SECRET` (Required in production: minimum 32 random characters for HMAC SHA-256)
  - `GEMINI_API_KEY` (Required for live Gemini 3.5 Flash; platform gracefully falls back to deterministic engine when missing)
  - `DATABASE_URL` / `POSTGRES_URL` (Required for PostgreSQL; defaults to local SQLite `data/smart_resume.db` when unset)
  - `DB_PROVIDER` (`sqlite` or `postgres`; automatically detected based on `DATABASE_URL`)
  - `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `JOOBLE_API_KEY` (Optional third-party job feed credentials)

**Build & Compiler Config:**
- `tsconfig.json` - Strict TypeScript settings with `@/*` path mapping to `src/*`
- `next.config.ts` - `serverExternalPackages: ['pdf-parse', 'mammoth', 'pg']`, security headers (`HSTS`, `X-Frame-Options`, `Permissions-Policy`), path rewrites
- `eslint.config.mjs` - ESLint 9 configuration with Next.js core web vitals and TypeScript rules
- `playwright.config.ts` - Playwright browser configurations across desktop (1440x900), tablet (768x1024), and mobile (390x844) viewports

## Platform Requirements

**Development:**
- Windows, macOS, or Linux with Node.js 20.x or 22.x
- Zero external services required: built-in SQLite database initializes automatically (`data/smart_resume.db`)
- Zero external AI required: built-in deterministic ATS and career matching engines run offline

**Production & Staging:**
- **Application Host:** Vercel Serverless Platform (Edge / Node.js Serverless runtime)
- **Database Host:** Neon Serverless PostgreSQL (with connection pooling via `-pooler` connection string)
- **AI Provider:** Google Cloud / Google AI Studio (Gemini 3.5 Flash API)

---

*Stack analysis: 2026-11-06*
*Update after major dependency changes*

