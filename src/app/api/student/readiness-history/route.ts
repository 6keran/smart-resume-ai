import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getUserReadinessHistory } from '@/server/db';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '15', 10)));

    const history = await getUserReadinessHistory(user.id, limit);
    return NextResponse.json({ success: true, history, snapshots: history });
  } catch (err: any) {
    console.error('[API /api/student/readiness-history GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve career readiness history',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

