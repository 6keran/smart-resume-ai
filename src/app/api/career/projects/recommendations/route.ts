import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getProjectRecommendations } from '@/server/services/projectMentor';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required. Please sign in to view tailored project recommendations.' },
        { status: 401 }
      );
    }

    const { recommendations, studentSummary } = await getProjectRecommendations(user.id);

    return NextResponse.json({
      success: true,
      recommendations,
      studentSummary,
    });
  } catch (err: any) {
    console.error('[API /api/career/projects/recommendations GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve project recommendations.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

