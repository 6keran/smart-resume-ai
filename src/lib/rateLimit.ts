import type { NextRequest } from 'next/server';

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory store for rate-limiting anonymous requests
const store = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupStaleEntries(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, record] of store.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);
    if (record.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  resetInSeconds: number;
  visitorId: string;
}

export interface RateLimitOptions {
  limit?: number;
  windowMs?: number;
}

/**
 * Extracts a reliable client identifier from headers and cookies.
 */
export function getClientIdentifier(request: NextRequest): { key: string; visitorId: string } {
  const visitorCookie = request.cookies.get('sra_visitor_id')?.value;
  
  // Extract forwarded or real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '127.0.0.1';

  const visitorId = visitorCookie?.trim() || `anon_${ip.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now().toString(36)}`;
  const key = `ats_scan:${visitorCookie?.trim() || ip}`;

  return { key, visitorId };
}

/**
 * Rate limits anonymous ATS resume scans.
 * Default: 5 scans per 10 minutes per visitor/IP.
 */
export function checkAnonymousAtsRateLimit(
  request: NextRequest,
  options: RateLimitOptions = {}
): RateLimitResult {
  const limit = options.limit ?? 5;
  const windowMs = options.windowMs ?? 10 * 60 * 1000; // 10 minutes
  const now = Date.now();

  cleanupStaleEntries(windowMs);

  const { key, visitorId } = getClientIdentifier(request);

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter out timestamps outside the active window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));

    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfter,
      resetInSeconds: retryAfter,
      visitorId,
    };
  }

  // Record this request
  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  const resetInSeconds = Math.ceil(windowMs / 1000);

  return {
    allowed: true,
    limit,
    remaining,
    retryAfter: 0,
    resetInSeconds,
    visitorId,
  };
}

export type AuthRateLimitAction = 'login' | 'register' | 'admin_login';

/**
 * Rate limits sensitive authentication requests (login, registration, admin login).
 * Enforces sliding-window limits strictly per IP address to prevent cookie-deletion bypass.
 * Defaults:
 * - login: 10 attempts per 5 minutes
 * - admin_login: 5 attempts per 5 minutes
 * - register: 5 attempts per 15 minutes
 */
export function checkAuthRateLimit(
  request: NextRequest,
  action: AuthRateLimitAction,
  options: RateLimitOptions = {}
): RateLimitResult {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : realIp || '127.0.0.1';

  const defaultConfigs: Record<AuthRateLimitAction, { limit: number; windowMs: number }> = {
    login: { limit: 10, windowMs: 5 * 60 * 1000 },
    admin_login: { limit: 5, windowMs: 5 * 60 * 1000 },
    register: { limit: 5, windowMs: 15 * 60 * 1000 },
  };

  const config = defaultConfigs[action];
  const limit = options.limit ?? config.limit;
  const windowMs = options.windowMs ?? config.windowMs;
  const now = Date.now();

  cleanupStaleEntries(windowMs);

  const key = `auth:${action}:${ip}`;

  let record = store.get(key);
  if (!record) {
    record = { timestamps: [] };
    store.set(key, record);
  }

  // Filter timestamps within active sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldestTimestamp = record.timestamps[0];
    const resetTime = oldestTimestamp + windowMs;
    const retryAfter = Math.max(1, Math.ceil((resetTime - now) / 1000));

    return {
      allowed: false,
      limit,
      remaining: 0,
      retryAfter,
      resetInSeconds: retryAfter,
      visitorId: ip,
    };
  }

  // Record this attempt
  record.timestamps.push(now);
  const remaining = Math.max(0, limit - record.timestamps.length);
  const resetInSeconds = Math.ceil(windowMs / 1000);

  return {
    allowed: true,
    limit,
    remaining,
    retryAfter: 0,
    resetInSeconds,
    visitorId: ip,
  };
}

/**
 * Helper to reset rate limits during automated testing.
 */
export function resetRateLimitsForTesting(): void {
  store.clear();
}

