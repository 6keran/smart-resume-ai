import { NextResponse } from 'next/server';
import { improveResumeSection } from '@/lib/gemini';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: 'Invalid JSON request body.' },
      { status: 400 }
    );
  }

  try {
    const { sectionName, originalContent, jobDescription, jobTitle } = body || {};

    if (!originalContent || typeof originalContent !== 'string' || !originalContent.trim()) {
      return NextResponse.json(
        { message: 'Original content is required and cannot be empty.' },
        { status: 400 }
      );
    }

    const result = await improveResumeSection(
      typeof sectionName === 'string' && sectionName.trim() ? sectionName.trim() : 'Resume Section',
      originalContent.trim(),
      typeof jobDescription === 'string' && jobDescription.trim() ? jobDescription.trim() : undefined,
      typeof jobTitle === 'string' && jobTitle.trim() ? jobTitle.trim() : undefined
    );

    return NextResponse.json({
      improvedContent: result.improvedContent,
      reasoning: result.reasoning,
      metricImpact: result.metricImpact,
    });
  } catch (err) {
    console.error('API /api/resume/improve error:', err);
    return NextResponse.json(
      { message: 'Unable to improve resume content at this moment.' },
      { status: 500 }
    );
  }
}
