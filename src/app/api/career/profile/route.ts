import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getCareerProfileSummary } from '@/server/services/careerIntelligence';
import { upsertUserCareerGoal } from '@/server/db';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const summary = await getCareerProfileSummary(user.id);
    return NextResponse.json({ success: true, profile: summary });
  } catch (err: any) {
    console.error('[API /api/career/profile GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve career intelligence profile',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { targetRole, targetIndustry, experienceLevel, preferredLocation, targetSalary, skillsSummary } = body;

    if (!targetRole || typeof targetRole !== 'string' || !targetRole.trim()) {
      return NextResponse.json({ message: 'Target role is required.' }, { status: 400 });
    }

    const goal = await upsertUserCareerGoal(user.id, {
      targetRole: targetRole.trim(),
      targetIndustry,
      experienceLevel,
      preferredLocation,
      targetSalary,
      skillsSummary,
    });

    const summary = await getCareerProfileSummary(user.id);
    return NextResponse.json({ success: true, goal, profile: summary });
  } catch (err: any) {
    console.error('[API /api/career/profile PUT] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to update career goal',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

export const POST = PUT;

