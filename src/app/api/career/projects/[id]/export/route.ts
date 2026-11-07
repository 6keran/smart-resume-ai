import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  getGuidedProjectById,
  updateGuidedProject,
  getStudentProfile,
  importGuidedProjectToProfileAndResume,
} from '@/server/db';
import { generateProjectResumeBullets } from '@/server/services/projectMentor';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const project = await getGuidedProjectById(id, user.id);
    if (!project) {
      return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
    }

    const studentProfile = await getStudentProfile(user.id).catch(() => null);

    // 1. Generate verified Google XYZ resume bullets
    const bulletsResult = generateProjectResumeBullets(project, studentProfile);

    // 2. Persist bullets on guided project
    await updateGuidedProject(id, user.id, {
      resumeBullets: bulletsResult.bullets,
    });

    // 3. Atomically import into Student Profile Portfolio and latest Resume Builder document
    const importResult = await importGuidedProjectToProfileAndResume(user.id, id);

    return NextResponse.json({
      success: true,
      projectTitle: project.title,
      description: bulletsResult.description,
      bullets: bulletsResult.bullets,
      techStackFormatted: bulletsResult.techStackFormatted,
      studentProfileUpdated: importResult.studentProfileUpdated,
      resumeUpdated: importResult.resumeUpdated,
      advice: bulletsResult.advice,
    });
  } catch (err: any) {
    console.error('[API /api/career/projects/[id]/export POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to export project to resume.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

