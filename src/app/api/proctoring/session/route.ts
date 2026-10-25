import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  upsertLiveProctoringSession,
  getLiveProctoringSessionDetail,
  verifyAdminToken,
} from '@/server/db';
import { getUserFromRequest } from '@/server/auth/userSession';
import { getOrCreateVisitorId } from '@/lib/visitor';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      assessmentId,
      skill,
      status = 'waiting_camera',
      cameraStatus = 'prompt',
      streamHealth = 'unknown',
      frameRate = 0,
      resolution = 'unknown',
      consentGiven = false,
      candidateName,
      candidateEmail,
    } = body;

    if (!assessmentId || typeof assessmentId !== 'string') {
      return NextResponse.json({ message: 'assessmentId is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const adminToken = cookieStore.get('sra_admin_session')?.value;
    const admin = verifyAdminToken(adminToken);
    const user = await getUserFromRequest(req);

    const isAdmin = Boolean(admin && admin.role === 'ADMIN');
    if (!user && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    // Check ownership if session already exists
    const existing = await getLiveProctoringSessionDetail(assessmentId);
    if (existing && existing.user_id && !isAdmin) {
      if (user && existing.user_id !== user.id) {
        return NextResponse.json({ message: 'Forbidden. You do not own this proctoring session.' }, { status: 403 });
      }
    }

    const visitorId = await getOrCreateVisitorId(req);
    const effectiveName = candidateName || user?.name || 'Candidate';
    const effectiveEmail = candidateEmail || user?.email || (visitorId ? `visitor_${visitorId.slice(0, 8)}` : null);

    const result = await upsertLiveProctoringSession({
      assessmentId,
      userId: user?.id || null,
      candidateName: effectiveName,
      candidateEmail: effectiveEmail,
      skill: skill || 'Technical',
      status,
      cameraStatus,
      streamHealth,
      frameRate,
      resolution,
      consentGiven,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/proctoring/session:', errorMsg);
    return NextResponse.json({ message: 'Failed to update proctoring session.' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assessmentId = searchParams.get('assessmentId');

    if (!assessmentId) {
      return NextResponse.json({ message: 'assessmentId is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const adminToken = cookieStore.get('sra_admin_session')?.value;
    const admin = verifyAdminToken(adminToken);
    const user = await getUserFromRequest(req);

    const isAdmin = Boolean(admin && admin.role === 'ADMIN');
    if (!user && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized. Authentication required.' }, { status: 401 });
    }

    const detail = await getLiveProctoringSessionDetail(assessmentId);
    if (!detail) {
      return NextResponse.json({ message: 'Session not found' }, { status: 404 });
    }

    // Non-admin candidates can only access their own session
    if (!isAdmin && detail.user_id && user && detail.user_id !== user.id) {
      return NextResponse.json({ message: 'Forbidden. You do not own this proctoring session.' }, { status: 403 });
    }

    return NextResponse.json(detail);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in GET /api/proctoring/session:', errorMsg);
    return NextResponse.json({ message: 'Failed to fetch session detail.' }, { status: 500 });
  }
}
