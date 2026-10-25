import { NextResponse } from 'next/server';
import { submitAssessmentAttempt, getAssessmentAttemptDetail } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';
import { getUserFromRequest } from '@/lib/userSession';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      attemptId,
      userAnswers = {},
      proctoringEvents = [],
      durationSeconds = 1200,
      terminationReason,
    } = body;

    if (!attemptId) {
      return NextResponse.json({ message: 'attemptId is required' }, { status: 400 });
    }

    const user = await getUserFromRequest(req);
    const visitorId = await getOrCreateVisitorId(req);

    const graded = await submitAssessmentAttempt({
      attemptId,
      userAnswers,
      proctoringEvents,
      durationSeconds,
      terminationReason,
      requesterUserId: user?.id,
      requesterVisitorId: visitorId,
    }) as any;

    if (graded && graded.error) {
      const status = typeof graded.error === 'string' && graded.error.startsWith('unauthorized') ? 403 : 400;
      return NextResponse.json(graded, { status });
    }

    // Retrieve snapshot details to calculate topic breakdown if desired
    const detail = await getAssessmentAttemptDetail(attemptId);
    const snapshots = detail?.snapshots || [];

    const topicMap: Record<string, { correct: number; total: number }> = {};
    snapshots.forEach((s) => {
      const topic = s.questionType || 'Technical';
      if (!topicMap[topic]) topicMap[topic] = { correct: 0, total: 0 };
      topicMap[topic].total += 1;
      if (s.isCorrect) topicMap[topic].correct += 1;
    });

    const topicBreakdown = Object.entries(topicMap).map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
    }));

    try {
      const { endLiveProctoringSession } = await import('@/server/db');
      await endLiveProctoringSession(attemptId, graded?.status === 'terminated' ? 'terminated' : 'completed');
    } catch {}

    return NextResponse.json({
      ...graded,
      userAnswers,
      proctoringEvents,
      topicBreakdown,
    });
  } catch (err: any) {
    console.error('API /api/assessments/submit error:', err);
    if (err?.message?.startsWith('Unauthorized')) {
      return NextResponse.json({ message: err.message }, { status: 403 });
    }
    return NextResponse.json({ message: err?.message || 'Unable to grade assessment submission.' }, { status: 500 });
  }
}
