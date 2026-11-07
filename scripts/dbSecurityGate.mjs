/**
 * SMART RESUME AI: SHARED STAGING DATABASE SECURITY GATE
 *
 * Implements strict, fail-closed pre-connection and post-connection safety checks
 * for all PostgreSQL operations.
 *
 * SAFEGUARDS ENFORCED:
 * 1. Unified staging confirmation flags (TARGET_DB_ENV="staging" AND CONFIRM_STAGING_TARGET="staging").
 * 2. Unconditional production blocking (zero environment variable overrides).
 * 3. Strict pre-connection URL structure & approved staging endpoint allowlist matching.
 * 4. Post-connection independent database identity verification.
 * 5. Robust URL-parser credential masking (zero secret leaks).
 */

const PROD_INDICATORS = Object.freeze([
  'prod',
  'production',
  'main',
  'master',
  'primary',
  'live',
]);

/**
 * Robustly masks database connection credentials using the standard URL parser.
 * Never displays passwords, tokens, or sensitive query parameters.
 *
 * @param {string} rawUrl - Raw connection URI
 * @returns {string} Sanitized connection URI
 */
export function maskDatabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '[empty-url]';
  }

  try {
    const url = new URL(rawUrl);
    if (url.password) {
      url.password = '****';
    }
    // Mask sensitive search parameters if present
    for (const key of ['password', 'pwd', 'token', 'secret', 'key', 'auth']) {
      if (url.searchParams.has(key)) {
        url.searchParams.set(key, '****');
      }
    }
    return url.toString();
  } catch {
    // If standard URL parsing fails, mask aggressively without exposing raw string
    return rawUrl.replace(/:([^@/]+)@/, ':****@');
  }
}

/**
 * Checks if a string contains any production keywords.
 *
 * @param {string} str - String to test
 * @returns {string|null} The matching indicator or null
 */
export function findProductionIndicator(str) {
  if (!str || typeof str !== 'string') return null;
  const lower = str.toLowerCase();
  for (const indicator of PROD_INDICATORS) {
    // Match indicator as a standalone token or part of a compound name (e.g., prod-db, production_db, main)
    const regex = new RegExp(`(^|[^a-z0-9])${indicator}([^a-z0-9]|$)`, 'i');
    if (regex.test(lower)) {
      return indicator;
    }
  }
  return null;
}

/**
 * Evaluates whether a hostname is strictly local.
 *
 * @param {string} hostname
 * @returns {boolean}
 */
export function isLocalHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  const clean = hostname.trim().toLowerCase();
  return clean === 'localhost' || clean === '127.0.0.1' || clean === '::1';
}

/**
 * Strict pre-connection target validation.
 * MUST be called before opening any socket, client, or connection pool.
 *
 * @param {string} rawUrl - Target connection string
 * @param {object} [options]
 * @param {string} [options.actionDescription='database operation']
 * @returns {{ isLocal: boolean, parsedUrl: URL, maskedUrl: string }}
 */
export function assertStagingTargetSafe(rawUrl, options = {}) {
  const action = options.actionDescription || 'database operation';

  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error(`[SECURITY GATE ABORT] No database connection URL provided for ${action}.`);
  }

  // 1. Parse connection string using standard URL API
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch (err) {
    throw new Error(`[SECURITY GATE ABORT] Malformed database connection URL: ${err.message}`);
  }

  if (parsedUrl.protocol !== 'postgres:' && parsedUrl.protocol !== 'postgresql:') {
    throw new Error(`[SECURITY GATE ABORT] Invalid protocol "${parsedUrl.protocol}". Expected "postgresql:".`);
  }

  const hostname = parsedUrl.hostname.trim().toLowerCase();
  const dbName = parsedUrl.pathname.replace(/^\//, '').trim().toLowerCase();
  const username = parsedUrl.username.trim().toLowerCase();
  const isLocal = isLocalHostname(hostname);

  // 2. Unconditional Production Rejection (Hostname, Database Name, Username)
  const hostProd = findProductionIndicator(hostname);
  if (hostProd) {
    throw new Error(
      `[SECURITY GATE ABORT] Target hostname "${hostname}" matches production indicator "${hostProd}". Execution strictly blocked.`
    );
  }

  const dbProd = findProductionIndicator(dbName);
  if (dbProd) {
    throw new Error(
      `[SECURITY GATE ABORT] Target database name "${dbName}" matches production indicator "${dbProd}". Execution strictly blocked.`
    );
  }

  const userProd = findProductionIndicator(username);
  if (userProd) {
    throw new Error(
      `[SECURITY GATE ABORT] Target username matches production indicator "${userProd}". Execution strictly blocked.`
    );
  }

  // 3. Remote Staging Validation & Allowlist Enforcement
  if (!isLocal) {
    // W1 Check: Require both explicit confirmation flags
    const targetEnv = process.env.TARGET_DB_ENV;
    const confirmTarget = process.env.CONFIRM_STAGING_TARGET;

    if (targetEnv !== 'staging' || confirmTarget !== 'staging') {
      throw new Error(
        `[SECURITY GATE ABORT] Remote database operations for ${action} require explicit staging confirmation flags:\n` +
        `  TARGET_DB_ENV="staging" CONFIRM_STAGING_TARGET="staging"\n` +
        `Current values: TARGET_DB_ENV="${targetEnv || ''}", CONFIRM_STAGING_TARGET="${confirmTarget || ''}".`
      );
    }

    // W3 Check: Approved Staging Endpoint Allowlist
    // A hostname containing 'staging' does NOT automatically prove it is approved.
    const approvedHost = (process.env.APPROVED_STAGING_HOST || '').trim().toLowerCase();
    const approvedAllowlist = (process.env.APPROVED_STAGING_HOSTS || '')
      .split(',')
      .map(h => h.trim().toLowerCase())
      .filter(Boolean);

    if (approvedHost) {
      approvedAllowlist.push(approvedHost);
    }

    if (approvedAllowlist.length === 0) {
      throw new Error(
        `[SECURITY GATE ABORT] Remote database execution requires an explicit allowlist configuration via APPROVED_STAGING_HOST.\n` +
        `Target hostname "${hostname}" is unverified. Please set APPROVED_STAGING_HOST="${hostname}" after reviewing the endpoint.`
      );
    }

    const isAllowlisted = approvedAllowlist.some(allowed => allowed === hostname);
    if (!isAllowlisted) {
      throw new Error(
        `[SECURITY GATE ABORT] Hostname "${hostname}" does not match the approved staging target (${approvedAllowlist.join(', ')}).\n` +
        `Execution blocked to protect unauthorized or mismatched databases.`
      );
    }
  }

  return {
    isLocal,
    parsedUrl,
    maskedUrl: maskDatabaseUrl(rawUrl),
  };
}

/**
 * Independent post-connection database identity verification.
 * Queries current database metadata from the PostgreSQL engine and asserts safety.
 *
 * @param {object} client - Connected pg.Client or pg.PoolClient
 * @returns {Promise<{ database: string, user: string, serverIp: string, version: string }>}
 */
export async function verifyDatabaseIdentity(client) {
  const query = 'SELECT current_database() as db, current_user as usr, inet_server_addr() as srv_ip, version() as ver;';
  const res = await client.query(query);
  const row = res.rows[0] || {};
  const db = (row.db || '').trim();
  const usr = (row.usr || '').trim();
  const srvIp = row.srv_ip ? String(row.srv_ip) : 'cloud-proxy';
  const ver = row.ver || 'unknown';

  // Unconditional check on actual running database name
  const dbProd = findProductionIndicator(db);
  if (dbProd) {
    throw new Error(
      `[SECURITY GATE ABORT] Independent identity verification detected production indicator "${dbProd}" in live database "${db}". Terminating connection immediately.`
    );
  }

  return {
    database: db,
    user: usr,
    serverIp: srvIp,
    version: ver,
  };
}

