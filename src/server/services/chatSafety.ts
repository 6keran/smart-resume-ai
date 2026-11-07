import 'server-only';

export const MAX_CHAT_REQUEST_BYTES = 16_000;
export const MAX_CHAT_MESSAGE_LENGTH = 2_000;
export const MAX_CHAT_HISTORY_MESSAGES = 10;
export const MAX_CHAT_HISTORY_CHARACTERS = 8_000;
export const MAX_CHAT_CONTEXT_CHARACTERS = 1_800;

export interface SafeChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SafeChatContext {
  jobTitle?: string;
  company?: string;
  jobDescription?: string;
  resumeSnippet?: string;
  currentPath?: string;
  activeWorkflow?: string;
}

export interface SafeChatPayload {
  message: string;
  history: SafeChatMessage[];
  context?: SafeChatContext;
}

export type ChatPayloadError = 'invalid' | 'empty' | 'message_too_long' | 'history_too_large' | 'context_too_large';

function cleanText(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const normalized = value.replace(/\u0000/g, '').trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

export function sanitizeChatPayload(value: unknown): { payload?: SafeChatPayload; error?: ChatPayloadError } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'invalid' };
  const body = value as Record<string, unknown>;

  let rawMessage = typeof body.message === 'string' ? body.message : undefined;
  let rawHistory = Array.isArray(body.history) ? body.history : [];

  if (!rawMessage && Array.isArray(body.messages) && body.messages.length > 0) {
    const lastItem = body.messages[body.messages.length - 1];
    if (typeof lastItem === 'string') {
      rawMessage = lastItem;
    } else if (lastItem && typeof lastItem === 'object') {
      rawMessage = (lastItem as any).content || (lastItem as any).text || '';
    }
    if (body.messages.length > 1 && rawHistory.length === 0) {
      rawHistory = body.messages.slice(0, -1).map((m: any) => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user',
        content: typeof m === 'string' ? m : m.content || m.text || '',
      }));
    }
  }

  if (typeof rawMessage !== 'string') return { error: 'invalid' };
  const message = cleanText(rawMessage, MAX_CHAT_MESSAGE_LENGTH);
  if (!message) return { error: 'empty' };
  if (rawMessage.trim().length > MAX_CHAT_MESSAGE_LENGTH) return { error: 'message_too_long' };

  const boundedHistory = rawHistory.slice(-MAX_CHAT_HISTORY_MESSAGES);
  const history = boundedHistory.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const record = entry as Record<string, unknown>;
    if (record.role !== 'user' && record.role !== 'assistant') return [];
    const content = cleanText(record.content, MAX_CHAT_MESSAGE_LENGTH);
    return content ? [{ role: record.role as 'user' | 'assistant', content }] : [];
  });

  if (history.reduce((total, entry) => total + entry.content.length, 0) > MAX_CHAT_HISTORY_CHARACTERS) {
    return { error: 'history_too_large' };
  }

  let context: SafeChatContext | undefined;
  if (body.context && typeof body.context === 'object' && !Array.isArray(body.context)) {
    const rawContext = body.context as Record<string, unknown>;
    const candidate: SafeChatContext = {
      jobTitle: cleanText(rawContext.jobTitle, 160),
      company: cleanText(rawContext.company, 160),
      jobDescription: cleanText(rawContext.jobDescription, 750),
      resumeSnippet: cleanText(rawContext.resumeSnippet, 750),
      currentPath: cleanText(rawContext.currentPath, 120),
      activeWorkflow: cleanText(rawContext.activeWorkflow, 80),
    };
    const totalContextLength = Object.values(candidate).reduce((total, item) => total + (item?.length || 0), 0);
    if (totalContextLength > MAX_CHAT_CONTEXT_CHARACTERS) return { error: 'context_too_large' };
    if (totalContextLength > 0) context = candidate;
  }

  return { payload: { message, history, context } };
}

const sensitiveRequestPattern = /(?:ignore|override|disregard|bypass).{0,80}(?:previous|system|developer|instruction)|(?:reveal|show|print|repeat|give).{0,100}(?:system prompt|developer message|internal instruction|api key|environment variable|credential|secret|database connection|private config)|(?:another|other|someone else(?:'s)?).{0,100}(?:resume|conversation|application|assessment|profile)/i;
const clearlyOutOfScopePattern = /(?:capital of|weather(?:\s+forecast)?|recipe|horoscope|sports score|movie review|celebrity gossip|solve this (?:math|physics) problem|write (?:a )?(?:poem|song|fiction))/i;
const careerScopePattern = /\b(?:career|jobs?|roles?|resumes?|cv|ats|interviews?|recruit(?:er|ing|ers)?|applications?|cover letters?|salary|compensation|promotion|workplace|managers?|professional|portfolios?|projects?|capstones?|network(?:ing)?|skills?|certif(?:ication|ied|ications)?|learning|assessments?|coursework|courseworks?|college|university|degrees?|students?|freshers?|graduat(?:e|es|ion)?|career change|notice period|offers?|employment|hiring|internships?|apprenticeships?|freelance|onboarding|work experience|performance reviews?)\b/i;

export function getChatPolicyRefusal(message: string, history: SafeChatMessage[] = []): string | null {
  if (sensitiveRequestPattern.test(message)) {
    return 'I can’t reveal internal instructions, credentials, private configuration, or another person’s information. I can help with your own resume, job search, interviews, or career planning.';
  }

  // Allow polite greetings, assistant identity, and capability inquiries
  const isIdentityOrGreeting = /^(?:hi|hello|hey|greetings|good\s+(?:morning|afternoon|evening)|what(?:'s|\s+is)\s+(?:your\s+)?name|who\s+are\s+you|what\s+are\s+you(?: called)?|tell\s+me\s+about\s+yourself|what\s+can\s+you\s+do|how\s+can\s+you\s+help|are\s+you\s+(?:an?\s+)?ai(?:\s+assistant)?|are\s+you\s+alex|is\s+your\s+name\s+alex)\b/i.test(message.trim());
  if (isIdentityOrGreeting) {
    return null;
  }

  // A short follow-up such as “can you make that stronger?” is valid when the
  // preceding conversation is clearly career-related. The browser-provided
  // history has already been size-bounded and role-validated above.
  const recentCareerContext = history.slice(-4).some((entry) => careerScopePattern.test(entry.content));
  if ((clearlyOutOfScopePattern.test(message) || !careerScopePattern.test(message)) && !recentCareerContext) {
    return 'I’m focused on careers, resumes, job search, skills, interview preparation, and using Smart Resume AI. What would you like help with in one of those areas?';
  }

  return null;
}

export interface ChatRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface RateRecord {
  timestamps: number[];
}

export class ChatRateLimiter {
  private readonly records = new Map<string, RateRecord>();
  private lastPruneAt = 0;
  private readonly limit: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(
    limit = 12,
    windowMs = 5 * 60 * 1_000,
    now: () => number = Date.now
  ) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.now = now;
  }

  check(userId: string): ChatRateLimitResult {
    const now = this.now();
    this.pruneExpiredRecords(now);
    const record = this.records.get(userId) || { timestamps: [] };
    record.timestamps = record.timestamps.filter((timestamp) => now - timestamp < this.windowMs);

    if (record.timestamps.length >= this.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.timestamps[0] + this.windowMs - now) / 1_000));
      this.records.set(userId, record);
      return { allowed: false, retryAfterSeconds };
    }

    record.timestamps.push(now);
    this.records.set(userId, record);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  clear(): void {
    this.records.clear();
    this.lastPruneAt = 0;
  }

  private pruneExpiredRecords(now: number): void {
    // Keep the process-local limiter bounded without doing a full Map scan for
    // every request. This is intentionally best-effort; the request's own
    // record is always pruned immediately below.
    if (now - this.lastPruneAt < 60_000) return;
    this.lastPruneAt = now;

    for (const [userId, record] of this.records) {
      record.timestamps = record.timestamps.filter((timestamp) => now - timestamp < this.windowMs);
      if (record.timestamps.length === 0) this.records.delete(userId);
    }
  }
}

export class ChatConcurrencyGate {
  private readonly activeUsers = new Set<string>();

  tryStart(userId: string): boolean {
    if (this.activeUsers.has(userId)) return false;
    this.activeUsers.add(userId);
    return true;
  }

  finish(userId: string): void {
    this.activeUsers.delete(userId);
  }

  clear(): void {
    this.activeUsers.clear();
  }
}

export const chatRateLimiter = new ChatRateLimiter();
export const chatConcurrencyGate = new ChatConcurrencyGate();

export function resetChatSafetyForTesting(): void {
  chatRateLimiter.clear();
  chatConcurrencyGate.clear();
}
