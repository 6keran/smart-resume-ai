import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyAdminTokenAsync } from '@/lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;

    if (!token) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAdminTokenAsync(token);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      admin: {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch (err) {
    console.error('Admin me error:', err);
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
}
