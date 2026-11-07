import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  analyzeJobApplicationRequirements,
  type JobDetails,
} from '@/server/services/applicationAssistant';
import { getJobApplicationById, updateJobApplication } from '@/server/db';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required. Please sign in to run Job Application Intelligence.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const jobTitle = (body.title || body.jobTitle || '').trim();
    const company = (body.company || '').trim();

    if (!jobTitle || !company) {
      return NextResponse.json(
        { message: 'Job title and company name are required.' },
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
      educationRequirement: body.educationRequirement?.trim() || undefined,
      experienceRequirement: body.experienceRequirement?.trim() || undefined,
    };

    const analysis = await analyzeJobApplicationRequirements(user.id, jobDetails);

    // If an applicationId is passed and belongs to this user, persist matchAnalysis
    const applicationId = body.applicationId || (body.id?.startsWith('app_') ? body.id : undefined);
    if (applicationId) {
      try {
        const app = await getJobApplicationById(user.id, applicationId);
        if (app) {
          await updateJobApplication(user.id, applicationId, {
            matchAnalysis: JSON.stringify(analysis),
          });
        }
      } catch (saveErr) {
        console.warn('[Assistant Analyze] Note: Could not auto-sync to application record:', saveErr);
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (err: any) {
    console.error('[API /api/career/assistant/analyze POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to analyze job requirements.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

