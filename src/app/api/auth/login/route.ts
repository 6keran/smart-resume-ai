import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Please provide both email and password.' },
        { status: 400 }
      );
    }

    const { user, sessionToken } = await loginUser({
      email,
      password,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully.',
      user,
    });

    response.cookies.set('sra_user_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    response.cookies.set('sra_user_name', encodeURIComponent(user.name), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('[Auth Login Error]:', errorMsg);

    if (errorMsg === 'Please enter both email and password.') {
      return NextResponse.json({ message: errorMsg }, { status: 400 });
    }
    if (errorMsg.includes('deactivated')) {
      return NextResponse.json({ message: errorMsg }, { status: 403 });
    }
    if (errorMsg === 'Invalid email or password.') {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 });
    }

    // Unhandled or database errors: fail safely without leaking internal details
    return NextResponse.json(
      { message: 'Authentication service temporarily unavailable. Please try again later.' },
      { status: 500 }
    );
  }
}
