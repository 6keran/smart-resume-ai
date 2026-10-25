import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/sessionAuth';
import { revokeAdminSession, logAuditEvent } from '@/lib/db';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;
    if (token) {
      const verified = await verifySessionToken(token);
      if (verified && verified.sub) {
        await revokeAdminSession(verified.sub);
        await logAuditEvent({
          eventType: 'ADMIN_LOGGED_OUT',
          actorType: 'ADMIN',
          actorId: verified.sub,
          description: `Admin (${verified.email || verified.sub}) logged out`,
        });
      }
    }
  } catch (e: any) {
    console.error('Admin logout audit log error:', e?.message || e);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully.' });
  response.cookies.set('sra_admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
