import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { updateOnboardingState } from '@/server/db';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const profile = await updateOnboardingState(user.id, 'skipped');
    return NextResponse.json({
      success: true,
      onboardingStatus: profile.onboardingStatus,
    });
  } catch (err: any) {
    console.error('[API /api/onboarding/skip POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to skip onboarding',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

