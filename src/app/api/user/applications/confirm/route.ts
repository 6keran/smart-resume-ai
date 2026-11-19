import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { confirmJobApplication } from '@/lib/db';

const VALID_CONFIRM_STATUSES = ['Applied', 'Ready to apply', 'Saved'] as const;

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid or malformed JSON payload' }, { status: 400 });
    }
    const { applicationId, status, resumeId } = body;

    if (!applicationId) {
      return NextResponse.json({ message: 'Application ID is required' }, { status: 400 });
    }

    if (!status || !VALID_CONFIRM_STATUSES.includes(status)) {
      return NextResponse.json(
        { message: `Invalid status. Must be one of: ${VALID_CONFIRM_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const updated = await confirmJobApplication(user.id, applicationId, status, resumeId);

    return NextResponse.json({
      success: true,
      message: status === 'Applied' ? 'Application confirmed and recorded.' : `Status updated to ${status}.`,
      application: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error confirming application:', msg);
    return NextResponse.json({ message: msg || 'Failed to confirm application' }, { status: 400 });
  }
}
