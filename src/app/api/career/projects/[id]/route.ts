import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  getGuidedProjectById,
  updateGuidedProject,
  deleteGuidedProject,
} from '@/server/db';

export async function GET(
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

    return NextResponse.json({
      success: true,
      project,
    });
  } catch (err: any) {
    console.error('[API /api/career/projects/[id] GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve project.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      milestones,
      currentMilestone,
      progressPercent,
      status,
      githubUrl,
      liveUrl,
      resumeBullets,
      title,
    } = body;

    const existing = await getGuidedProjectById(id, user.id);
    if (!existing) {
      return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
    }

    // Auto-calculate progress percentage if milestones array updated
    let calculatedProgress = progressPercent;
    if (Array.isArray(milestones) && progressPercent === undefined) {
      const completedCount = milestones.filter((m: any) => m.isCompleted).length;
      calculatedProgress = Math.min(100, Math.round((completedCount / Math.max(1, milestones.length)) * 100));
    }

    const updated = await updateGuidedProject(id, user.id, {
      title: title !== undefined ? String(title).trim() : undefined,
      milestones: Array.isArray(milestones) ? milestones : undefined,
      currentMilestone: currentMilestone !== undefined ? Number(currentMilestone) : undefined,
      progressPercent: calculatedProgress !== undefined ? Number(calculatedProgress) : undefined,
      status: ['in_progress', 'completed', 'paused'].includes(status) ? status : undefined,
      githubUrl: githubUrl !== undefined ? String(githubUrl).trim() : undefined,
      liveUrl: liveUrl !== undefined ? String(liveUrl).trim() : undefined,
      resumeBullets: Array.isArray(resumeBullets) ? resumeBullets : undefined,
    });

    return NextResponse.json({
      success: true,
      project: updated,
    });
  } catch (err: any) {
    console.error('[API /api/career/projects/[id] PATCH] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to update project.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await getGuidedProjectById(id, user.id);
    if (!existing) {
      return NextResponse.json({ message: 'Project not found.' }, { status: 404 });
    }

    await deleteGuidedProject(id, user.id);

    return NextResponse.json({
      success: true,
      message: 'Project removed successfully.',
    });
  } catch (err: any) {
    console.error('[API /api/career/projects/[id] DELETE] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to delete project.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

