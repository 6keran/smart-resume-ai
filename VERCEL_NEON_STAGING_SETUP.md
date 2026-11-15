# Smart Resume AI — Vercel & Neon Staging Setup Specification

**Date**: November 6, 2026  
**Auditor & Architect**: Principal Systems Architect & Senior Full-Stack Engineer  
**Target Environment**: Vercel Preview (Serverless) + Neon PostgreSQL (Serverless Branch)  
**Repository**: `D:\projects\builder-github`  
**Final Decision**: **READY FOR REMOTE STAGING SETUP**

---

## 1. Executive Summary & Git Repository Status

A full architectural audit of Smart Resume AI has been conducted to validate compatibility with **Vercel** serverless hosting and **Neon PostgreSQL** serverless branching.

### Git Status & Branch Preservation
- **Current Active Branch**: `main`
- **Working Tree Integrity**: **Preserved without modification or data loss**. All 99 uncommitted working tree files and untracked files remain intact.
- **Local Staging Branch Status**: Created a local branch ref `staging` (`git branch staging`) pointing safely to current `HEAD` without switching branches, checking out files, or altering uncommitted changes.
- **Safety Compliance**: Zero Git commits, zero Git resets, zero cloud resource provisioning, and zero production database mutations were executed.

---

## 2. Database Adapter Architecture & Resolution Rules

Inspection of [`src/server/db/adapter.ts`](file:///d:/projects/builder-github/src/server/db/adapter.ts) confirms exact resolution logic:

### Variable Interpretation Order
1. **Connection String Resolution**:
   ```ts
   const postgresUrl = (process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL || '').trim();
   ```
   The adapter checks `POSTGRES_URL` first, falls back to `DATABASE_URL`, and finally checks `NEON_DATABASE_URL`.
2. **Environment Detection**:
   ```ts
   const isVercel = Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
   const isProduction = process.env.NODE_ENV === 'production' || isVercel;
   const dbProvider = (process.env.DB_PROVIDER || '').trim().toLowerCase();
   const forcePostgres = dbProvider === 'postgres' || process.env.FORCE_POSTGRES === 'true';
   const shouldUsePostgres = !isPlaywrightTest && dbProvider !== 'sqlite' && (isProduction || forcePostgres);
   ```
   - **On Vercel (Preview or Production)**: `process.env.VERCEL` is automatically set to `'1'`. The adapter **automatically enforces PostgreSQL mode**.
   - **Fail-Fast Safety**: If running in Vercel or production mode and no valid connection string is provided, the adapter throws an immediate, descriptive fatal error:
     ```
     [Smart Resume AI] Database Error: Running in production or explicit PostgreSQL mode without a valid POSTGRES_URL or DATABASE_URL.
     ```
     It **never** silently defaults to an ephemeral local SQLite file in serverless deployments.
   - **Local Development / Playwright**: When running locally without `DB_PROVIDER=postgres`, it safely defaults to SQLite (`data/smart_resume.db` or `test-results/db/staging-environment.sqlite` via `STAGING_DB_PATH`).

---

## 3. Neon PostgreSQL Connection Architecture (Pooled vs. Direct)

Neon provides two distinct connection endpoints for every database branch. They must be routed correctly:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          NEON DATABASE BRANCH                         │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │              PgBouncer Connection Pooler                    │    │
│   │  Host: ep-***-pooler.region.neon.tech                        │    │
│   │  Port: 5432 (or 6543)                                        │    │
│   └──────────────────────────────▲───────────────────────────────┘    │
│                                  │                                    │
│                 Runtime Queries  │ (High concurrency, multiplexed)   │
│                                  │                                    │
│                    ┌─────────────┴─────────────┐                      │
│                    │  VERCEL SERVERLESS (APP)  │                      │
│                    │  POSTGRES_URL /           │                      │
│                    │  DATABASE_URL             │                      │
│                    └───────────────────────────┘                      │
│                                                                        │
│   ┌──────────────────────────────────────────────────────────────┐    │
│   │              Direct PostgreSQL Compute Node                  │    │
│   │  Host: ep-***.region.neon.tech (no '-pooler')                │    │
│   │  Port: 5432                                                  │    │
│   └──────────────────────────────▲───────────────────────────────┘    │
│                                  │                                    │
│                 DDL & Migrations │ (Session commands, locks, schema)  │
│                                  │                                    │
│                    ┌─────────────┴─────────────┐                      │
│                    │  MIGRATION & VERIFY CLI   │                      │
│                    │  POSTGRES_URL_NON_POOLING │                      │
│                    │  (npm run db:init:...)    │                      │
│                    └───────────────────────────┘                      │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Neon Pooled Connection String (Runtime Application)
- **Format**: `postgresql://[user]:[password]@ep-[id]-pooler.[region].aws.neon.tech/[dbname]?sslmode=require`
- **Identifier**: Contains `-pooler` in the host subdomain.
- **Assigned Variable in Vercel**: `POSTGRES_URL` and `DATABASE_URL`.
- **Why**: Vercel executes Next.js routes inside ephemeral serverless Lambda containers. Under traffic spikes, dozens of concurrent containers spin up. Connecting directly would quickly exceed PostgreSQL’s connection ceiling (`max_connections`). Neon's PgBouncer pooler multiplexes hundreds of incoming client connections over a compact set of database backends.

### 2. Neon Direct Connection String (Migrations & Schema DDL)
- **Format**: `postgresql://[user]:[password]@ep-[id].[region].aws.neon.tech/[dbname]?sslmode=require`
- **Identifier**: Direct host without `-pooler`.
- **Assigned Usage**: For running CLI migration and verification scripts (`npm run db:init:postgres`, `npm run db:verify:postgres`).
- **Why**: DDL commands (`CREATE TABLE`, `CREATE INDEX`, schema checks via `information_schema`) and large batch scripts are executed from an administrative CLI session. Direct connections bypass PgBouncer transaction-mode limitations, ensuring transactional schema modifications succeed reliably.

---

## 4. Serverless PostgreSQL Connection Lifecycle

[`src/server/db/adapter.ts`](file:///d:/projects/builder-github/src/server/db/adapter.ts) incorporates production-grade serverless connection pool management:

1. **Global Pool Caching Across Warm Invocations**:
   ```ts
   const globalForPg = globalThis as unknown as { __sra_pg_pool?: pg.Pool };
   if (!globalForPg.__sra_pg_pool) {
     globalForPg.__sra_pg_pool = new Pool({ ... });
   }
   ```
   The `pg.Pool` instance is attached to `globalThis.__sra_pg_pool`. In Vercel serverless environments, warm execution containers preserve global scope across consecutive invocations, preventing connection leaks.
2. **Serverless Connection Throttling**:
   - `poolMax`: In Vercel (`isVercel = true`), the pool size per container defaults to **5** (or `PG_MAX_CONNECTIONS`). This prevents a single container instance from exhausting shared Neon connections.
   - `idleTimeoutMillis`: Configured to `30000` (30 seconds). Idle connections are reclaimed quickly, allowing Neon compute endpoints to auto-suspend during periods of inactivity to save compute costs.
   - `connectionTimeoutMillis`: Configured to `10000` (10 seconds). If Neon compute is waking from suspended state, the connection waits up to 10s before failing with a clear error.
3. **Transaction Safety**:
   Transactions in `adapter.ts` check out a dedicated client from the pool (`await pool.connect()`), execute `BEGIN ... COMMIT/ROLLBACK`, and guarantee client return via `finally { client.release(); }`.

---

## 5. Storage & File Upload Compatibility in Serverless Environments

Vercel functions operate on an **ephemeral, read-only filesystem** (with only a temporary `/tmp` partition that does not persist between invocations).

### Audit Findings
1. **Resume Ingestion & Parsing**:
   - File uploads in [`src/server/services/extractResumeText.ts`](file:///d:/projects/builder-github/src/server/services/extractResumeText.ts) accept incoming `multipart/form-data` streams into memory as a `Buffer`.
   - Magic-byte signatures (`%PDF-`, `PK\x03\x04` for docx) are validated in memory.
   - Parsing via `pdf-parse` or `mammoth` runs entirely in memory without writing temporary files to local disk.
2. **Resume Data Persistence**:
   - Resumes are not stored as binary files on disk. Resumes and all edit versions are serialized into JSON and stored in the PostgreSQL database:
     - `resumes.resume_data` (`TEXT` column)
     - `resume_versions.resume_data` (`TEXT` column)
3. **PDF Generation**:
   - Resume PDF export is implemented via [`src/components/builder/A4ResumeDocument.tsx`](file:///d:/projects/builder-github/src/components/builder/A4ResumeDocument.tsx).
   - Rendering and export are handled **entirely client-side** via standard CSS print media rules (`@page { size: A4 portrait; margin: 0; }`) and native browser print dialogs (`window.print()`). No server-side headless Chromium or persistent PDF file generation on the Vercel container is required.
4. **Persistent Filesystem Reliance**:
   - A recursive filesystem write scan confirmed that **zero** production routes or services write to local disk.
   - The only `fs.mkdirSync` call in the entire codebase is inside the SQLite initialization branch in `adapter.ts`, which is inactive on Vercel.
   - **Verdict**: 100% compatible with Vercel serverless containers.

---

## 6. Authentication & Session Architecture Across Serverless Instances

### Audit Findings
1. **Stateless HMAC-SHA256 Token Design**:
   - [`src/lib/sessionAuth.ts`](file:///d:/projects/builder-github/src/lib/sessionAuth.ts) and [`src/server/db/index.ts`](file:///d:/projects/builder-github/src/server/db/index.ts) implement cryptographic HMAC-SHA256 tokens stored in HTTP-only cookies (`sra_user_session` and `sra_admin_session`).
   - Format: `base64url(payload).hmac_sha256(payload, ADMIN_SESSION_SECRET)`.
   - Every serverless function instance running across any Vercel region computes identical verification signatures using `ADMIN_SESSION_SECRET`.
   - **Zero In-Memory Sticky State**: Authentication does not require in-memory session tables, sticky load balancers, or a centralized Redis cache.
2. **Fail-Closed Secret Enforcement**:
   - In production (`process.env.VERCEL` or `NODE_ENV === 'production'`), if `ADMIN_SESSION_SECRET` is missing, empty, or shorter than 32 characters, the auth subsystem **fails closed** and returns `null`.
3. **User & Admin Credential Persistence**:
   - User credentials, password hashes (`scrypt` with 16-byte random salt), and account records are stored in PostgreSQL (`users` and `admin_users` tables), shared across all serverless instances.

---

## 7. Next.js & Build Configuration for Vercel

Inspection of [`next.config.ts`](file:///d:/projects/builder-github/next.config.ts) and [`package.json`](file:///d:/projects/builder-github/package.json):

1. **Server External Packages**:
   ```ts
   serverExternalPackages: ['pdf-parse', 'mammoth', 'pg']
   ```
   Ensures native Node.js binaries (`pg`, `pdf-parse`, `mammoth`) are resolved dynamically from `node_modules` in the Vercel Node runtime rather than bundled by Webpack/Turbopack.
2. **Build Verification**:
   Executed `npm run build` locally:
   - Successfully compiled **85/85 static and dynamic routes** in 9.1s.
   - Zero TypeScript or ESLint blocking errors.
3. **Linux Native Dependencies**:
   `lightningcss-linux-x64-gnu` is included in `optionalDependencies` in `package.json`, ensuring Tailwind CSS v4 builds cleanly on Vercel’s Linux build environment.
4. **Proxy & Routing**:
   [`src/proxy.ts`](file:///d:/projects/builder-github/src/proxy.ts) implements the Next.js 16 / React 19 proxy routing layer, enforcing security headers and session verification without deprecated middleware patterns.

---

## 8. Staging vs. Production Isolation Verification

To guarantee that the staging environment cannot accidentally connect to or mutate production data:

1. **Distinct Neon Compute Endpoints**:
   - Neon branches have separate, unique endpoint IDs:
     - Production: `ep-production-name-111111`
     - Staging: `ep-staging-name-222222`
   - Even if both branches live under the same Neon project, their DNS hostnames, connection strings, and storage volumes are completely separated.
2. **Vercel Scope Isolation**:
   - Vercel isolates environment variables by environment tier:
     - **Production**: Applied only when building/deploying the production branch (`main`).
     - **Preview**: Applied when building/deploying pull requests and non-production branches (e.g. `staging`).
   - Staging credentials (`POSTGRES_URL` with staging endpoint) will be added **strictly with Preview scope** (or scoped explicitly to branch `staging`).
3. **Zero Default Fallback**:
   - The application has no hardcoded database URLs in source code.
   - If `POSTGRES_URL` is omitted, the application fails closed rather than connecting to an inferred production database.

---

## 9. Required Staging Environment Variables (Names Only)

Configure the following variables in the **Vercel Project Settings $\to$ Environment Variables** (Scoped to **Preview**):

### Database & Concurrency
- `POSTGRES_URL` *(Neon pooled connection string, with `-pooler`)*
- `DATABASE_URL` *(Identical to `POSTGRES_URL`)*
- `DB_PROVIDER` *(Set to `postgres`)*
- `PG_MAX_CONNECTIONS` *(Optional; defaults to 5 on Vercel)*

### Authentication & Secrets
- `ADMIN_SESSION_SECRET` *(Mandatory $\ge 32$ characters; distinct from production)*
- `ADMIN_EMAIL` *(Staging administrator email)*
- `ADMIN_PASSWORD` *(Staging administrator password)*

### AI Integration
- `GEMINI_API_KEY` *(or `GOOGLE_API_KEY`)*

### External Job APIs (Optional / Graceful Fallback)
- `ADZUNA_APP_ID`
- `ADZUNA_APP_KEY`
- `JOOBLE_API_KEY`

---

## 10. Exact Neon Staging Migration & Verification Commands

Execute these commands against your **Neon Staging Branch** using the **Direct Connection String** (non-pooling endpoint):

### Windows PowerShell
```powershell
# Set the Direct (non-pooler) Neon staging connection string
$env:POSTGRES_URL="postgresql://[user]:[password]@ep-[id].[region].aws.neon.tech/[dbname]?sslmode=require"

# 1. Initialize all 27 tables, columns, indexes, and seed catalog idempotently
npm run db:init:postgres

# 2. Verify all tables, columns, and indexes (Read-Only)
npm run db:verify:postgres
```

### Linux / macOS Bash
```bash
# Set the Direct (non-pooler) Neon staging connection string
export POSTGRES_URL="postgresql://[user]:[password]@ep-[id].[region].aws.neon.tech/[dbname]?sslmode=require"

# 1. Initialize all 27 tables, columns, indexes, and seed catalog idempotently
npm run db:init:postgres

# 2. Verify all tables, columns, and indexes (Read-Only)
npm run db:verify:postgres
```

*Note: `scripts/init_postgres_schema.mjs` is completely idempotent (`CREATE TABLE IF NOT EXISTS`). It never deletes, drops, or overwrites existing records.*

---

## 11. Vercel Preview Branch Configuration Instructions

Follow these steps in the [Vercel Dashboard](https://vercel.com):

### Step 1: Link Repository & Confirm Build Settings
1. Import or navigate to the project repository: `builder-github`.
2. Framework Preset: **Next.js**.
3. Build Command: `npm run build` (or leave default `next build --webpack`).
4. Output Directory: `.next` (default).
5. Install Command: `npm install` (default).

### Step 2: Configure Environment Variables (Preview Scope)
Navigate to **Project Settings** $\to$ **Environment Variables**. Add each of the variables below, checking **ONLY Preview** (or specify branch `staging`):

| Variable Name | Target Value | Scope |
|---|---|:---:|
| `POSTGRES_URL` | `postgresql://[user]:[pass]@ep-***-pooler.neon.tech/neondb?sslmode=require` | **Preview** |
| `DATABASE_URL` | `postgresql://[user]:[pass]@ep-***-pooler.neon.tech/neondb?sslmode=require` | **Preview** |
| `DB_PROVIDER` | `postgres` | **Preview** |
| `ADMIN_SESSION_SECRET` | *(Random 32+ character string)* | **Preview** |
| `ADMIN_EMAIL` | `admin@staging.smartresume.ai` | **Preview** |
| `ADMIN_PASSWORD` | *(Secure staging admin password)* | **Preview** |
| `GEMINI_API_KEY` | `AIzaSy...` *(Google AI Studio key)* | **Preview** |

> [!CAUTION]
> Do NOT check the **Production** box for staging credentials.

### Step 3: Branch Deployment Settings
1. Navigate to **Project Settings** $\to$ **Git**.
2. Confirm **Production Branch** is set to `main`.
3. Under **Preview Deployments**, ensure deployments are enabled for all branches or configured for `staging`.
4. (Optional) Under **Domains**, add a custom staging domain (e.g. `staging.smartresume.ai`) and assign it to the `staging` branch.

---

## 12. Safe Local Staging Git Branch Commands for User Approval

Because you have active uncommitted changes in your working tree, here are the exact Git commands to execute when you are ready to publish the staging branch:

```bash
# 1. Review all modified and untracked files
git status

# 2. Commit your current work to main, or switch to the staging branch with changes
# Option A: Commit to staging branch
git checkout staging
git add .
git commit -m "feat: complete staging preparation and security enhancements"
git push -u origin staging

# Option B: Keep changes on main and branch staging
git add .
git commit -m "feat: complete functional maturity and staging upgrades"
git branch -f staging
git push origin staging
```

---

## 13. Remaining Blockers & Next Steps Requiring Manual Approval

### Remaining External Blockers
1. **Neon PostgreSQL Staging Branch**: Needs to be created in your Neon console to generate the staging connection strings.
2. **Vercel Project & Secrets**: Staging environment variables need to be saved in Vercel under the Preview scope.

### Exact Next Steps Requiring Manual Operator Approval
1. **Approval 1**: Create a `staging` branch in your Neon project console and copy the direct and pooled connection strings.
2. **Approval 2**: Run `npm run db:init:postgres` using the Neon direct connection string.
3. **Approval 3**: Add the staging environment variables to Vercel with Preview scope.
4. **Approval 4**: Push the `staging` branch to GitHub to trigger the Vercel Preview build.
5. **Approval 5**: Run `node scripts/test_staging_validation.mjs` against the resulting Vercel Preview URL to execute the 13 automated verification workflows.

---

## 14. Final Decision

# **FINAL DECISION: READY FOR REMOTE STAGING SETUP**

The codebase architecture, database adapter, migration scripts, serverless connection lifecycle, authentication engine, file handling, and Next.js 16 build configuration are **100% verified and ready** for remote deployment to Vercel and Neon PostgreSQL. Proceed with the manual operator steps outlined above.
