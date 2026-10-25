import { NextResponse } from 'next/server';
import { getAdminByEmail, verifyPassword, recordAdminLogin, createSessionToken } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const admin = await getAdminByEmail(email);

    if (!admin || !admin.is_active) {
      // Do not reveal whether user exists
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      id: admin.id,
      email: admin.email,
      role: admin.role,
    });

    await recordAdminLogin(admin.id, token);

    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
      },
    });

    response.cookies.set('sra_admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    console.error('Admin login error:', err);
    return NextResponse.json(
      { message: 'Authentication service temporarily unavailable.' },
      { status: 500 }
    );
  }
}
