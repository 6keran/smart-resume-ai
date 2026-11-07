export type NaukriUnavailableReason = 'challenge' | 'restricted';

export interface NaukriCooldownStatus {
  reason: NaukriUnavailableReason;
  statusCode: number;
  retryAt: string;
  remainingMs: number;
}

export class NaukriProviderUnavailableError extends Error {
  constructor(
    readonly status: NaukriCooldownStatus,
    readonly isCooldown: boolean
  ) {
    const reason = status.reason === 'challenge'
      ? `Naukri requires CAPTCHA verification (HTTP ${status.statusCode}).`
      : `Naukri access is restricted (HTTP ${status.statusCode}).`;
    super(isCooldown ? `Naukri requests are paused until ${status.retryAt}.` : reason);
    this.name = 'NaukriProviderUnavailableError';
  }
}

const MIN_COOLDOWN_MS = 1_000;
const MAX_COOLDOWN_MS = 10 * 60 * 1_000;
const DEFAULT_COOLDOWN_MS = 5 * 60 * 1_000;

export class NaukriProviderCooldown {
  private cooldownUntil = 0;
  private reason: NaukriUnavailableReason | null = null;
  private statusCode = 0;
  private readonly cooldownMs: number;

  constructor(
    cooldownMs = DEFAULT_COOLDOWN_MS,
    private readonly now: () => number = Date.now
  ) {
    this.cooldownMs = Math.min(MAX_COOLDOWN_MS, Math.max(MIN_COOLDOWN_MS, cooldownMs));
  }

  block(reason: NaukriUnavailableReason, statusCode: number): NaukriCooldownStatus {
    this.reason = reason;
    this.statusCode = statusCode;
    this.cooldownUntil = this.now() + this.cooldownMs;
    return this.getStatus()!;
  }

  getStatus(): NaukriCooldownStatus | null {
    const now = this.now();
    if (!this.reason || now >= this.cooldownUntil) {
      this.clear();
      return null;
    }

    return {
      reason: this.reason,
      statusCode: this.statusCode,
      retryAt: new Date(this.cooldownUntil).toISOString(),
      remainingMs: this.cooldownUntil - now,
    };
  }

  throwIfBlocked(): void {
    const status = this.getStatus();
    if (status) throw new NaukriProviderUnavailableError(status, true);
  }

  clear(): void {
    this.cooldownUntil = 0;
    this.reason = null;
    this.statusCode = 0;
  }
}

export const naukriProviderCooldown = new NaukriProviderCooldown();

export function classifyNaukriResponse(
  statusCode: number,
  responseBody: string
): NaukriUnavailableReason | null {
  const body = responseBody.toLocaleLowerCase();
  const challengeDetected = /captcha|recaptcha|automated.{0,30}challenge|security.{0,30}verification|verify.{0,30}human/.test(body);

  if (challengeDetected) return 'challenge';
  if ([401, 403, 406].includes(statusCode)) return 'restricted';
  return null;
}
