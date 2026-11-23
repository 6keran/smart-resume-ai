import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { createJobApplication } from '@/lib/db';

function validateExternalUrl(urlString: string | null | undefined): string | null {
  if (!urlString || typeof urlString !== 'string') return null;
  const trimmed = urlString.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {}
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ message: 'Invalid or malformed JSON payload' }, { status: 400 });
    }
    const {
      jobId,
      jobTitle,
      company,
      location,
      source,
      jobUrl,
      resumeId,
      descriptionSnippet,
      salary,
    } = body;

    const validatedUrl = validateExternalUrl(jobUrl);
    if (!validatedUrl) {
      return NextResponse.json(
        { message: 'This job listing does not provide a valid external application URL.' },
        { status: 400 }
      );
    }

    if (!jobTitle || !company) {
      return NextResponse.json(
        { message: 'Job title and Company name are required.' },
        { status: 400 }
      );
    }

    const user = await getUserFromRequest(req);
    let application = null;

    if (user) {
      const now = new Date().toISOString();
      application = await createJobApplication(user.id, {
        jobId,
        jobTitle,
        company,
        location,
        source: source || 'External',
        jobUrl: validatedUrl,
        appliedAt: now.split('T')[0],
        status: 'Application pending',
        resumeId: resumeId || null,
        descriptionSnippet: descriptionSnippet || null,
        salary: salary || null,
      });
    }

    return NextResponse.json({
      success: true,
      applicationId: application ? application.id : null,
      externalUrl: validatedUrl,
      isAuthenticated: Boolean(user),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error in application apply route:', msg);
    return NextResponse.json({ message: 'Failed to process application click' }, { status: 500 });
  }
}
