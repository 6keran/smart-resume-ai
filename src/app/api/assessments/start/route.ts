import { NextResponse } from 'next/server';
import { startAssessmentAttempt } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';
import { getUserFromRequest } from '@/lib/userSession';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid or malformed JSON payload' }, { status: 400 });
    }
    const skill = (body.skill as string) || 'Python';
    const user = await getUserFromRequest(req);
    const visitorId = await getOrCreateVisitorId(req);

    const result = await startAssessmentAttempt(skill, visitorId, user?.id);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          message: result.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('API /api/assessments/start error:', err);
    return NextResponse.json({ message: 'Unable to start assessment.' }, { status: 500 });
  }
}
