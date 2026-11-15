import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  getUserActiveRoadmap,
  saveUserRoadmap,
  updateRoadmapStep,
  getUserCareerGoal,
} from '@/server/db';
import { generateLearningRoadmap, performSkillGapAnalysis, getCareerProfileSummary } from '@/server/services/careerIntelligence';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedRole = searchParams.get('targetRole');

    let roadmap = await getUserActiveRoadmap(user.id, requestedRole || undefined);

    // If no roadmap exists yet, generate one only when user or request has an explicit role
    if (!roadmap) {
      const summary = await getCareerProfileSummary(user.id).catch(() => null);
      const careerGoal = await getUserCareerGoal(user.id).catch(() => null);
      const targetRole = (requestedRole || summary?.targetRole || careerGoal?.target_role || '').trim();

      if (!targetRole) {
        return NextResponse.json({
          success: true,
          goalSet: false,
          roadmap: null,
        });
      }

      let missingSkills: string[] = [];
      if (summary) {
        const currentSkills = [
          ...summary.skills.verified.map((v) => v.name),
          ...summary.skills.claimed.map((c) => c.name),
          ...summary.skills.inferred.map((i) => i.name),
        ];
        try {
          const gap = await performSkillGapAnalysis(currentSkills, targetRole);
          missingSkills = [...gap.missingCriticalSkills, ...gap.missingRecommendedSkills];
        } catch {}
      }

      const roadmapData = generateLearningRoadmap(targetRole, missingSkills);
      roadmap = await saveUserRoadmap(user.id, targetRole, roadmapData);
    }

    return NextResponse.json({ success: true, goalSet: true, roadmap });
  } catch (err: any) {
    console.error('[API /api/career/roadmap GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve learning roadmap',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { targetRole, missingSkills } = body;

    const role = (targetRole && typeof targetRole === 'string') ? targetRole.trim() : '';
    if (!role) {
      return NextResponse.json({ message: 'Target role is required to generate a roadmap.' }, { status: 400 });
    }
    const skills = Array.isArray(missingSkills) ? missingSkills : [];

    const roadmapData = generateLearningRoadmap(role, skills);
    const saved = await saveUserRoadmap(user.id, role, roadmapData);

    return NextResponse.json({ success: true, roadmap: saved });
  } catch (err: any) {
    console.error('[API /api/career/roadmap POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to generate learning roadmap',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { roadmapId, milestoneIndex, stepIndex, completed } = body;

    if (!roadmapId || typeof milestoneIndex !== 'number' || typeof stepIndex !== 'number') {
      return NextResponse.json({ message: 'Invalid roadmap step parameters.' }, { status: 400 });
    }

    const result = await updateRoadmapStep(
      user.id,
      roadmapId,
      milestoneIndex,
      stepIndex,
      Boolean(completed)
    );

    if (!result.success) {
      return NextResponse.json({ message: result.error || 'Failed to update step' }, { status: 400 });
    }

    return NextResponse.json({ success: true, roadmap: result.roadmap });
  } catch (err: any) {
    console.error('[API /api/career/roadmap PATCH] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to update roadmap milestone step',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

