import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { fullName, email, password, confirmPassword } = body;

    // 1. Validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return NextResponse.json(
        { message: 'Please provide a valid full name with at least 2 characters.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { message: 'Passwords do not match. Please verify your password.' },
        { status: 400 }
      );
    }

    const visitorId = await getOrCreateVisitorId(req);

    // 2. Register user in DB
    const { user, sessionToken } = await registerUser({
      name: fullName.trim(),
      email: email.trim(),
      password,
      visitorId,
    });

    // 3. Set secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      message: 'Account created successfully.',
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
    console.error('[Auth Registration Error]:', errorMsg);

    const isConflict =
      errorMsg.toLowerCase().includes('already exists') ||
      errorMsg.toLowerCase().includes('unique') ||
      errorMsg.toLowerCase().includes('duplicate');

    if (isConflict) {
      return NextResponse.json(
        { message: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 }
      );
    }

    // Check for known user-facing validation errors from registerUser
    if (
      errorMsg.includes('valid full name') ||
      errorMsg.includes('Full name cannot exceed') ||
      errorMsg.includes('valid email address') ||
      errorMsg.includes('at least 6 characters')
    ) {
      return NextResponse.json({ message: errorMsg }, { status: 400 });
    }

    // Unexpected or database errors: fail safely without leaking SQL/internals
    return NextResponse.json(
      { message: 'Registration service temporarily unavailable. Please try again later.' },
      { status: 500 }
    );
  }
}
