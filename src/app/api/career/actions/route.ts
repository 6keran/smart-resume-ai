import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getStudentCareerActions } from '@/server/services/careerActionEngine';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const actionPlan = await getStudentCareerActions(user.id);
    return NextResponse.json({ success: true, actionPlan });
  } catch (err: any) {
    console.error('[API /api/career/actions GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve proactive career actions',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

