import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  getUserCareerDataSnapshot,
  upsertStudentProfile,
  addUserSkill,
  confirmUserSkill,
  deleteUserSkill,
  clearUserCareerData,
} from '@/server/db';
import { findCuratedRoleProfile } from '@/lib/career/roleProfiles';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const snapshot = await getUserCareerDataSnapshot(user.id);
    return NextResponse.json({ success: true, ...snapshot });
  } catch (err: any) {
    console.error('[API /api/user/my-data GET] Error:', err);
    return NextResponse.json({ message: 'Failed to load career data' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === 'string' ? body.action : 'updateProfile';

    if (action === 'addSkill') {
      const skillName = typeof body.skillName === 'string' ? body.skillName.trim() : '';
      const category = typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'General';
      if (!skillName || skillName.length > 80) {
        return NextResponse.json({ message: 'Valid skill name is required.' }, { status: 400 });
      }
      await addUserSkill(user.id, skillName, category, true, {
        source: 'user_added',
        confidence: 1.0,
        confirmedAt: new Date().toISOString(),
      });
    } else if (action === 'confirmSkill') {
      const skillTarget = typeof body.skill === 'string' ? body.skill.trim() : '';
      if (!skillTarget) {
        return NextResponse.json({ message: 'Skill identifier is required.' }, { status: 400 });
      }
      const updated = await confirmUserSkill(user.id, skillTarget);
      if (!updated) {
        return NextResponse.json({ message: 'Skill not found.' }, { status: 404 });
      }
    } else if (action === 'deleteSkill') {
      const skillTarget = typeof body.skill === 'string' ? body.skill.trim() : '';
      if (!skillTarget) {
        return NextResponse.json({ message: 'Skill identifier is required.' }, { status: 400 });
      }
      const result = await deleteUserSkill(user.id, skillTarget);
      if (!result.success) {
        return NextResponse.json({ message: result.error || 'Skill not found.' }, { status: 404 });
      }
    } else {
      const rawTargetRole = body.targetRole !== undefined ? String(body.targetRole || '').trim() : undefined;
      const curated = rawTargetRole ? findCuratedRoleProfile(rawTargetRole) : null;

      await upsertStudentProfile(user.id, {
        ...(rawTargetRole !== undefined ? { targetRole: rawTargetRole } : {}),
        ...(body.institution !== undefined ? { institution: String(body.institution || '').trim() } : {}),
        ...(body.degree !== undefined ? { degree: String(body.degree || '').trim() } : {}),
        ...(body.fieldOfStudy !== undefined ? { fieldOfStudy: String(body.fieldOfStudy || '').trim() } : {}),
        ...(body.graduationYear !== undefined
          ? { graduationYear: Number(body.graduationYear) || 0 }
          : {}),
        ...(Array.isArray(body.preferredLocations)
          ? {
              preferredLocations: body.preferredLocations
                .map((x: unknown) => String(x).trim())
                .filter(Boolean),
            }
          : {}),
        preferences: {
          ...(rawTargetRole !== undefined ? { targetRoleSlug: curated?.slug || null } : {}),
          ...(body.workMode && ['remote', 'hybrid', 'onsite', 'any'].includes(body.workMode)
            ? { workMode: body.workMode }
            : {}),
          ...(Array.isArray(body.jobTypes)
            ? { jobTypes: body.jobTypes.map((x: unknown) => String(x).trim()).filter(Boolean) }
            : {}),
          ...(body.experienceBand &&
          ['student', 'fresher', 'early_career', 'experienced'].includes(body.experienceBand)
            ? { experienceBand: body.experienceBand }
            : {}),
        },
      });
    }

    const snapshot = await getUserCareerDataSnapshot(user.id);
    return NextResponse.json({ success: true, ...snapshot });
  } catch (err: any) {
    console.error('[API /api/user/my-data PATCH] Error:', err);
    return NextResponse.json({ message: 'Failed to update career data' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    if (body?.confirm !== 'CLEAR') {
      return NextResponse.json(
        { message: 'Confirmation payload { confirm: "CLEAR" } is required.' },
        { status: 400 }
      );
    }

    await clearUserCareerData(user.id);
    const snapshot = await getUserCareerDataSnapshot(user.id);
    return NextResponse.json({ success: true, ...snapshot });
  } catch (err: any) {
    console.error('[API /api/user/my-data DELETE] Error:', err);
    return NextResponse.json({ message: 'Failed to clear career data' }, { status: 500 });
  }
}

