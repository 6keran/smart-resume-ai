# Smart Resume AI: Staging Deployment Runbook

## Document Overview
- **Project:** Smart Resume AI
- **Document Version:** 1.0.0
- **Milestone:** Staging Release & Vercel/Neon Operational Verification
- **Target Branch:** `staging`
- **Target Environments:** Vercel Preview Deployments + Isolated Neon PostgreSQL Staging Branch

---

## 1. Architectural Architecture & Safeguard Principles

Smart Resume AI utilizes a decoupled serverless architecture:
- **Compute:** Vercel Serverless Lambdas & Edge Proxy (`src/proxy.ts`).
- **Database:** Neon Serverless PostgreSQL with connection pooling (`ep-*-pooler`, `sslmode=require`).
- **Authentication:** Stateless HMAC-SHA256 cookies (`sra_user_session`, `sra_admin_session`) with cryptographic verification via Web Crypto API.
- **Fail-Closed Guards:** `src/instrumentation.ts` ensures the server refuses to start in production if `ADMIN_SESSION_SECRET` is under 32 characters or missing.
- **Pre-Connection Security Gate:** Database scripts enforce W1–W5 safeguards, blocking production hostnames unconditionally and verifying `APPROVED_STAGING_HOST`.

---

## 2. Environment Variables & Secret Configuration Manifest

### Staging vs. Production Boundaries

| Variable Name | Required | Staging Value Format | Production Value Format | Security Boundary |
| :--- | :---: | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` | `production` | Enables production optimizations and security gates. |
| `VERCEL_ENV` | Managed | `preview` | `production` | Injected automatically by Vercel platform. |
| `ADMIN_SESSION_SECRET` | Yes | High-entropy random $\ge 32$ chars | High-entropy random $\ge 32$ chars | **CRITICAL:** Staging secret must be completely separate from production. |
| `SESSION_SECRET` | Optional | High-entropy random $\ge 32$ chars | High-entropy random $\ge 32$ chars | Alias for session secret. |
| `TARGET_DB_ENV` | Required for scripts | `staging` | *(BLOCKED)* | Must be set to `staging` during database operations. |
| `CONFIRM_STAGING_TARGET` | Required for scripts | `staging` | *(BLOCKED)* | Must be set to `staging` during database operations. |
| `APPROVED_STAGING_HOST` | Required for scripts | `ep-staging-xyz.us-east-2.aws.neon.tech` | *(BLOCKED)* | Strict allowlist check before opening PostgreSQL socket. |
| `POSTGRES_URL` | Yes | `postgres://user:pass@ep-staging-xyz-pooler.neon.tech/neondb?sslmode=require` | Isolated prod pooler endpoint | Must use Neon pooler with `sslmode=require`. |
| `DATABASE_URL` | Yes | Same as `POSTGRES_URL` | Same as `POSTGRES_URL` | Pooled connection string. |
| `GEMINI_API_KEY` | Optional | Live Google Gemini API Key | Live Google Gemini API Key | Fallback engine engages automatically if unset or exhausted. |

### Secret Rotation Procedures
1. **Generating New Secrets:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. **Rotating Session Secret:**
   - Update `ADMIN_SESSION_SECRET` in Vercel Project Settings > Environment Variables for `Preview`.
   - Redeploy the preview deployment.
   - Existing active sessions will expire and require user re-login cleanly without data corruption.
3. **Rotating Database Credentials:**
   - In Neon Console, create a new password for the staging database role or branch.
   - Update `POSTGRES_URL` and `DATABASE_URL` in Vercel.
   - Redeploy the preview branch.

---

## 3. Neon PostgreSQL Staging Branch Provisioning

To prevent any cross-contamination with production, all staging activities must execute on an isolated Neon branch:

### Step 3.1: Create Isolated Staging Branch via Neon CLI or Console
```bash
# Using neonctl CLI
neonctl branches create --name staging --project-id <your-project-id>

# Or via Neon Console:
# 1. Navigate to Project > Branches
# 2. Click "Create Branch"
# 3. Branch Name: "staging"
# 4. Parent Branch: "main" (or create empty schema)
```

### Step 3.2: Obtain Staging Pooled Connection String
1. Select the `staging` branch in the Neon Console.
2. Under Connection Details, ensure:
   - **Connection pooling:** Enabled (`ep-*-pooler`)
   - **Database:** `neondb`
   - **SSL mode:** `require`
3. Copy the pooled connection string.
4. Record the exact hostname for the safety allowlist (e.g., `ep-patient-water-12345678.us-east-2.aws.neon.tech`).

---

## 4. Idempotent Schema Initialization & Verification

Once the user approves the isolated staging endpoint:

### Step 4.1: Pre-Connection Environment Validation
```bash
export TARGET_DB_ENV="staging"
export CONFIRM_STAGING_TARGET="staging"
export APPROVED_STAGING_HOST="<your-neon-staging-host>"
export POSTGRES_URL="postgres://<user>:<password>@<your-neon-staging-host-pooler>/neondb?sslmode=require"

# Run pre-flight security gate test
node scripts/test_db_security_gate.mjs
```

### Step 4.2: Execute Idempotent Schema Initialization
```bash
# Initializes all 31 canonical PostgreSQL tables with complete columns, indexes, and constraints
npm run db:init:postgres
```

### Step 4.3: Verify Schema Parity
```bash
# Verifies 100% of tables, column types, primary keys, and foreign keys against src/server/db/index.ts
npm run db:verify:postgres
```

### Step 4.4: Nested Savepoint Atomicity Test
```bash
# Validates multi-statement savepoints without connection pool poisoning
node scripts/test_pg_savepoints_atomic.mjs
```

---

## 5. Vercel Preview Deployment Configuration

### Step 5.1: Git Branch Configuration
- Active release branch: `staging`
- Production branch: `main` (remains untouched)
- Every push to `staging` automatically generates an isolated **Vercel Preview Deployment**.

### Step 5.2: Vercel Project Settings
1. Connect GitHub repository to Vercel.
2. In **Settings > Git**:
   - Production Branch: `main`
   - Preview Deployment: Enabled for all other branches, including `staging`.
3. In **Settings > Environment Variables**:
   - Add `ADMIN_SESSION_SECRET` (Preview environment only).
   - Add `POSTGRES_URL` pointing to the Neon staging pooler (Preview environment only).
   - Add `DATABASE_URL` pointing to the Neon staging pooler (Preview environment only).
   - Add `GEMINI_API_KEY` (Preview environment only).

### Step 5.3: Deployment Build Verification
The Vercel build automatically executes:
```bash
next build --webpack
```
All 85 routes and the Edge Proxy (`src/proxy.ts`) are compiled into immutable serverless and edge functions.

---

## 6. Post-Deployment Verification Checklist

After the Preview URL is generated by Vercel:
1. **Health Check:** `curl -s -o /dev/null -w "%{http_code}" https://<preview-domain>/api/auth/me` (returns 200).
2. **Security Headers Check:** Inspect headers for `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: SAMEORIGIN`.
3. **Student Lifecycle Smoke Test:** Execute complete student registration, profile creation, and resume download.
4. **Edge Rate Limiting:** Verify HTTP 429 after 11 rapid attempts on `/api/auth/login`.

