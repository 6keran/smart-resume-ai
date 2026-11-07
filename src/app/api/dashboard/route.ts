import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminTokenAsync, getRealAdminStats } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;

    if (!(await verifyAdminTokenAsync(token))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const stats = await getRealAdminStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error('API /api/dashboard error:', err);
    return NextResponse.json({ message: 'Error retrieving dashboard metrics.' }, { status: 500 });
  }
}
