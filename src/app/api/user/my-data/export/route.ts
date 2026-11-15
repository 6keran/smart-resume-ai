import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getUserCareerDataSnapshot } from '@/server/db';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const snapshot = await getUserCareerDataSnapshot(user.id);
    const payload = {
      exportedAt: new Date().toISOString(),
      ...snapshot,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="smart-resume-career-data.json"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('[API /api/user/my-data/export GET] Error:', err);
    return NextResponse.json({ message: 'Failed to export career data' }, { status: 500 });
  }
}

