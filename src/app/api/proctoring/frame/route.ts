import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  saveLiveStreamFrame,
  getLiveStreamFrame,
  getLiveProctoringSessionDetail,
  verifyAdminTokenAsync,
} from '@/server/db';
import { getUserFromRequest } from '@/server/auth/userSession';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assessmentId, frame } = body;

    if (!assessmentId || !frame || typeof frame !== 'string') {
      return NextResponse.json({ message: 'assessmentId and frame are required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const adminToken = cookieStore.get('sra_admin_session')?.value;
    const admin = await verifyAdminTokenAsync(adminToken);
    const user = await getUserFromRequest(req);

    const isAdmin = Boolean(admin && admin.role === 'ADMIN');
    if (!user && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    // Safety check: only save frame if session is in progress or waiting
    const session = await getLiveProctoringSessionDetail(assessmentId);
    if (!session || (session.status !== 'in_progress' && session.status !== 'waiting_camera')) {
      return NextResponse.json({ message: 'Session is not currently active' }, { status: 403 });
    }

    // Ownership check: non-admin must own this session
    if (!isAdmin && session.user_id && user && session.user_id !== user.id) {
      return NextResponse.json({ message: 'Forbidden. You do not own this proctoring session.' }, { status: 403 });
    }

    saveLiveStreamFrame(assessmentId, frame);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/proctoring/frame:', errorMsg);
    return NextResponse.json({ message: 'Failed to record stream frame' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;
    const admin = await verifyAdminTokenAsync(token);

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized. Administrator credentials required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('assessmentId');

    if (!assessmentId) {
      return NextResponse.json({ message: 'assessmentId is required' }, { status: 400 });
    }

    const session = await getLiveProctoringSessionDetail(assessmentId);
    if (!session) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    // Live preview strictly allowed ONLY while an authorized assessment is actively running and candidate has consented!
    if (!session.consent_given) {
      return NextResponse.json(
        { message: 'Candidate has not consented to live video preview.' },
        { status: 403 }
      );
    }

    if (session.status !== 'in_progress') {
      return NextResponse.json(
        { message: `Live preview is disabled because assessment status is ${session.status}.` },
        { status: 403 }
      );
    }

    const frame = getLiveStreamFrame(assessmentId);
    if (!frame) {
      return NextResponse.json({ active: false, frame: null, message: 'No live frame currently available.' });
    }

    return NextResponse.json({
      active: true,
      frame,
      lastHeartbeatAgeSeconds: session.heartbeat_age_seconds,
      streamHealth: session.stream_health,
      resolution: session.resolution,
      frameRate: session.frame_rate,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in GET /api/proctoring/frame:', errorMsg);
    return NextResponse.json({ message: 'Failed to fetch stream frame' }, { status: 500 });
  }
}
