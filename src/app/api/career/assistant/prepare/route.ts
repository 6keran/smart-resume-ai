import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  generateApplicationMaterials,
  type JobDetails,
} from '@/server/services/applicationAssistant';
import { getJobApplicationById, updateJobApplication } from '@/server/db';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required. Please sign in to prepare tailored application materials.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const jobTitle = (body.title || body.jobTitle || '').trim();
    const company = (body.company || '').trim();

    if (!jobTitle || !company) {
      return NextResponse.json(
        { message: 'Job title and company name are required to prepare application materials.' },
        { status: 400 }
      );
    }

    const jobDetails: JobDetails = {
      id: body.id || body.jobId,
      title: jobTitle,
      company,
      location: body.location?.trim() || undefined,
      description: body.description?.trim() || undefined,
      url: body.url?.trim() || body.jobUrl?.trim() || undefined,
      salary: body.salary?.trim() || undefined,
      workArrangement: body.workArrangement?.trim() || undefined,
      opportunityType: body.opportunityType?.trim() || undefined,
      requiredSkills: Array.isArray(body.requiredSkills) ? body.requiredSkills : undefined,
    };

    const materials = await generateApplicationMaterials(user.id, jobDetails);

    // If an applicationId is passed and belongs to this user, persist generated materials
    const applicationId = body.applicationId || (body.id?.startsWith('app_') ? body.id : undefined);
    if (applicationId) {
      try {
        const app = await getJobApplicationById(user.id, applicationId);
        if (app) {
          await updateJobApplication(user.id, applicationId, {
            coverLetter: materials.coverLetter.fullText,
            tailoredSummary: materials.tailoredSummary,
            outreachMessage: materials.recruiterOutreach.linkedInNote,
          });
        }
      } catch (saveErr) {
        console.warn('[Assistant Prepare] Note: Could not auto-sync to application record:', saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      materials,
    });
  } catch (err: any) {
    console.error('[API /api/career/assistant/prepare POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to generate tailored application materials.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

