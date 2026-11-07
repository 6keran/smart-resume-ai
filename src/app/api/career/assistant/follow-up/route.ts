import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  generateFollowUpMessage,
  type GenerateFollowUpParams,
} from '@/server/services/applicationAssistant';
import { getJobApplicationById } from '@/server/db';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required. Please sign in to generate follow-up messages.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let jobTitle = (body.jobTitle || body.title || '').trim();
    let company = (body.company || '').trim();
    let status = body.status || 'Applied';
    let appliedAt = body.appliedAt || null;
    let interviewDate = body.interviewDate || null;
    let notes = body.notes || '';

    // If applicationId is provided, enrich with real stored application details
    if (body.applicationId) {
      const app = await getJobApplicationById(user.id, body.applicationId);
      if (app) {
        jobTitle = jobTitle || app.jobTitle;
        company = company || app.company;
        status = status || app.status;
        appliedAt = appliedAt || app.appliedConfirmedAt || app.appliedAt;
        interviewDate = interviewDate || app.interviewDate;
        notes = notes || app.notes || '';
      }
    }

    if (!jobTitle || !company) {
      return NextResponse.json(
        { message: 'Job title and company name are required to generate follow-up messages.' },
        { status: 400 }
      );
    }

    const followUpType: 'post_application' | 'post_interview' =
      body.type === 'post_interview' || status === 'Interview' ? 'post_interview' : 'post_application';

    const params: GenerateFollowUpParams = {
      applicationId: body.applicationId,
      jobTitle,
      company,
      status,
      appliedAt,
      interviewDate,
      type: followUpType,
      channel: body.channel === 'linkedin' ? 'linkedin' : 'email',
      studentName: user.name || 'Candidate',
      notes,
    };

    const followUp = generateFollowUpMessage(params);

    return NextResponse.json({
      success: true,
      followUp,
    });
  } catch (err: any) {
    console.error('[API /api/career/assistant/follow-up POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to generate follow-up message.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

