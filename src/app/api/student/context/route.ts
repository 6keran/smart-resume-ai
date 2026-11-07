import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getUnifiedStudentContext } from '@/server/services/unifiedStudentContext';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const context = await getUnifiedStudentContext(user.id);
    return NextResponse.json({ success: true, context });
  } catch (err: any) {
    console.error('[API /api/student/context GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve unified student context',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

