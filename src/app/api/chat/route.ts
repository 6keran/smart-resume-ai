import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { GoogleGenAI } from '@google/genai';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY_MESSAGES = 10;

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatContext {
  jobTitle?: string;
  company?: string;
  jobDescription?: string;
  resumeSnippet?: string;
}

/**
 * Builds the comprehensive system instruction for the versatile Smart Resume AI Assistant.
 */
function buildSystemInstruction(context?: ChatContext): string {
  let instruction = `You are the AI Assistant in Smart Resume AI.
You are a helpful, versatile, and highly capable AI assistant with broad expertise across programming, software engineering, technical concepts, mathematics, writing, general knowledge, and career development.

CORE DIRECTIVES:
1. Answer the User's Actual Question Directly:
   - Always respond directly to what the user asks, matching the tone and detail level appropriate for the topic.
   - For programming questions (e.g., Python, JavaScript, React, Next.js, SQL, system design, debugging): Provide accurate, modern, well-explained code snippets and practical solutions.
   - For general knowledge, science, geography, history, or everyday writing (e.g., "What is the capital of Japan?", "Write a leave application"): Provide clear, natural, and helpful answers without bringing up resumes or ATS unless the user asked about them.
   - For follow-up questions (e.g., "Explain this in simpler words", "Give another example", "What about MongoDB?"): Maintain full context from previous turns in the conversation and adapt your explanation seamlessly.
2. Resume & Career Expertise:
   - When the user asks about resumes, ATS optimization, cover letters, interviews, or career transitions: Provide world-class, actionable advice. Emphasize verified action verbs, quantifiable achievements (using the Google XYZ / STAR method), and authentic experience without ever inventing fake qualifications.
3. Brevity & Flow:
   - Avoid generic canned introductions or repetitive robotic disclaimers. Get straight to the answer.
   - Format responses cleanly with markdown headings, bullet points, or code blocks where beneficial.
4. Factual Integrity & Transparency:
   - If you are uncertain about a fact or limitation, admit it honestly rather than hallucinating.
   - Never claim to have executed a real-world system action or database modification that did not occur.
5. Context Sensitivity:
   - If user resume or target job context is provided below, treat it as optional background reference. Use it ONLY when the user asks a question about their resume, job applications, or career. Do NOT force or inject it into general technical, programming, writing, or everyday questions.`;

  if (context) {
    const parts: string[] = [];
    if (context.jobTitle) parts.push(`Target Role: ${context.jobTitle}`);
    if (context.company) parts.push(`Target Company: ${context.company}`);
    if (context.jobDescription) {
      parts.push(`Job Description Snippet: ${context.jobDescription.substring(0, 500)}`);
    }
    if (context.resumeSnippet) {
      parts.push(`Resume Summary Snippet: ${context.resumeSnippet.substring(0, 500)}`);
    }

    if (parts.length > 0) {
      instruction += `\n\nOPTIONAL USER BACKGROUND CONTEXT (Refer to this ONLY when relevant to the user's career or resume inquiry):\n${parts.join('\n')}`;
    }
  }

  return instruction;
}

/**
 * Sanitizes and formats multi-turn chat history for Google GenAI.
 * Enforces alternating user/model turns, discards leading model messages,
 * and ensures the latest user message is the terminal turn.
 */
function formatChatContents(history: ChatMessage[], latestUserMessage: string) {
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
  try {
    // Enforce authenticated user session
    const user = await getUserFromRequest(req).catch(() => null);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required. Please sign in to interact with the AI Assistant.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const { message, history, context } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ message: 'Message content is required.' }, { status: 400 });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length === 0) {
      return NextResponse.json({ message: 'Message cannot be empty.' }, { status: 400 });
    }

    if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { message: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          message:
            'Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file to enable AI chatbot conversations.',
          error: 'CONFIG_MISSING_API_KEY',
        },
        { status: 503 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const systemInstruction = buildSystemInstruction(context);
    const validHistory = Array.isArray(history) ? history.slice(-MAX_HISTORY_MESSAGES) : [];
    const contents = formatChatContents(validHistory, trimmedMessage);

    // Call Gemini with primary fast model, cascade to secondary fallbacks if model experiences high demand
    const candidateModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
    let lastError: Error | null = null;
    let replyText = '';
    let usedModel = 'Gemini 3.5 Flash';

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.5,
            maxOutputTokens: 1500,
          },
        });

        if (response && response.text) {
          replyText = response.text.trim();
          usedModel = modelName.includes('3.5')
            ? 'Gemini 3.5 Flash'
            : modelName.includes('3.8')
            ? 'Gemini 3.8 Flash'
            : modelName.includes('latest')
            ? 'Gemini Flash'
            : 'Gemini Flash';
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        console.warn(`[Chat API] Model ${modelName} error:`, errMsg.slice(0, 150));
        // If authentication error or invalid key, retrying other models won't help
        if (errMsg.includes('401') || errMsg.includes('403') || errMsg.includes('API_KEY_INVALID')) {
          break;
        }
      }
    }

    if (!replyText) {
      const errDetail = lastError?.message || 'Unable to generate response from model.';
      console.error('[Chat API] All model attempts failed:', errDetail);

      // Return a clean, user-friendly error to allow retrying
      return NextResponse.json(
        {
          message: `AI service error: ${errDetail}. Please verify your API key and connection, then try again.`,
          error: 'AI_MODEL_FAILED',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      reply: replyText,
      provider: usedModel,
      isLive: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Chat API] Unhandled server error:', msg);
    return NextResponse.json(
      { message: `Chat service temporarily unavailable: ${msg}` },
      { status: 500 }
    );
  }
}
