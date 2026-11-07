import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getStudentProfile, upsertStudentProfile } from '@/server/db';
import { getCareerProfileSummary } from '@/server/services/careerIntelligence';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getStudentProfile(user.id);
    return NextResponse.json({
      success: true,
      profile,
      isConfigured: Boolean(profile && profile.institution && profile.degree),
    });
  } catch (err: any) {
    console.error('[API /api/student/profile GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve student profile',
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
    const {
      institution,
      degree,
      fieldOfStudy,
      graduationYear,
      graduationMonth,
      currentSemester,
      cgpa,
      studentType,
      targetRole,
      targetWorkType,
      preferredLocations,
      projects,
      coursework,
      achievements,
    } = body;

    // Validation
    if (!institution || typeof institution !== 'string' || !institution.trim()) {
      return NextResponse.json({ message: 'College/University name is required.' }, { status: 400 });
    }
    if (!degree || typeof degree !== 'string' || !degree.trim()) {
      return NextResponse.json({ message: 'Degree or program name is required.' }, { status: 400 });
    }
    if (!fieldOfStudy || typeof fieldOfStudy !== 'string' || !fieldOfStudy.trim()) {
      return NextResponse.json({ message: 'Field of study / major is required.' }, { status: 400 });
    }

    const gradYearNum = Number(graduationYear);
    const currentYear = new Date().getFullYear();
    if (isNaN(gradYearNum) || gradYearNum < 1990 || gradYearNum > currentYear + 10) {
      return NextResponse.json(
        { message: `Graduation year must be between 1990 and ${currentYear + 10}.` },
        { status: 400 }
      );
    }

    const validStudentTypes = ['college_student', 'recent_graduate', 'fresher'];
    const safeStudentType = validStudentTypes.includes(studentType) ? studentType : 'college_student';

    const validWorkTypes = ['internship', 'full_time', 'both'];
    const safeWorkType = validWorkTypes.includes(targetWorkType) ? targetWorkType : 'both';

    const updatedProfile = await upsertStudentProfile(user.id, {
      institution: institution.trim(),
      degree: degree.trim(),
      fieldOfStudy: fieldOfStudy.trim(),
      graduationYear: gradYearNum,
      graduationMonth: typeof graduationMonth === 'string' ? graduationMonth.trim() : null,
      currentSemester: typeof currentSemester === 'string' ? currentSemester.trim() : null,
      cgpa: typeof cgpa === 'string' ? cgpa.trim() : null,
      studentType: safeStudentType,
      targetRole: typeof targetRole === 'string' && targetRole.trim() ? targetRole.trim() : 'Graduate Software Engineer',
      targetWorkType: safeWorkType,
      preferredLocations: Array.isArray(preferredLocations)
        ? preferredLocations.map((l: any) => String(l).trim()).filter(Boolean)
        : [],
      projects: Array.isArray(projects)
        ? projects.map((p: any) => ({
            id: String(p.id || `proj_${Math.random().toString(36).slice(2, 9)}`),
            title: String(p.title || '').trim(),
            description: String(p.description || '').trim(),
            role: p.role ? String(p.role).trim() : undefined,
            techStack: Array.isArray(p.techStack)
              ? p.techStack.map((t: any) => String(t).trim()).filter(Boolean)
              : [],
            repoUrl: p.repoUrl ? String(p.repoUrl).trim() : undefined,
            liveUrl: p.liveUrl ? String(p.liveUrl).trim() : undefined,
            highlights: Array.isArray(p.highlights)
              ? p.highlights.map((h: any) => String(h).trim()).filter(Boolean)
              : [],
            startDate: p.startDate ? String(p.startDate).trim() : undefined,
            endDate: p.endDate ? String(p.endDate).trim() : undefined,
          }))
        : [],
      coursework: Array.isArray(coursework)
        ? coursework.map((c: any) => String(c).trim()).filter(Boolean)
        : [],
      achievements: Array.isArray(achievements)
        ? achievements.map((a: any) => String(a).trim()).filter(Boolean)
        : [],
    });

    const refreshedSummary = await getCareerProfileSummary(user.id);

    try {
      const { recordStudentReadinessSnapshot, clearStudentContextCache } = await import('@/server/services/unifiedStudentContext');
      clearStudentContextCache(user.id);
      await recordStudentReadinessSnapshot(
        user.id,
        'profile_completed',
        `Profile updated: ${updatedProfile.degree} at ${updatedProfile.institution} (Target: ${updatedProfile.targetRole})`
      );
    } catch (snapErr) {
      console.warn('[Student Profile] Non-blocking snapshot error:', snapErr);
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      summary: refreshedSummary,
    });
  } catch (err: any) {
    console.error('[API /api/student/profile PUT] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to update student profile',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

export const POST = PUT;

