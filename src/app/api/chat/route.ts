import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { GoogleGenAI } from '@google/genai';
import { CANDIDATE_GEMINI_MODELS } from '@/server/services/gemini';
import {
  getDeterministicCareerChatResponse,
  type CareerProfileSummary,
} from '@/server/services/careerIntelligence';
import {
  buildUnifiedStudentContext,
  mapUnifiedToCareerProfileSummary,
  type UnifiedStudentContext,
} from '@/server/services/unifiedStudentContext';
import { buildCareerAssistantPrompt } from '@/server/prompts/careerAssistant';
import {
  chatConcurrencyGate,
  chatRateLimiter,
  getChatPolicyRefusal,
  MAX_CHAT_REQUEST_BYTES,
  sanitizeChatPayload,
  type SafeChatContext,
  type SafeChatMessage,
} from '@/server/services/chatSafety';

const REQUEST_TIMEOUT_MS = 20_000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI request timed out.')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Builds the comprehensive system instruction for the Smart Resume AI Assistant
 * with deep profile grounding, strict prompt-injection defenses, and 8 core guidance capabilities.
 */
function buildSystemInstruction(
  context?: SafeChatContext,
  userProfile?: CareerProfileSummary | null,
  unifiedContext?: UnifiedStudentContext | null
): string {
  return buildCareerAssistantPrompt({
    context,
    userProfile,
    unifiedContext,
  });
}

/**
 * Sanitizes and formats multi-turn chat history for Google GenAI.
 * Enforces alternating user/model turns, discards leading model messages,
 * and ensures the latest user message is the terminal turn.
 */
function formatChatContents(history: SafeChatMessage[], latestUserMessage: string) {
  const cleanHistory = (Array.isArray(history) ? history : [])
    .filter((m) => m && typeof m.content === 'string' && m.content.trim().length > 0)
    .map((m) => ({
      role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model',
      text: m.content.trim(),
    }));

  // Discard any initial model greeting so conversation starts with a user turn
  while (cleanHistory.length > 0 && cleanHistory[0].role === 'model') {
    cleanHistory.shift();
  }

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const msg of cleanHistory) {
    if (contents.length === 0) {
      if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.text }] });
      }
    } else {
      const prevRole = contents[contents.length - 1].role;
      if (msg.role !== prevRole) {
        contents.push({ role: msg.role, parts: [{ text: msg.text }] });
      } else {
        // If consecutive messages have the same role, combine their text
        contents[contents.length - 1].parts[0].text += `\n\n${msg.text}`;
      }
    }
  }

  // Append latest user message
  if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts[0].text += `\n\n${latestUserMessage}`;
  } else {
    contents.push({ role: 'user', parts: [{ text: latestUserMessage }] });
  }

  return contents;
}

export async function POST(req: Request) {
  let activeUserId: string | null = null;
  let parsedPayload: ReturnType<typeof sanitizeChatPayload>['payload'] = undefined;
  let cachedProfile: CareerProfileSummary | null = null;
  let cachedUnified: UnifiedStudentContext | null = null;
  try {
    // Reject oversized bodies before parsing them. This route never needs attachments.
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_CHAT_REQUEST_BYTES) {
      return NextResponse.json(
        { message: 'Chat request is too large.' },
        { status: 413 }
      );
    }

    const user = await getUserFromRequest(req).catch(() => null);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required. Please sign in to interact with the AI Assistant.' },
        { status: 401 }
      );
    }

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_CHAT_REQUEST_BYTES) {
      return NextResponse.json({ message: 'Chat request is too large.' }, { status: 413 });
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ message: 'Invalid chat request.' }, { status: 400 });
    }

    const { payload, error: payloadError } = sanitizeChatPayload(parsedBody);
    if (!payload) {
      const messages = {
        invalid: 'Invalid chat request.',
        empty: 'Message cannot be empty.',
        message_too_long: 'Messages must be 2,000 characters or fewer.',
        history_too_large: 'Conversation history is too large.',
        context_too_large: 'Career context is too large.',
      } as const;
      return NextResponse.json({ message: messages[payloadError || 'invalid'] }, { status: 400 });
    }

    parsedPayload = payload;

    const rateLimit = chatRateLimiter.check(user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: `Too many chat requests. Please wait ${rateLimit.retryAfterSeconds} seconds before sending another message.`,
          error: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const policyRefusal = getChatPolicyRefusal(payload.message, payload.history);
    if (policyRefusal) {
      return NextResponse.json({
        reply: policyRefusal,
        provider: 'Smart Policy Guard',
        isLive: false,
      });
    }

    if (!chatConcurrencyGate.tryStart(user.id)) {
      return NextResponse.json(
        { message: 'A response is already being prepared. Please wait for it to finish.' },
        { status: 429, headers: { 'Retry-After': '1' } }
      );
    }
    activeUserId = user.id;

    // Fetch unified student context once; derive career profile summary without duplicate database queries
    const unifiedStudentContext = await buildUnifiedStudentContext(user.id).catch(() => null);
    const userCareerProfile = unifiedStudentContext
      ? mapUnifiedToCareerProfileSummary(unifiedStudentContext)
      : null;
    cachedUnified = unifiedStudentContext;
    cachedProfile = userCareerProfile;

    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();

    if (!apiKey) {
      const fallbackReply = getDeterministicCareerChatResponse(payload.message, userCareerProfile, unifiedStudentContext);
      return NextResponse.json({
        reply: fallbackReply,
        provider: 'AI Assistant Deterministic Engine',
        isLive: false,
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = buildSystemInstruction(payload.context, userCareerProfile, unifiedStudentContext);
    const contents = formatChatContents(payload.history, payload.message);

    let lastError: Error | null = null;
    let replyText = '';
    let isQuotaError = false;

    for (const modelName of CANDIDATE_GEMINI_MODELS) {
      try {
        const response = await withTimeout(
          ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction,
              temperature: 0.5,
              maxOutputTokens: 900,
            },
          }),
          REQUEST_TIMEOUT_MS
        );

        if (response && response.text) {
          let cleaned = response.text.replace(/\u0000/g, '').trim();
          // Filter out prompt-leak artifacts if model regurgitated identity instructions
          if (cleaned.startsWith(': "I\'m your AI Assistant."') || cleaned.startsWith('"I\'m your AI Assistant."') || cleaned.startsWith(": 'I\\'m your AI Assistant.'")) {
            cleaned = cleaned.replace(/^[:\s"']+I'm your AI Assistant\.[^)]*\)\.?\s*(\*\s*Never refer[^\n]*)?/i, '').trim();
          }
          if (cleaned.length > 20) {
            replyText = cleaned.slice(0, 6_000);
            break;
          }
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        console.warn(`[Chat API] Gemini request failed for ${modelName}.`);

        // Detect quota exhaustion
        if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded')) {
          isQuotaError = true;
        }

        // If authentication error or invalid key, retrying other models won't help
        if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('API_KEY_INVALID')) {
          break;
        }
      }
    }

    if (!replyText) {
      // Gracefully fall back to deterministic career copilot response
      const fallbackReply = getDeterministicCareerChatResponse(payload.message, userCareerProfile, unifiedStudentContext);
      return NextResponse.json({
        reply: fallbackReply,
        provider: 'AI Assistant Deterministic Engine',
        isLive: false,
      });
    }

    return NextResponse.json({
      reply: replyText,
      provider: 'Gemini',
      isLive: true,
    });
  } catch (err: unknown) {
    console.error('[Chat API] Unexpected chat request failure.', err);
    if (parsedPayload?.message) {
      const fallbackReply = getDeterministicCareerChatResponse(
        parsedPayload.message,
        cachedProfile,
        cachedUnified
      );
      return NextResponse.json({
        reply: fallbackReply,
        provider: 'AI Assistant Deterministic Engine',
        isLive: false,
      });
    }
    return NextResponse.json(
      { message: 'Chat service temporarily unavailable. Please try again.' },
      { status: 500 }
    );
  } finally {
    if (activeUserId) chatConcurrencyGate.finish(activeUserId);
  }
}
