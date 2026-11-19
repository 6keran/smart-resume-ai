# Smart Resume AI: Production Setup & Deployment Guide

This document provides complete, step-by-step instructions for deploying and running **Smart Resume AI** in a production environment. A human operator with standard cloud infrastructure access can launch the application by following this runbook.

---

## 1. Prerequisites & Infrastructure Sizing

### Runtime Requirements
- **Node.js**: `v20.x` LTS or `v22.x` LTS (Node.js 20.19+ recommended)
- **Package Manager**: `npm v10+` (or `pnpm v9+`)
- **Host / Platform**:
  - Vercel (recommended for edge routing & serverless functions)
  - AWS ECS / App Runner / EC2 (Containerized Node.js)
  - Self-hosted Linux VM (Ubuntu 22.04 LTS / Debian 12 with systemd + NGINX)
- **Minimum Compute**:
  - Serverless: 1024 MB memory per function invocation
  - Dedicated Host: 2 vCPU, 4 GB RAM, 20 GB SSD storage

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env.production` (or configure directly in your cloud secret manager / Vercel Environment Variables).

```bash
# Example generation of 32+ character secrets
openssl rand -base64 36
```

### 2.1 Mandatory Variables (Application will FAIL-CLOSED if missing)

| Variable | Description | Security Requirements | Example Value |
| :--- | :--- | :--- | :--- |
| `SESSION_SECRET` | Primary JWT signing key for student sessions | Minimum 32 random characters; cryptographically secure | `z8K...9wL#mPq7!xR4vT2yU5sA1bC0eF` |
| `ADMIN_SESSION_SECRET` | Isolated JWT signing key for administrator portal | Minimum 32 random characters; MUST differ from `SESSION_SECRET` | `m9Q...2tY#kL5!wP8xR1vT4sA7bC3eD` |
| `ADMIN_EMAIL` | Bootstrap administrator account email | Valid email address | `admin@smartresume.ai` |
| `ADMIN_PASSWORD` | Bootstrap administrator account password | Minimum 12 characters, mixed case, numbers & symbols | `Str0ng#Admin2026!Sec` |
| `NODE_ENV` | Enforces production runtime safeguards | Must be strictly `production` | `production` |

### 2.2 Database Configuration

Smart Resume AI operates with unified SQL syntax supporting both SQLite (development) and PostgreSQL / Neon (staging/production).

| Variable | Description | Mode Requirement | Example Value |
| :--- | :--- | :--- | :--- |
| `DB_PROVIDER` | Active database provider | Set to `"postgres"` for remote DB; defaults to `"sqlite"` | `postgres` |
| `DATABASE_URL` | Primary PostgreSQL connection URI | Must include `?sslmode=require` for Neon or cloud PG | `postgresql://user:pass@ep-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `POSTGRES_URL` | Alternate connection URI (Vercel Postgres / Neon) | Same as `DATABASE_URL` (checked as fallback) | `postgresql://user:pass@ep-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require` |
| `PG_MAX_CONNECTIONS` | Connection pool ceiling per instance | Optional; defaults to `10` | `10` |

> [!IMPORTANT]
> When using Neon Serverless PostgreSQL, always use the **pooled connection endpoint** (`-pooler` in hostname) to prevent connection exhaustion during traffic spikes.

### 2.3 AI & External Integrations

| Variable | Description | Requirement | Fallback Behavior if Missing |
| :--- | :--- | :--- | :--- |
| `GEMINI_API_KEY` | Google Gemini API key (AI Studio / Vertex) | Highly Recommended | Built-in deterministic career intelligence engine handles scoring and roadmap generation gracefully |
| `ADZUNA_APP_ID` | Adzuna Job Aggregator Application ID | Optional | System falls back to internal curated tech job listings |
| `ADZUNA_APP_KEY` | Adzuna Job Aggregator Application Key | Optional | System falls back to internal curated tech job listings |
| `JOOBLE_API_KEY` | Jooble Job Feed API Key | Optional | System falls back to internal curated tech job listings |

---

## 3. Database Initialization & Remote Parity Verification

The application initializes its 31 tables idempotently on startup. To verify remote database connectivity and schema readiness prior to switching DNS:

```bash
# Verify PostgreSQL parity and connection using the isolated harness
npx tsx scripts/test_postgres_parity_validation.mjs
```

### Pre-Launch Database Checklist
- [ ] Neon branch or PostgreSQL instance created in same region as compute host (e.g., `us-east-1` or `eu-west-1`).
- [ ] SSL connection enforced (`sslmode=require`).
- [ ] Connection pooler active (`ep-xxxx-pooler`).
- [ ] Point-in-time recovery (PITR) or automated daily snapshots enabled in Neon dashboard.
- [ ] Test user and session verified with isolated test queries.

---

## 4. Build & Production Verification

Run the pre-flight verification sequence on the deployment build host:

```bash
# 1. Install locked dependencies
npm ci

# 2. Verify TypeScript type safety
npx tsc --noEmit

# 3. Verify static code quality
npm run lint

# 4. Verify ATS Scoring Invariant Hash
node -e "const crypto = require('crypto'); const fs = require('fs'); const hash = crypto.createHash('sha256').update(fs.readFileSync('src/server/services/deterministicAtsEngine.ts')).digest('hex').toUpperCase(); if (hash !== 'F1ECC4BE87472F55F1A8C15253CB1F91219E84053B5056024F9317E052CE8251') { console.error('FATAL: ATS INVARIANT COMPROMISED'); process.exit(1); } else { console.log('ATS INVARIANT VERIFIED: MATCH'); }"

# 5. Create optimized production build
npm run build
```

---

## 5. Domain, DNS, and SSL Configuration

### Custom Domain Setup (e.g., `smartresume.ai` / `app.smartresume.ai`)
1. **DNS Records**:
   - For Vercel:
     - `CNAME` for subdomain: `cname.vercel-dns.com`
     - `A` Record for apex: `76.76.21.21`
   - For Custom NGINX / Cloud VM:
     - `A` Record: `<Server_Public_IPv4>`
     - `AAAA` Record: `<Server_Public_IPv6>`
2. **SSL / TLS Certificate**:
   - Vercel automatically issues and renews Let's Encrypt / DigiCert certificates.
   - For self-hosted NGINX, provision via Certbot:
     ```bash
     sudo certbot --nginx -d app.smartresume.ai
     ```
   - Enforce TLS 1.2 and TLS 1.3 only; disable TLS 1.0 and 1.1.
3. **HTTP to HTTPS Redirection**:
   - Ensure automatic 301 redirect from `http://` to `https://`.
   - HSTS header is enabled automatically in Next.js production headers.

---

## 6. Process Supervision (Self-Hosted / Containerized)

If running outside of serverless platforms (e.g. systemd or PM2 on Linux):

```ini
# /etc/systemd/system/smart-resume.service
[Unit]
Description=Smart Resume AI Next.js Application
After=network.target

[Service]
Type=simple
User=appuser
WorkingDirectory=/var/www/smart-resume
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
EnvironmentFile=/var/www/smart-resume/.env.production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable smart-resume
sudo systemctl start smart-resume
```

---

## 7. Post-Deployment Verification Smoke Test

Execute the following 5 smoke test curls against your live URL:

```bash
# 1. Health check & landing page (HTTP 200)
curl -I https://app.smartresume.ai/

# 2. Protected route unauthenticated redirect (HTTP 307 to /login)
curl -I https://app.smartresume.ai/builder

# 3. Admin portal login page (HTTP 200)
curl -I https://app.smartresume.ai/admin/login

# 4. Auth API unauthenticated validation (HTTP 401)
curl -I https://app.smartresume.ai/api/auth/me

# 5. ATS public scorer route (HTTP 200)
curl -I https://app.smartresume.ai/ats-score
```
