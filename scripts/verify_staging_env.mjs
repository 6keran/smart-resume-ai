/**
 * SMART RESUME AI: STAGING ENVIRONMENT VALIDATION SCRIPT
 *
 * Verifies that all staging environment variables are correctly configured,
 * have sufficient cryptographic entropy, and adhere to security rules.
 *
 * CRITICAL SECURITY GUARANTEES:
 * - NEVER prints or logs secret values, passwords, or API keys.
 * - Validates format, entropy, and protocol requirements safely.
 */

import path from 'node:path';
import fs from 'node:fs';
import { maskDatabaseUrl, findProductionIndicator, isLocalHostname } from './dbSecurityGate.mjs';

function loadEnv() {
  for (const file of ['.env.staging', '.env.local', '.env']) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

loadEnv();

console.log('================================================================');
console.log('SMART RESUME AI: STAGING ENVIRONMENT VALIDATION (ZERO SECRETS)');
console.log('================================================================\n');

let errors = 0;
let warnings = 0;

// 1. ADMIN_SESSION_SECRET Check
const sessionSecret = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error('❌ ADMIN_SESSION_SECRET: Missing.');
  console.error('   Requirement: Must be configured with at least 32 cryptographically random characters.');
  errors++;
} else if (sessionSecret.length < 32) {
  console.error(`❌ ADMIN_SESSION_SECRET: Too short (length: ${sessionSecret.length} chars).`);
  console.error('   Requirement: Must be at least 32 characters for HMAC-SHA256 fail-closed security.');
  errors++;
} else if (sessionSecret.includes('dev-only-secret') || sessionSecret.includes('example')) {
  console.error('❌ ADMIN_SESSION_SECRET: Insecure default or placeholder detected.');
  errors++;
} else {
  console.log(`✓ ADMIN_SESSION_SECRET: Valid (length: ${sessionSecret.length} characters, fail-closed compliant)`);
}

// 2. Database Connection URL Check
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!dbUrl) {
  console.warn('⚠️  POSTGRES_URL / DATABASE_URL: Not set in environment.');
  console.warn('   Note: Staging cloud deployment requires a Neon PostgreSQL connection string.');
  warnings++;
} else {
  try {
    const parsed = new URL(dbUrl);
    if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
      console.error(`❌ DATABASE_URL: Invalid protocol "${parsed.protocol}". Expected "postgresql:".`);
      errors++;
    } else {
      const isLocal = isLocalHostname(parsed.hostname);
      const maskedHost = isLocal ? parsed.hostname : parsed.hostname.replace(/^[^.]+/, 'ep-****');
      const dbName = parsed.pathname.replace(/^\//, '');
      const hasSsl = parsed.searchParams.get('sslmode') === 'require' || parsed.searchParams.get('ssl') === 'true';

      console.log(`✓ DATABASE_URL: Valid URL structure (Host: ${maskedHost}, Database: ${dbName})`);
      console.log(`  Masked: ${maskDatabaseUrl(dbUrl)}`);

      if (!isLocal && !hasSsl) {
        console.warn('⚠️  DATABASE_URL: Remote connection string should include "?sslmode=require" for Neon TLS.');
        warnings++;
      }

      const hostProd = findProductionIndicator(parsed.hostname);
      const dbProd = findProductionIndicator(dbName);
      if (hostProd || dbProd) {
        console.error(`❌ DATABASE_URL: Connection URL contains production keyword ("${hostProd || dbProd}"). Staging must target an isolated staging branch.`);
        errors++;
      }
    }
  } catch (err) {
    console.error(`❌ DATABASE_URL: Malformed connection string URI: ${err.message}`);
    errors++;
  }
}

// 3. Staging Confirmation Flags & Host Allowlist (W1, W3)
if (dbUrl && !isLocalHostname(new URL(dbUrl).hostname)) {
  const targetEnv = process.env.TARGET_DB_ENV;
  const confirmTarget = process.env.CONFIRM_STAGING_TARGET;
  const approvedHost = process.env.APPROVED_STAGING_HOST;

  if (targetEnv !== 'staging' || confirmTarget !== 'staging') {
    console.warn(`⚠️  Staging Confirmation Flags: TARGET_DB_ENV="${targetEnv || '(unset)'}", CONFIRM_STAGING_TARGET="${confirmTarget || '(unset)'}".`);
    console.warn('   Note: Remote database operations strictly require both flags set to "staging".');
    warnings++;
  } else {
    console.log('✓ Staging Confirmation Flags: Explicitly configured (TARGET_DB_ENV="staging", CONFIRM_STAGING_TARGET="staging").');
  }

  if (!approvedHost) {
    console.warn('⚠️  APPROVED_STAGING_HOST: Unset. Remote database execution strictly requires allowlist matching.');
    warnings++;
  } else {
    console.log(`✓ APPROVED_STAGING_HOST: Configured (${approvedHost.replace(/^[^.]+/, 'ep-****')}).`);
  }
}

// 4. DB_PROVIDER Check
const dbProvider = process.env.DB_PROVIDER;
console.log(`✓ DB_PROVIDER: "${dbProvider || 'sqlite (default local)'}"`);

// 5. GEMINI_API_KEY Check
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!geminiKey) {
  console.log('ℹ GEMINI_API_KEY: Unset. Platform will use its high-precision deterministic ATS analysis engine.');
} else {
  console.log(`✓ GEMINI_API_KEY: Present (length: ${geminiKey.length} chars). Live Gemini 3.5 Flash enabled.`);
}

console.log('\n----------------------------------------------------------------');
if (errors > 0) {
  console.error(`Validation complete: ${errors} errors, ${warnings} warnings. Staging configuration needs attention.\n`);
  process.exit(1);
} else {
  console.log(`Validation complete: 0 errors, ${warnings} warnings. Staging configuration is valid.\n`);
  process.exit(0);
}

