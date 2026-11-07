import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getCareerProfileSummary } from '@/server/services/careerIntelligence';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const summary = await getCareerProfileSummary(user.id);

    return NextResponse.json({
      success: true,
      readiness: summary.explainableReadiness || null,
      targetRole: summary.targetRole,
      studentProfile: summary.studentProfile || null,
      metrics: summary.metrics,
    });
  } catch (err: any) {
    console.error('[API /api/student/readiness GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve career readiness evaluation',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

