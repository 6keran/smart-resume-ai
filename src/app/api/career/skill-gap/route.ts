import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { performSkillGapAnalysis, getCareerProfileSummary } from '@/server/services/careerIntelligence';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req).catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { currentSkills, jobDescription } = body;
    let targetRole = typeof body.targetRole === 'string' ? body.targetRole.trim() : '';

    let skillsList: string[] = Array.isArray(currentSkills) ? currentSkills : [];

    // If candidate is logged in, reuse profile goal and skills when omitted
    if (user && (!targetRole || skillsList.length === 0)) {
      try {
        const summary = await getCareerProfileSummary(user.id);
        if (!targetRole) targetRole = (summary.targetRole || '').trim();
        if (skillsList.length === 0) {
          skillsList = [
            ...summary.skills.verified.map((v) => v.name),
            ...summary.skills.claimed.map((c) => c.name),
            ...summary.skills.inferred.map((i) => i.name),
          ];
        }
      } catch {}
    }

    if (!targetRole) {
      return NextResponse.json({
        success: true,
        goalSet: false,
        result: null,
        analysis: null,
        message: 'Target role is not set.',
      });
    }

    const result = await performSkillGapAnalysis(skillsList, targetRole, jobDescription);
    return NextResponse.json({ success: true, goalSet: true, result, analysis: result });
  } catch (err: any) {
    console.error('[API /api/career/skill-gap] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to perform skill gap analysis',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}
