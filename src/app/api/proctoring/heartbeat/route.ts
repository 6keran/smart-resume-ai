import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { updateLiveProctoringHeartbeat, getLiveProctoringSessionDetail, verifyAdminTokenAsync } from '@/server/db';
import { getUserFromRequest } from '@/server/auth/userSession';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      assessmentId,
      status,
      cameraStatus,
      streamHealth,
      frameRate,
      resolution,
    } = body;

    if (!assessmentId) {
      return NextResponse.json({ message: 'assessmentId is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const adminToken = cookieStore.get('sra_admin_session')?.value;
    const admin = await verifyAdminTokenAsync(adminToken);
    const user = await getUserFromRequest(req);

    const isAdmin = Boolean(admin && admin.role === 'ADMIN');
    if (!user && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    const session = await getLiveProctoringSessionDetail(assessmentId);
    if (!session) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    // Ownership check: non-admin must own this session
    if (!isAdmin && session.user_id && user && session.user_id !== user.id) {
      return NextResponse.json({ message: 'Forbidden. You do not own this proctoring session.' }, { status: 403 });
    }

    const result = await updateLiveProctoringHeartbeat(assessmentId, {
      status,
      cameraStatus,
      streamHealth,
      frameRate,
      resolution,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/proctoring/heartbeat:', errorMsg);
    return NextResponse.json({ message: 'Failed to record heartbeat.' }, { status: 500 });
  }
}
