/**
 * Unified Analytics & Telemetry Abstraction Layer
 * Supports: PostHog, Microsoft Clarity, Sentry
 * Core events: resume_created, ats_completed, project_generated, interview_started, job_saved
 * GDPR Compliance: Full client-side opt-out controls and zero tracking when opted out.
 */

export type CoreAnalyticsEventName =
  | 'resume_created'
  | 'ats_completed'
  | 'project_generated'
  | 'interview_started'
  | 'job_saved';

export interface CoreEventPayloads {
  resume_created: { resumeId: string; templateId?: string; candidateType?: string };
  ats_completed: { atsScore: number; keywordMatchRate?: number; parseable?: boolean };
  project_generated: { projectTitle: string; targetRole?: string; techStack?: string[] };
  interview_started: { role?: string; questionCount?: number; difficulty?: string };
  job_saved: { jobId: string; company: string; title: string; source?: string };
}

export interface AnalyticsProvider {
  name: 'posthog' | 'clarity' | 'sentry';
  track?: (event: string, properties?: Record<string, any>) => void;
  identify?: (userId: string, traits?: Record<string, any>) => void;
  captureException?: (error: unknown, context?: Record<string, any>) => void;
}

const OPT_OUT_STORAGE_KEY = 'sra_analytics_opt_out';

/**
 * Check whether the current user has opted out of analytics (GDPR compliance).
 */
export function isAnalyticsOptedOut(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(OPT_OUT_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Set analytics opt-out preference (GDPR compliance).
 */
export function setAnalyticsOptOut(optOut: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OPT_OUT_STORAGE_KEY, String(optOut));
  } catch {}
}

/**
 * Built-in provider adapters detecting live globals if configured by deployment env.
 */
function getActiveProviders(): AnalyticsProvider[] {
  if (typeof window === 'undefined' || isAnalyticsOptedOut()) {
    return [];
  }

  const providers: AnalyticsProvider[] = [];
  const win = window as any;

  // PostHog adapter
  if (win.posthog) {
    providers.push({
      name: 'posthog',
      track: (event, props) => win.posthog.capture?.(event, props),
      identify: (uid, traits) => win.posthog.identify?.(uid, traits),
    });
  }

  // Microsoft Clarity adapter
  if (win.clarity) {
    providers.push({
      name: 'clarity',
      track: (event, props) => win.clarity?.('event', event, props),
      identify: (uid) => win.clarity?.('identify', uid),
    });
  }

  // Sentry adapter
  if (win.Sentry) {
    providers.push({
      name: 'sentry',
      captureException: (err, ctx) => win.Sentry.captureException?.(err, { extra: ctx }),
      identify: (uid, traits) => win.Sentry.setUser?.({ id: uid, ...traits }),
    });
  }

  return providers;
}

/**
 * Dispatches a typed core analytics event to all configured active telemetry providers.
 * Guaranteed no-op when running server-side or when the user has opted out.
 */
export function trackEvent<E extends CoreAnalyticsEventName>(
  event: E,
  properties?: CoreEventPayloads[E] & Record<string, any>
): void {
  if (typeof window === 'undefined' || isAnalyticsOptedOut()) {
    return;
  }

  const providers = getActiveProviders();
  providers.forEach((provider) => {
    try {
      provider.track?.(event, properties);
    } catch (err) {
      console.warn(`[Analytics:${provider.name}] track error:`, err);
    }
  });

  // Local development event logging
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[Analytics Event] ${event}:`, properties);
  }
}

/**
 * Identifies the user across active providers.
 */
export function identifyUser(userId: string, traits?: Record<string, any>): void {
  if (typeof window === 'undefined' || isAnalyticsOptedOut()) {
    return;
  }

  const providers = getActiveProviders();
  providers.forEach((provider) => {
    try {
      provider.identify?.(userId, traits);
    } catch (err) {
      console.warn(`[Analytics:${provider.name}] identify error:`, err);
    }
  });
}

/**
 * Dispatches error exceptions to Sentry or active error tracking provider.
 */
export function captureAppException(error: unknown, context?: Record<string, any>): void {
  if (typeof window === 'undefined' || isAnalyticsOptedOut()) {
    return;
  }

  const providers = getActiveProviders();
  providers.forEach((provider) => {
    try {
      provider.captureException?.(error, context);
    } catch {}
  });
}
