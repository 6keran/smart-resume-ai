import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getJobApplicationById, updateJobApplication } from '@/server/db';
import { computeChecklistProgress, getDefaultChecklistState } from '@/server/services/applicationAssistant';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const application = await getJobApplicationById(user.id, id);
    if (!application) {
      return NextResponse.json(
        { message: 'Application not found or unauthorized.' },
        { status: 404 }
      );
    }

    // Safely parse JSON fields if present
    let parsedChecklist = null;
    if (application.checklistState) {
      try {
        parsedChecklist = typeof application.checklistState === 'string'
          ? JSON.parse(application.checklistState)
          : application.checklistState;
      } catch {
        parsedChecklist = getDefaultChecklistState();
      }
    } else {
      parsedChecklist = getDefaultChecklistState();
    }

    let parsedMatchAnalysis = null;
    if (application.matchAnalysis) {
      try {
        parsedMatchAnalysis = typeof application.matchAnalysis === 'string'
          ? JSON.parse(application.matchAnalysis)
          : application.matchAnalysis;
      } catch {
        parsedMatchAnalysis = null;
      }
    }

    return NextResponse.json({
      success: true,
      application: {
        ...application,
        checklist: parsedChecklist,
        matchAnalysisData: parsedMatchAnalysis,
      },
    });
  } catch (err: any) {
    console.error('[API /api/career/assistant/application/[id] GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve application.',
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
      return NextResponse.json(
        { message: 'Authentication required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const existing = await getJobApplicationById(user.id, id);
    if (!existing) {
      return NextResponse.json(
        { message: 'Application not found or unauthorized.' },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const updatePayload: any = {};

    if (body.status !== undefined) {
      updatePayload.status = body.status;
      if (body.status === 'Applied' && !existing.appliedConfirmedAt && !body.appliedConfirmedAt) {
        updatePayload.appliedConfirmedAt = new Date().toISOString();
      }
    }

    if (body.appliedConfirmedAt !== undefined) {
      updatePayload.appliedConfirmedAt = body.appliedConfirmedAt;
    }

    if (body.coverLetter !== undefined) {
      updatePayload.coverLetter = body.coverLetter;
    }

    if (body.tailoredSummary !== undefined) {
      updatePayload.tailoredSummary = body.tailoredSummary;
    }

    if (body.outreachMessage !== undefined) {
      updatePayload.outreachMessage = body.outreachMessage;
    }

    if (body.interviewDate !== undefined) {
      updatePayload.interviewDate = body.interviewDate;
    }

    if (body.notes !== undefined) {
      updatePayload.notes = body.notes;
    }

    if (body.jobUrl !== undefined) {
      updatePayload.jobUrl = body.jobUrl;
    }

    if (body.matchAnalysis !== undefined) {
      updatePayload.matchAnalysis = typeof body.matchAnalysis === 'object'
        ? JSON.stringify(body.matchAnalysis)
        : body.matchAnalysis;
    }

    if (body.checklistState !== undefined) {
      const processedChecklist = typeof body.checklistState === 'object'
        ? computeChecklistProgress(body.checklistState)
        : body.checklistState;
      updatePayload.checklistState = typeof processedChecklist === 'object'
        ? JSON.stringify(processedChecklist)
        : processedChecklist;

      // If student manually marked applicationSubmitted = true in checklist, advance status
      if (
        typeof processedChecklist === 'object' &&
        processedChecklist.applicationSubmitted &&
        existing.status !== 'Applied' &&
        existing.status !== 'Interview' &&
        existing.status !== 'Offer'
      ) {
        updatePayload.status = 'Applied';
        updatePayload.appliedConfirmedAt = new Date().toISOString();
      }
    }

    const updated = await updateJobApplication(user.id, id, updatePayload);
    if (!updated) {
      return NextResponse.json(
        { message: 'Failed to update application.' },
        { status: 500 }
      );
    }

    let parsedChecklist = null;
    if (updated.checklistState) {
      try {
        parsedChecklist = typeof updated.checklistState === 'string'
          ? JSON.parse(updated.checklistState)
          : updated.checklistState;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      application: {
        ...updated,
        checklist: parsedChecklist,
      },
    });
  } catch (err: any) {
    console.error('[API /api/career/assistant/application/[id] PATCH] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to update application.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}
