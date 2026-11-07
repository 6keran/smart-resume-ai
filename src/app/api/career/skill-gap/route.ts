import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { performSkillGapAnalysis, getCareerProfileSummary } from '@/server/services/careerIntelligence';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req).catch(() => null);
    const body = await req.json().catch(() => ({}));
    const { currentSkills, jobDescription } = body;
    let targetRole = body.targetRole;

    if (!targetRole || typeof targetRole !== 'string') {
      targetRole = 'Full Stack Developer';
    }

    let skillsList: string[] = Array.isArray(currentSkills) ? currentSkills : [];

    // If candidate is logged in and no skills were passed, automatically aggregate candidate's skills
    if (skillsList.length === 0 && user) {
      try {
        const summary = await getCareerProfileSummary(user.id);
        skillsList = [
          ...summary.skills.verified.map((v) => v.name),
          ...summary.skills.claimed.map((c) => c.name),
          ...summary.skills.inferred.map((i) => i.name),
        ];
      } catch {}
    }

    const result = await performSkillGapAnalysis(skillsList, targetRole, jobDescription);
    return NextResponse.json({ success: true, result, analysis: result });
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
