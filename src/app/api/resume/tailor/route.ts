import { NextResponse } from 'next/server';
import { tailorResumeToJob } from '@/lib/gemini';
import { validateResumeDocument } from '@/lib/resumeValidator';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid or malformed JSON payload' }, { status: 400 });
    }
    const { resumeText, jobTitle, company, jobDescription, allowUncertainOverride } = body;

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { message: 'Both resume content and target job description are required for tailoring.' },
        { status: 400 }
      );
    }

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

    const result = await tailorResumeToJob(
      resumeText,
      jobTitle || 'Target Role',
      company || 'Target Company',
      jobDescription
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error('API /api/resume/tailor error:', err);
    return NextResponse.json(
      { message: 'Unable to tailor resume for the target job at this time.' },
      { status: 500 }
    );
  }
}
