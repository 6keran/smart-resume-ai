import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { saveWebRtcSignal, getWebRtcSignal, getLiveProctoringSessionDetail, verifyAdminToken } from '@/server/db';
import { getUserFromRequest } from '@/server/auth/userSession';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assessmentId, sender, type, data } = body;

    if (!assessmentId || !sender || !type || !data) {
      return NextResponse.json({ message: 'Missing required signaling parameters' }, { status: 400 });
    }

    if (sender !== 'candidate' && sender !== 'admin') {
      return NextResponse.json({ message: 'Invalid sender type' }, { status: 400 });
    }

    if (sender === 'admin') {
      const cookieStore = await cookies();
      const token = cookieStore.get('sra_admin_session')?.value;
      const admin = verifyAdminToken(token);
      if (!admin || admin.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized administrator credentials required' }, { status: 401 });
      }
    } else {
      const user = await getUserFromRequest(req);
      if (!user) {
        return NextResponse.json({ message: 'Unauthorized candidate credentials required' }, { status: 401 });
      }
      const session = await getLiveProctoringSessionDetail(assessmentId);
      if (session && session.user_id && session.user_id !== user.id) {
        return NextResponse.json({ message: 'Forbidden. You do not own this proctoring session.' }, { status: 403 });
      }
    }

    await saveWebRtcSignal(assessmentId, sender, type, data);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/proctoring/signal:', errorMsg);
    return NextResponse.json({ message: 'Failed to save WebRTC signal' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('assessmentId');
    const forRole = (searchParams.get('for') || 'admin') as 'candidate' | 'admin';

    if (!assessmentId) {
      return NextResponse.json({ message: 'assessmentId is required' }, { status: 400 });
    }

    if (forRole === 'admin') {
      const cookieStore = await cookies();
      const token = cookieStore.get('sra_admin_session')?.value;
      const admin = verifyAdminToken(token);
      if (!admin || admin.role !== 'ADMIN') {
        return NextResponse.json({ message: 'Unauthorized administrator credentials required' }, { status: 401 });
      }
    } else {
      const user = await getUserFromRequest(req);
      if (!user) {
        return NextResponse.json({ message: 'Unauthorized candidate credentials required' }, { status: 401 });
      }
      const session = await getLiveProctoringSessionDetail(assessmentId);
      if (session && session.user_id && session.user_id !== user.id) {
        return NextResponse.json({ message: 'Forbidden. You do not own this proctoring session.' }, { status: 403 });
      }
    }

    const signal = await getWebRtcSignal(assessmentId, forRole);
    return NextResponse.json({ success: true, signal });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in GET /api/proctoring/signal:', errorMsg);
    return NextResponse.json({ message: 'Failed to retrieve signal' }, { status: 500 });
  }
}
