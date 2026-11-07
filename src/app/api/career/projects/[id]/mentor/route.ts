import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getAiCodingMentorResponse } from '@/server/services/projectMentor';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_CODE_LENGTH = 4000;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required. Please sign in to consult with your AI Coding Mentor.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message : typeof body.question === 'string' ? body.question : '';
    const { codeSnippet, history } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { message: 'Question or prompt is required.' },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { message: `Question must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    const cleanCode = typeof codeSnippet === 'string' ? codeSnippet.slice(0, MAX_CODE_LENGTH) : undefined;
    const cleanHistory = Array.isArray(history)
      ? history.slice(-6).map((h: any) => ({
          role: h.role === 'model' ? ('model' as const) : ('user' as const),
          content: String(h.content || h.text || '').slice(0, 1500),
        }))
      : [];

    const response = await getAiCodingMentorResponse({
      projectId: id,
      userMessage: message.trim(),
      codeSnippet: cleanCode,
      history: cleanHistory,
      userId: user.id,
    });

    return NextResponse.json({
      success: true,
      reply: response.reply,
      response: response.reply,
      provider: response.provider,
      isLive: response.isLive,
    });
  } catch (err: any) {
    console.error('[API /api/career/projects/[id]/mentor POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Coding mentor temporarily unavailable.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}
