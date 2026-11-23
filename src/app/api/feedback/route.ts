import { NextResponse } from 'next/server';
import { recordFeedbackEvent } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';
import { getUserFromRequest } from '@/lib/userSession';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid or malformed JSON payload' }, { status: 400 });
    }
    const { rating, category, suggestions } = body;
    const feedbackText = body.feedback || body.message;

    if (!rating || !feedbackText) {
      return NextResponse.json(
        { message: 'Rating and feedback text are required.' },
        { status: 400 }
      );
    }

    const user = await getUserFromRequest(req);
    const visitorId = await getOrCreateVisitorId(req);
    const feedbackId = await recordFeedbackEvent({
      visitorId,
      userId: user?.id,
      rating: Number(rating),
      category: category || 'General UX',
      message: feedbackText,
      suggestions: suggestions || '',
    });

    const recorded = {
      id: feedbackId,
      rating,
      category: category || 'General UX',
      feedback: feedbackText,
      suggestions: suggestions || '',
      submittedAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, data: recorded });
  } catch (err) {
    console.error('API /api/feedback error:', err);
    return NextResponse.json({ message: 'Failed to record feedback.' }, { status: 500 });
  }
}
