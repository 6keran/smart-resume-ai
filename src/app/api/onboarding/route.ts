import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getUserCareerDataSnapshot } from '@/server/db';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const snapshot = await getUserCareerDataSnapshot(user.id);

    return NextResponse.json({
      success: true,
      onboardingStatus: snapshot.onboardingStatus,
      goalSet: snapshot.goalSet,
      targetRole: snapshot.targetRole,
      preferences: snapshot.preferences,
      profile: snapshot.profile,
      skills: snapshot.skills,
    });
  } catch (err: any) {
    console.error('[API /api/onboarding GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to load onboarding state',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

