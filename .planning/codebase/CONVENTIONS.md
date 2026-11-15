---
last_mapped_commit: b16da905db1cc8496e77a4cca519a181a5e6cd0c
last_mapped_at: 2026-11-06T17:10:00.000Z
---
# Coding Conventions

**Analysis Date:** 2026-11-06

## Naming Patterns

**Files:**
- React Components: `PascalCase.tsx` (e.g. `TemplateCard.tsx`, `A4ResumeDocument.tsx`, `ThemeSelector.tsx`)
- Server Services & Utilities: `camelCase.ts` (e.g. `careerActionEngine.ts`, `extractResumeText.ts`, `sessionAuth.ts`)
- Next.js App Router: lowercase reserved filenames (`page.tsx`, `layout.tsx`, `route.ts`, `not-found.tsx`)
- Playwright Tests: `kebab-case.spec.ts` (e.g. `smoke.spec.ts`, `ats-analyzer.spec.ts`)
- Node.js ESM Test Scripts: `test_snake_case.mjs` (e.g. `test_student_full_journey_e2e.mjs`)

**Functions & Methods:**
- Regular & Async Functions: `camelCase` (e.g. `getStudentProfile`, `calculateReadinessScore`, `verifySessionToken`)
- React Event Handlers: `handleEventName` (e.g. `handleScoreCalculated`, `handleFilterChange`, `handleSubmit`)
- Custom Hooks: `useHookName` (e.g. `useTheme`, `useDebounce`)

**Variables & Constants:**
- Variables & Instances: `camelCase` (e.g. `activeSession`, `resumeData`, `dbClientInstance`)
- Global Constants & Environment Keys: `UPPER_SNAKE_CASE` (e.g. `PRIMARY_GEMINI_MODEL`, `ADMIN_SESSION_SECRET`, `MAX_UPLOAD_SIZE_BYTES`)

**Types & Interfaces:**
- Interfaces & Types: `PascalCase`, without prefix (e.g. `UnifiedStudentContext`, `ResumeAnalysisResult`, `DatabaseClient`)
- Union Types & Enums: `PascalCase` with string literal union values (e.g. `type VerificationLevel = 'CLAIMED' | 'ASSESSED' | 'VERIFIED'`)

## Code Style

**Formatting:**
- TypeScript strict typing: `"strict": true` configured in `tsconfig.json`
- Indentation: 2 spaces
- Semicolons: Required
- Quotes: Single quotes for TypeScript/JavaScript code; double quotes for HTML/JSX attributes and JSON

**Linting:**
- ESLint 9 with Next.js core rules (`eslint.config.mjs`)
- Zero ESLint errors or TypeScript diagnostic errors permitted (`npm run lint` and `npx tsc --noEmit` exit with code 0)

## Import Organization

**Order:**
1. Built-in Node.js modules with prefix (e.g. `import path from 'node:path'`, `import crypto from 'node:crypto'`)
2. Framework boundary packages (e.g. `import 'server-only'`)
3. External npm packages (e.g. `import { NextResponse } from 'next/server'`, `import { GoogleGenAI } from '@google/genai'`)
4. Internal aliased modules using `@/` path alias:
   - `@/types/...`
   - `@/lib/...`
   - `@/server/...`
   - `@/components/...`
5. Relative imports (e.g. `./types`, `../utils`)
6. Explicit type imports (`import type { NextRequest } from 'next/server'`)

**Path Aliases:**
- `@/*` maps to `src/*`
- `@/server/*` maps to `src/server/*`
- `@/components/*` maps to `src/components/*`
- `@/types/*` maps to `src/types/*`
- `@/lib/*` maps to `src/lib/*`

## Error Handling

**API Route Boundaries:**
- All API handlers wrap logic in `try / catch` blocks.
- On client or validation error: Return `NextResponse.json({ error: 'Descriptive message', details?: ... }, { status: 400 })`.
- On unauthorized request: Return `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`.
- On rate limit violation: Return HTTP 429 with `Retry-After` header.
- On unhandled server error: Log error details with `console.error` and return `{ error: 'Internal Server Error' }, { status: 500 }`.

**Domain Service Fail-Safety:**
- Services must never throw unhandled exceptions for external dependency outages (Gemini AI timeouts, quota limits, third-party job API failures).
- Services must implement deterministic fallback defaults that produce valid data structures to keep the UI functioning smoothly.

**Database Atomic Transactions:**
- Use `db.transaction(async (tx) => { ... })` for multi-step mutations.
- Uses nested `SAVEPOINT` in PostgreSQL and SQLite to ensure clean rollback without poisoning connection pools.

## Logging

**Patterns:**
- Prefixed structured logging to disambiguate subsystems in Vercel logs:
  - `[Smart Resume AI]` - General application lifecycle and initialization
  - `[Gemini]` - AI service invocation, candidate fallback, and token usage
  - `[Database Adapter]` - Connection pooling, query timing, and savepoint rollbacks
  - `[Auth]` - Session issuance, password verification, rate limit enforcement
- Never log plaintext passwords, session secrets, or full API keys to stdout/stderr.

## Design System & UI Conventions

**Aesthetic Guidelines:**
- **Color Palette:** Pure white (`bg-white`), neutral slate/charcoal borders and text (`text-slate-900`, `text-slate-600`, `border-slate-200`), with royal blue accents (`bg-blue-600`, `text-blue-600`, `focus:ring-blue-500`).
- **Slop Prevention:**
  - Zero decorative purple/pink gradients.
  - Zero glowing borders or floating background blobs.
  - Zero invented statistics, fake testimonials, or placeholder marketing fluff.
  - Clean card layouts with clear typography and purposeful padding.
- **Button Standards:** Subtle rounded corners (`rounded-lg` or `rounded-md`), never excessive pill buttons (`rounded-full`). Clear hover and focus states.

## Module Design

**Server Boundary Enforcement:**
- Sensitive server logic (`src/server/**`) MUST start with `import 'server-only'`.
- Interactive UI components MUST start with `'use client'`.
- Never import `src/server/*` directly into client components.

---

*Convention analysis: 2026-11-06*
*Update when patterns change*

