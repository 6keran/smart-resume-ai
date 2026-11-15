# Smart Resume AI: Rollback Procedures & Disaster Recovery Protocols

## Document Overview
- **Document:** Rollback & Incident Recovery Protocols
- **Version:** 1.0.0
- **Applies to:** Smart Resume AI Staging & Production Deployments
- **Objective:** Establish rapid, deterministic recovery procedures for compute, database, and credential incidents with zero data loss.

---

## 1. Incident Classification & Response Matrix

| Severity | Definition | Recovery Target (RTO) | Data Loss Target (RPO) | Initial Action |
| :--- | :--- | :--- | :--- | :--- |
| **P0: Critical** | Database corruption, credential compromise, or platform-wide outage | $< 5$ minutes | $0$ seconds | Trigger instant Vercel rollback; isolate Neon branch. |
| **P1: Major** | Authentication failure, route authorization bypass, or edge proxy fault | $< 15$ minutes | $0$ seconds | Roll back deployment to last known stable commit. |
| **P2: Moderate** | Non-critical UI regression, transient API timeout, or isolated search provider outage | $< 60$ minutes | $0$ seconds | Deploy targeted fix or rely on automated deterministic fallback. |

---

## 2. Compute Layer Rollback: Instant Vercel Rollback

Vercel maintains immutable deployments for every build. To roll back an unhealthy deployment:

### Option A: Via Vercel Dashboard (Fastest: < 30 seconds)
1. Open the **Smart Resume AI Project** in the Vercel Dashboard.
2. Navigate to the **Deployments** tab.
3. Locate the last known good deployment (verified green with passed smoke checks).
4. Click the three dots (`...`) next to that deployment and select **Instant Rollback** (or **Promote to Production / Preview**).
5. Vercel immediately redirects 100% of traffic to the healthy immutable deployment without rebuilding.

### Option B: Via Vercel CLI
```bash
# List previous deployments
vercel ls

# Roll back to target deployment URL or ID
vercel rollback <deployment-id-or-url>
```

---

## 3. Database Layer Rollback: Neon Point-in-Time Restore (PITR)

Neon PostgreSQL continuously streams write-ahead logs (WAL), enabling point-in-time branch restores to any second within the retention window.

### Scenario 3.1: Accidental Schema Mutation or Corrupted Staging Data
If an errant script or untested migration modifies the database:

1. **Identify the exact timestamp** prior to the incident (e.g., `2026-11-06T20:30:00Z`).
2. **Create a restored branch from that timestamp** using the Neon CLI:
   ```bash
   neonctl branches create \
     --name staging-restored-point \
     --parent staging \
     --timestamp "2026-11-06T20:30:00Z" \
     --project-id <your-project-id>
   ```
3. **Obtain the connection string** for `staging-restored-point`.
4. **Update `POSTGRES_URL` in Vercel** to point to the restored branch pooler.
5. **Redeploy preview** to restore complete database integrity instantly.

### Scenario 3.2: Reverting an Idempotent Schema Script
If `init_postgres_schema.mjs` was executed and needs rollback:
1. The 31 canonical tables were created with `IF NOT EXISTS`.
2. To cleanly reset an isolated staging branch without affecting parent branches:
   ```bash
   # Delete the tainted staging branch
   neonctl branches delete staging --project-id <your-project-id>

   # Re-create clean staging branch from parent
   neonctl branches create --name staging --parent main --project-id <your-project-id>
   ```

---

## 4. Git Branch Rollback Protocol

If a bad commit was merged to `staging`:

### Step 4.1: Revert via Git
```bash
# Checkout staging branch
git checkout staging

# Revert the offending commit cleanly
git revert <commit-hash> --no-edit

# Verify type safety and tests locally
npx tsc --noEmit
npm run test:security
npm run test:isolation
npm run test:proxy

# Push reverted commit (when authorized)
git push origin staging
```

---

## 5. Security & Credential Incident Response Protocol

If `ADMIN_SESSION_SECRET` or a database password is suspected to be exposed:

1. **Immediate Revocation:**
   - Immediately delete the exposed secret from Vercel Environment Variables.
2. **Issue New Secret:**
   - Generate a cryptographically secure 64-character token:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - Update `ADMIN_SESSION_SECRET` in Vercel with the new token.
3. **Invalidate Active Sessions:**
   - Redeploying causes `src/lib/sessionAuth.ts` and `src/server/auth/adminSession.ts` to invalidate all existing cookies instantly, forcing re-authentication across all clients.
4. **Audit Logs:**
   - Query `admin_audit_logs` table in the database to inspect all recent administrative actions and verify zero unauthorized actions occurred.

---

## 6. Post-Incident Review & Sign-Off Checklist

Following any rollback:
- [ ] Compute traffic confirmed healthy on restored deployment.
- [ ] Database read/write operations verified on active pooled connection.
- [ ] No credential or sensitive data logged or leaked in error traces.
- [ ] Root cause identified and reproduction test added to regression suite.
- [ ] Formal incident review signed off by Lead Engineer.

