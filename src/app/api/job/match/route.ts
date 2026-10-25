import { NextResponse } from 'next/server';
import { matchResumeToJob } from '@/lib/gemini';
import { validateResumeDocument } from '@/lib/resumeValidator';
import { recordJobMatchEvent } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';
import { getUserFromRequest } from '@/lib/userSession';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { resumeId, jobId, resumeText, jobTitle, company, jobDescription, allowUncertainOverride } = body;

    if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
      return NextResponse.json(
        { message: 'Resume content is required for job matching.' },
        { status: 400 }
      );
    }

    if (!jobDescription || typeof jobDescription !== 'string' || jobDescription.trim().length < 20) {
      return NextResponse.json(
        { message: 'A valid job description (minimum 20 characters) is required for accurate matching.' },
        { status: 400 }
      );
    }

    const cleanJobTitle = (typeof jobTitle === 'string' && jobTitle.trim()) || 'Target Role';
    const cleanCompany = (typeof company === 'string' && company.trim()) || 'Target Company';

    // Enforce document validation to prevent non-resume documents from bypassing validation
    const validation = validateResumeDocument(resumeText, { allowUncertainOverride: Boolean(allowUncertainOverride) });
    if (!validation.isValid) {
      return NextResponse.json(
        {
          message: validation.message,
          validation,
        },
        { status: 422 }
      );
    }

    const result = await matchResumeToJob(
      resumeText,
      cleanJobTitle,
      cleanCompany,
      jobDescription
    );

    if (jobId && typeof jobId === 'string') {
      result.jobId = jobId;
    }

    // Persist to database
    try {
      const user = await getUserFromRequest(req);
      const visitorId = await getOrCreateVisitorId(req);
      await recordJobMatchEvent({
        visitorId,
        userId: user?.id,
        resumeId: typeof resumeId === 'string' ? resumeId : undefined,
        jobId: typeof jobId === 'string' ? jobId : undefined,
        jobTitle: cleanJobTitle,
        company: cleanCompany,
        matchScore: result.overallMatchScore,
        matchedSkills: (result.matchedSkills || []).map((s: any) => typeof s === 'string' ? s : s.skill),
        partialSkills: (result.partialSkills || []).map((s: any) => typeof s === 'string' ? s : s.skill),
        missingSkills: (result.missingSkills || []).map((s: any) => typeof s === 'string' ? s : s.skill),
      });
    } catch (dbErr: any) {
      console.log('[DB Event Error] Failed to persist job match:', dbErr?.message);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error('API /api/job/match error:', err);
    return NextResponse.json(
      { message: 'Unable to evaluate job match at this time.' },
      { status: 500 }
    );
  }
}
