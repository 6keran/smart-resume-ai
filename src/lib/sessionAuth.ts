export const ALLOWED_SESSION_ROLES = ['USER', 'ADMIN'] as const;
export type SessionRole = (typeof ALLOWED_SESSION_ROLES)[number];

export interface SessionPayload {
  sub: string;
  email: string;
  role: SessionRole;
  iat: number;
  exp: number;
}

/**
 * Clock skew tolerance in milliseconds (60 seconds) to account for slight server time drift.
 */
export const CLOCK_SKEW_TOLERANCE_MS = 60 * 1000;

/**
 * Development-only fallback secret strictly restricted to non-production environments.
 * IN PRODUCTION: This fallback is NEVER used; ADMIN_SESSION_SECRET must be explicitly provided with >= 32 characters.
 */
export const DEV_ONLY_FALLBACK_SECRET = 'dev-only-secret-smart-resume-ai-do-not-use-in-production-min-32-chars';

/**
 * Centralized function to retrieve and validate ADMIN_SESSION_SECRET or SESSION_SECRET.
 * Compatible with Edge runtime, Node.js, and client testing.
 */
export function getAdminSessionSecret(): string | null {
  const isProduction = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  const rawSecret = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET;
  const secret = typeof rawSecret === 'string' ? rawSecret.trim() : '';

  if (isProduction) {
    if (!secret || secret.length < 32) {
      return null;
    }
    return secret;
  }

  // Outside production:
  if (secret) {
    if (secret.length < 32) {
      return null;
    }
    return secret;
  }

  return DEV_ONLY_FALLBACK_SECRET;
}

export const getValidatedSessionSecret = getAdminSessionSecret;

/**
 * Decodes a base64url string into a UTF-8 string across Edge and Node environments.
 */
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(padded, 'base64').toString('utf8');
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Converts a base64url string to Uint8Array across Edge and Node environments.
 */
function base64UrlToUint8Array(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(padded, 'base64'));
  }
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Resolves the SubtleCrypto instance across Web Crypto (Edge) and Node.js.
 */
function getSubtleCrypto(): any {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  if (typeof crypto !== 'undefined' && (crypto as any).subtle) {
    return (crypto as any).subtle;
  }
  return null;
}

/**
 * Verifies a session token's HMAC-SHA256 signature and expiration using Web Crypto API.
 * Returns null if token is missing, malformed, expired, tampered, or if secret is invalid in production.
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token || typeof token !== 'string') return null;

  const parts = token.trim().split('.');
  if (parts.length !== 2) return null;

  const [data, signature] = parts;
  if (!data || !signature) return null;

  const secret = getAdminSessionSecret();
  if (!secret) {
    // In production with missing/weak secret, fail closed
    return null;
  }

  try {
    const subtle = getSubtleCrypto();
    if (!subtle) {
      console.error('[SessionAuth] SubtleCrypto unavailable in current runtime');
      return null;
    }

    const encoder = new TextEncoder();
    const key = await subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = base64UrlToUint8Array(signature);
    const dataBytes = encoder.encode(data);

    const isValid = await subtle.verify('HMAC', key, sigBytes as any, dataBytes as any);
    if (!isValid) {
      return null;
    }

    const json = base64UrlDecode(data);
    const payload = JSON.parse(json);

    if (!payload || typeof payload !== 'object') {
      return null;
    }

    // Require non-empty string sub
    if (typeof payload.sub !== 'string' || !payload.sub.trim()) {
      return null;
    }

    // Require valid, explicitly allowed role
    if (payload.role !== 'USER' && payload.role !== 'ADMIN') {
      return null;
    }

    // Require numeric, finite, positive iat and exp claims
    if (
      typeof payload.iat !== 'number' ||
      !Number.isFinite(payload.iat) ||
      typeof payload.exp !== 'number' ||
      !Number.isFinite(payload.exp) ||
      payload.iat <= 0 ||
      payload.exp <= 0
    ) {
      return null;
    }

    // Reject tokens where expiration is at or before issuance
    if (payload.exp <= payload.iat) {
      return null;
    }

    const now = Date.now();

    // Reject future-issued tokens beyond clock-skew tolerance
    if (payload.iat > now + CLOCK_SKEW_TOLERANCE_MS) {
      return null;
    }

    // Reject expired tokens
    if (now > payload.exp) {
      return null;
    }

    return {
      sub: payload.sub.trim(),
      email: typeof payload.email === 'string' ? payload.email.trim() : '',
      role: payload.role as SessionRole,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
