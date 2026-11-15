import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  upsertStudentProfile,
  bulkUpsertUserSkills,
  deleteUserSkill,
  type BulkSkillUpsertInput,
} from '@/server/db';
import { findCuratedRoleProfile } from '@/lib/career/roleProfiles';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const rawTargetRole = typeof body.targetRole === 'string' ? body.targetRole.trim() : '';
    const curatedRole = rawTargetRole ? findCuratedRoleProfile(rawTargetRole) : null;

    const workMode = ['remote', 'hybrid', 'onsite', 'any'].includes(body.workMode)
      ? body.workMode
      : 'any';
    const jobTypes: string[] = Array.isArray(body.jobTypes)
      ? body.jobTypes.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];
    const experienceBand = ['student', 'fresher', 'early_career', 'experienced'].includes(body.experienceBand)
      ? body.experienceBand
      : undefined;
    const careerInterests: string[] = Array.isArray(body.careerInterests)
      ? body.careerInterests.map((x: unknown) => String(x).trim()).filter(Boolean)
      : [];

    const hasInternship = jobTypes.some((t) => t.toLowerCase().includes('intern'));
    const hasFullTime = jobTypes.some((t) => t.toLowerCase().includes('full'));
    const targetWorkType =
      hasInternship && !hasFullTime ? 'internship' : hasFullTime && !hasInternship ? 'full_time' : 'both';

    const studentType =
      experienceBand === 'student'
        ? 'college_student'
        : experienceBand === 'fresher'
        ? 'recent_graduate'
        : 'fresher';

    const graduationYearNum = Number(body.graduationYear);
    const safeGradYear =
      Number.isFinite(graduationYearNum) && graduationYearNum >= 1980 && graduationYearNum <= new Date().getFullYear() + 10
        ? graduationYearNum
        : 0;

    const preferredLocations: string[] = Array.isArray(body.preferredLocations)
      ? body.preferredLocations.map((x: unknown) => String(x).trim()).filter(Boolean)
      : typeof body.preferredLocation === 'string' && body.preferredLocation.trim()
      ? [body.preferredLocation.trim()]
      : [];

    const now = new Date().toISOString();

    const profile = await upsertStudentProfile(user.id, {
      targetRole: rawTargetRole,
      institution: typeof body.institution === 'string' ? body.institution.trim() : '',
      degree: typeof body.degree === 'string' ? body.degree.trim() : '',
      fieldOfStudy: typeof body.fieldOfStudy === 'string' ? body.fieldOfStudy.trim() : '',
      graduationYear: safeGradYear,
      studentType,
      targetWorkType,
      preferredLocations,
      onboardingStatus: 'completed',
      onboardingCompletedAt: now,
      preferences: {
        targetRoleSlug: curatedRole?.slug || null,
        workMode,
        jobTypes,
        experienceBand,
        careerInterests,
      },
    });

    const confirmedSkillsInput: BulkSkillUpsertInput[] = Array.isArray(body.confirmedSkills)
      ? body.confirmedSkills
          .map((item: any): BulkSkillUpsertInput | null => {
            const skillName =
              typeof item === 'string'
                ? item.trim()
                : typeof item?.skillName === 'string'
                ? item.skillName.trim()
                : typeof item?.name === 'string'
                ? item.name.trim()
                : '';
            if (!skillName) return null;
            const source =
              item?.source === 'resume_parsed' ||
              item?.source === 'user_added' ||
              item?.source === 'assessed' ||
              item?.source === 'verified'
                ? item.source
                : 'user_added';
            return {
              skillName,
              category: typeof item?.category === 'string' && item.category.trim() ? item.category.trim() : 'General',
              source,
              status: 'claimed',
              confidence: typeof item?.confidence === 'number' ? item.confidence : 1.0,
              confirmedAt: now,
            };
          })
          .filter(Boolean) as BulkSkillUpsertInput[]
      : [];

    if (Array.isArray(body.rejectedSkills)) {
      for (const rejected of body.rejectedSkills) {
        const cleanRejected = String(rejected || '').trim();
        if (cleanRejected) {
          await deleteUserSkill(user.id, cleanRejected).catch(() => {});
        }
      }
    }

    const skills = await bulkUpsertUserSkills(user.id, confirmedSkillsInput);

    return NextResponse.json({
      success: true,
      profile,
      skills,
      goalSet: Boolean(profile.targetRole),
    });
  } catch (err: any) {
    console.error('[API /api/onboarding/complete POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to save onboarding selections',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

