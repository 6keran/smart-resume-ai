import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminTokenAsync,
  getProctoringSummary,
  recordProctoringEvent,
  getDb,
} from '@/lib/db';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sra_admin_session')?.value;
  return Boolean(await verifyAdminTokenAsync(token));
}

export async function GET() {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const summary = await getProctoringSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('API /api/admin/proctoring GET error:', err);
    return NextResponse.json({ message: 'Failed to retrieve proctoring data' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, assessmentId, reason } = body;

    if (!assessmentId) {
      return NextResponse.json({ message: 'Missing assessmentId' }, { status: 400 });
    }

    const db = getDb();

    if (action === 'terminate') {
      db.prepare(`
        UPDATE assessments
        SET status = 'terminated', passed = 0
        WHERE id = ?
      `).run(assessmentId);

      await recordProctoringEvent(
        assessmentId,
        'ADMIN_TERMINATED',
        'violation',
        reason || 'Assessment terminated by proctoring administrator.'
      );

      try {
        const { endLiveProctoringSession } = await import('@/server/db');
        await endLiveProctoringSession(assessmentId, 'terminated');
      } catch {}

      return NextResponse.json({ success: true, message: 'Assessment terminated successfully' });
    }

    if (action === 'warn') {
      await recordProctoringEvent(
        assessmentId,
        'ADMIN_WARNING_ISSUED',
        'warning',
        reason || 'Formal warning issued by proctoring administrator.'
      );

      return NextResponse.json({ success: true, message: 'Warning recorded in session audit' });
    }

    return NextResponse.json({ message: 'Invalid proctoring action' }, { status: 400 });
  } catch (err) {
    console.error('API /api/admin/proctoring POST error:', err);
    return NextResponse.json({ message: 'Failed to perform proctoring action' }, { status: 500 });
  }
}
