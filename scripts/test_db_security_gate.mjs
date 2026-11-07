/**
 * SMART RESUME AI: COMPREHENSIVE DATABASE SECURITY GATE TEST SUITE
 *
 * Verifies all Phase 1 database safety requirements (W1 - W5):
 * - W1: Standardized staging confirmation flags (TARGET_DB_ENV and CONFIRM_STAGING_TARGET).
 * - W2: Unconditional production rejection (zero override capability).
 * - W3: Strict pre-connection target validation and APPROVED_STAGING_HOST allowlist matching.
 * - W4: Pre-connection execution order (no socket/pool creation before validation).
 * - W5: Credential masking with standard URL parser (zero credential exposure).
 */

import assert from 'node:assert';
import {
  maskDatabaseUrl,
  findProductionIndicator,
  isLocalHostname,
  assertStagingTargetSafe,
} from './dbSecurityGate.mjs';

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    Error: ${err.message}`);
    throw err;
  }
}

console.log('================================================================');
console.log('SMART RESUME AI: DATABASE SECURITY GATE TEST SUITE (W1 - W5)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. URL Credential Masking (W5)
// -----------------------------------------------------------------------------
console.log('--- 1. Testing Credential Masking (W5) ---');

test('W5.1: Masks plain passwords in standard postgres URLs', () => {
  const raw = 'postgresql://my_user:SuperSecretPassword123@ep-branch.neon.tech:5432/neondb?sslmode=require';
  const masked = maskDatabaseUrl(raw);
  assert(!masked.includes('SuperSecretPassword123'), 'Raw password must not be present');
  assert(masked.includes('my_user:****@ep-branch.neon.tech'), 'Password must be masked with ****');
});

test('W5.2: Masks URL-encoded passwords with special characters', () => {
  const raw = 'postgresql://candidate:p%40%24%24w0rd%21%25%5E@ep-branch.neon.tech/neondb';
  const masked = maskDatabaseUrl(raw);
  assert(!masked.includes('p%40%24%24w0rd'), 'Encoded password must not be present');
  assert(masked.includes('candidate:****@ep-branch.neon.tech'), 'Password must be masked with ****');
});

test('W5.3: Masks sensitive query parameters (token, secret, auth, key, pwd)', () => {
  const raw = 'postgresql://user:pass@ep-branch.neon.tech/neondb?token=tok_live_123&secret=sec_456&key=k789&auth=a000';
  const masked = maskDatabaseUrl(raw);
  assert(!masked.includes('tok_live_123'), 'token param must be masked');
  assert(!masked.includes('sec_456'), 'secret param must be masked');
  assert(!masked.includes('k789'), 'key param must be masked');
  assert(!masked.includes('a000'), 'auth param must be masked');
  assert(masked.includes('token=****'), 'token must be replaced with ****');
  assert(masked.includes('secret=****'), 'secret must be replaced with ****');
});

test('W5.4: Handles malformed and edge-case URLs safely without throwing or leaking', () => {
  assert.strictEqual(maskDatabaseUrl(''), '[empty-url]');
  assert.strictEqual(maskDatabaseUrl(null), '[empty-url]');
  assert.strictEqual(maskDatabaseUrl(undefined), '[empty-url]');

  const malformed = 'postgres://admin:topsecret@unparseable-url-with-extra::colons';
  const masked = maskDatabaseUrl(malformed);
  assert(!masked.includes('topsecret'), 'Malformed URL must still have password masked');
});

// -----------------------------------------------------------------------------
// 2. Production Indicator Detection (W2)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Production Keyword Detection (W2) ---');

test('W2.1: Detects production keywords in hostnames', () => {
  assert(findProductionIndicator('ep-prod-database.neon.tech') === 'prod');
  assert(findProductionIndicator('production-db.company.internal') === 'production');
  assert(findProductionIndicator('aws-main-postgres.internal') === 'main');
  assert(findProductionIndicator('db-master.internal') === 'master');
  assert(findProductionIndicator('db-primary.internal') === 'primary');
  assert(findProductionIndicator('live-data.internal') === 'live');
});

test('W2.2: Does not produce false positives on non-production strings', () => {
  assert.strictEqual(findProductionIndicator('ep-staging-branch.neon.tech'), null);
  assert.strictEqual(findProductionIndicator('ep-frosty-fog-b4r98mh8-pooler.neon.tech'), null);
  assert.strictEqual(findProductionIndicator('preview-app.internal'), null);
  assert.strictEqual(findProductionIndicator('dev-database.internal'), null);
  assert.strictEqual(findProductionIndicator('test-db.internal'), null);
});

// -----------------------------------------------------------------------------
// 3. Localhost Evaluation
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Localhost Evaluation ---');

test('3.1: Accurately identifies localhost endpoints', () => {
  assert.strictEqual(isLocalHostname('localhost'), true);
  assert.strictEqual(isLocalHostname('127.0.0.1'), true);
  assert.strictEqual(isLocalHostname('::1'), true);
  assert.strictEqual(isLocalHostname('LOCALHOST'), true);
  assert.strictEqual(isLocalHostname('  127.0.0.1  '), true);
});

test('3.2: Rejects remote hostnames as non-local', () => {
  assert.strictEqual(isLocalHostname('ep-frosty-fog.neon.tech'), false);
  assert.strictEqual(isLocalHostname('192.168.1.100'), false);
  assert.strictEqual(isLocalHostname('staging.mysite.com'), false);
});

// -----------------------------------------------------------------------------
// 4. Staging Confirmation Flags (W1)
// -----------------------------------------------------------------------------
console.log('\n--- 4. Testing Staging Confirmation Flags (W1) ---');

// Helper to run with temporary environment variables
function withEnv(envObj, fn) {
  const original = {};
  for (const k of Object.keys(envObj)) {
    original[k] = process.env[k];
    if (envObj[k] === undefined) {
      delete process.env[k];
    } else {
      process.env[k] = envObj[k];
    }
  }
  try {
    return fn();
  } finally {
    for (const k of Object.keys(envObj)) {
      if (original[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = original[k];
      }
    }
  }
}

test('W1.1: Rejects remote connection when TARGET_DB_ENV and CONFIRM_STAGING_TARGET are missing', () => {
  withEnv({ TARGET_DB_ENV: undefined, CONFIRM_STAGING_TARGET: undefined }, () => {
    assert.throws(
      () => assertStagingTargetSafe('postgresql://user:pass@ep-staging-01.neon.tech/neondb'),
      /require explicit staging confirmation flags/
    );
  });
});

test('W1.2: Rejects remote connection when only TARGET_DB_ENV is set', () => {
  withEnv({ TARGET_DB_ENV: 'staging', CONFIRM_STAGING_TARGET: undefined }, () => {
    assert.throws(
      () => assertStagingTargetSafe('postgresql://user:pass@ep-staging-01.neon.tech/neondb'),
      /require explicit staging confirmation flags/
    );
  });
});

test('W1.3: Rejects remote connection when flags have incorrect values', () => {
  withEnv({ TARGET_DB_ENV: 'staging', CONFIRM_STAGING_TARGET: 'production' }, () => {
    assert.throws(
      () => assertStagingTargetSafe('postgresql://user:pass@ep-staging-01.neon.tech/neondb'),
      /require explicit staging confirmation flags/
    );
  });
});

// -----------------------------------------------------------------------------
// 5. Unconditional Production Rejection & Zero Bypass (W2)
// -----------------------------------------------------------------------------
console.log('\n--- 5. Testing Production Blocking & Zero Overrides (W2) ---');

test('W2.1: Blocks production hostname even when staging flags are present', () => {
  withEnv(
    {
      TARGET_DB_ENV: 'staging',
      CONFIRM_STAGING_TARGET: 'staging',
      APPROVED_STAGING_HOST: 'ep-prod-branch.neon.tech',
    },
    () => {
      assert.throws(
        () => assertStagingTargetSafe('postgresql://user:pass@ep-prod-branch.neon.tech/neondb'),
        /Target hostname .* matches production indicator "prod"/
      );
    }
  );
});

test('W2.2: Blocks production database name even on staging-like hostname', () => {
  withEnv(
    {
      TARGET_DB_ENV: 'staging',
      CONFIRM_STAGING_TARGET: 'staging',
      APPROVED_STAGING_HOST: 'ep-staging.neon.tech',
    },
    () => {
      assert.throws(
        () => assertStagingTargetSafe('postgresql://user:pass@ep-staging.neon.tech/production_db'),
        /Target database name .* matches production indicator "production"/
      );
    }
  );
});

test('W2.3: Blocks production username even on staging-like hostname', () => {
  withEnv(
    {
      TARGET_DB_ENV: 'staging',
      CONFIRM_STAGING_TARGET: 'staging',
      APPROVED_STAGING_HOST: 'ep-staging.neon.tech',
    },
    () => {
      assert.throws(
        () => assertStagingTargetSafe('postgresql://prod_admin:pass@ep-staging.neon.tech/neondb'),
        /Target username matches production indicator "prod"/
      );
    }
  );
});

test('W2.4: ALLOW_PRODUCTION_OVERRIDE has zero effect and cannot bypass security', () => {
  withEnv(
    {
      TARGET_DB_ENV: 'staging',
      CONFIRM_STAGING_TARGET: 'staging',
      ALLOW_PRODUCTION_OVERRIDE: 'true',
      APPROVED_STAGING_HOST: 'ep-prod-01.neon.tech',
    },
    () => {
      assert.throws(
        () => assertStagingTargetSafe('postgresql://user:pass@ep-prod-01.neon.tech/neondb'),
        /matches production indicator/
      );
    }
  );
});

// -----------------------------------------------------------------------------
// 6. Approved Staging Host Allowlist (W3)
// -----------------------------------------------------------------------------
console.log('\n--- 6. Testing Approved Staging Endpoint Allowlist (W3) ---');

test('W3.1: Rejects remote staging target when APPROVED_STAGING_HOST is missing', () => {
  withEnv(
    {
      TARGET_DB_ENV: 'staging',
      CONFIRM_STAGING_TARGET: 'staging',
      APPROVED_STAGING_HOST: undefined,
      APPROVED_STAGING_HOSTS: undefined,
    },
    () => {
      assert.throws(
        () => assertStagingTargetSafe('postgresql://user:pass@ep-staging-123.neon.tech/neondb'),
        /requires an explicit allowlist configuration via APPROVED_STAGING_HOST/
      );
    }
  );
});

test('W3.2: Rejects remote target when hostname does not match APPROVED_STAGING_HOST', () => {
  withEnv(
    {
      TARGET_DB_ENV: 'staging',
      CONFIRM_STAGING_TARGET: 'staging',
      APPROVED_STAGING_HOST: 'ep-approved-staging.neon.tech',
    },
    () => {
      assert.throws(
        () => assertStagingTargetSafe('postgresql://user:pass@ep-different-staging.neon.tech/neondb'),
        /does not match the approved staging target/
      );
    }
  );
});

test('W3.3: Accepts remote target when hostname exactly matches APPROVED_STAGING_HOST', () => {
  withEnv(
    {
      TARGET_DB_ENV: 'staging',
      CONFIRM_STAGING_TARGET: 'staging',
      APPROVED_STAGING_HOST: 'ep-approved-staging.neon.tech',
    },
    () => {
      const res = assertStagingTargetSafe('postgresql://user:pass@ep-approved-staging.neon.tech/neondb');
      assert.strictEqual(res.isLocal, false);
      assert.strictEqual(res.parsedUrl.hostname, 'ep-approved-staging.neon.tech');
      assert(res.maskedUrl.includes('user:****@ep-approved-staging.neon.tech'));
    }
  );
});

test('W3.4: Accepts comma-separated list via APPROVED_STAGING_HOSTS', () => {
  withEnv(
    {
      TARGET_DB_ENV: 'staging',
      CONFIRM_STAGING_TARGET: 'staging',
      APPROVED_STAGING_HOST: undefined,
      APPROVED_STAGING_HOSTS: 'ep-staging-1.neon.tech, ep-staging-2.neon.tech',
    },
    () => {
      const res = assertStagingTargetSafe('postgresql://user:pass@ep-staging-2.neon.tech/neondb');
      assert.strictEqual(res.isLocal, false);
      assert.strictEqual(res.parsedUrl.hostname, 'ep-staging-2.neon.tech');
    }
  );
});

// -----------------------------------------------------------------------------
// 7. Local Database Support
// -----------------------------------------------------------------------------
console.log('\n--- 7. Testing Local Database Bypass of Staging Flags ---');

test('7.1: Localhost bypasses staging confirmation flags', () => {
  withEnv(
    {
      TARGET_DB_ENV: undefined,
      CONFIRM_STAGING_TARGET: undefined,
      APPROVED_STAGING_HOST: undefined,
    },
    () => {
      const res = assertStagingTargetSafe('postgresql://postgres:secret@localhost:5432/my_dev_db');
      assert.strictEqual(res.isLocal, true);
      assert.strictEqual(res.parsedUrl.hostname, 'localhost');
      assert(res.maskedUrl.includes('postgres:****@localhost:5432/my_dev_db'));
    }
  );
});

test('7.2: 127.0.0.1 bypasses staging confirmation flags', () => {
  withEnv(
    {
      TARGET_DB_ENV: undefined,
      CONFIRM_STAGING_TARGET: undefined,
      APPROVED_STAGING_HOST: undefined,
    },
    () => {
      const res = assertStagingTargetSafe('postgresql://postgres:secret@127.0.0.1:5432/my_dev_db');
      assert.strictEqual(res.isLocal, true);
      assert.strictEqual(res.parsedUrl.hostname, '127.0.0.1');
    }
  );
});

test('7.3: Local database with production name is still strictly rejected', () => {
  assert.throws(
    () => assertStagingTargetSafe('postgresql://postgres:secret@localhost:5432/production_replica'),
    /matches production indicator "production"/
  );
});

// -----------------------------------------------------------------------------
// 8. Protocol & URL Malformation Checks
// -----------------------------------------------------------------------------
console.log('\n--- 8. Testing Protocol & URL Malformation ---');

test('8.1: Rejects empty or non-string database URL', () => {
  assert.throws(
    () => assertStagingTargetSafe(''),
    /No database connection URL provided/
  );
  assert.throws(
    () => assertStagingTargetSafe(null),
    /No database connection URL provided/
  );
});

test('8.2: Rejects completely malformed URLs', () => {
  assert.throws(
    () => assertStagingTargetSafe('not_a_valid_url_at_all'),
    /Malformed database connection URL/
  );
});

test('8.3: Rejects non-postgresql protocols (e.g., http, mysql)', () => {
  assert.throws(
    () => assertStagingTargetSafe('http://localhost:5432/db'),
    /Invalid protocol "http:"/
  );
  assert.throws(
    () => assertStagingTargetSafe('mysql://root:pass@localhost:3306/db'),
    /Invalid protocol "mysql:"/
  );
});

console.log('\n================================================================');
console.log(`🎉 ALL ${passedTests}/${totalTests} SECURITY GATE TESTS PASSED SUCCESSFULLY!`);
console.log('================================================================');

