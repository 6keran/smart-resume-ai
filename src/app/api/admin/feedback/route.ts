import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminTokenAsync, updateFeedbackStatus } from '@/lib/db';

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;

    if (!(await verifyAdminTokenAsync(token))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ message: 'Feedback ID and status are required' }, { status: 400 });
    }

    const updated = await updateFeedbackStatus(id, status);
    if (!updated) {
      return NextResponse.json({ message: 'Feedback item not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Status updated' });
  } catch (err) {
    console.error('API /api/admin/feedback PATCH error:', err);
    return NextResponse.json({ message: 'Failed to update feedback status.' }, { status: 500 });
  }
}
