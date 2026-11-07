/**
 * Server instrumentation hook executed when Next.js server instance is initiated.
 * Enforces production security invariants before serving requests.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';
    const isProduction = (process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL)) && !isBuildPhase;

    if (isProduction) {
      const rawSecret = process.env.ADMIN_SESSION_SECRET || process.env.SESSION_SECRET;
      const secret = typeof rawSecret === 'string' ? rawSecret.trim() : '';

      if (!secret || secret.length < 32) {
        throw new Error(
          '[FATAL SECURITY CONFIGURATION] Server startup halted: ADMIN_SESSION_SECRET or SESSION_SECRET must be configured with a minimum of 32 characters in production.'
        );
      }
    }
  }
}

