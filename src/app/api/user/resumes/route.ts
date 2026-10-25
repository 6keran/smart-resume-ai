import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getUserResumes, getUserResume, getUserActiveResume, saveUserResume, deleteUserResume } from '@/lib/db';
import { validateResumeData } from '@/lib/resumeValidator';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const resumeId = searchParams.get('id');
    const isActiveRequested = searchParams.get('active') === 'true';

    // 1. Fetch specific resume by ID
    if (resumeId) {
      const resume = await getUserResume(user.id, resumeId);
      if (!resume) {
        return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
      }
      return NextResponse.json({ resume });
    }

    // 2. Fetch current active (most recently updated/uploaded) resume
    if (isActiveRequested) {
      const resume = await getUserActiveResume(user.id);
      return NextResponse.json({ resume });
    }

    // 3. Fetch all resumes for the authenticated user
    const resumes = await getUserResumes(user.id);
    return NextResponse.json({ resumes });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching user resumes:', msg);
    return NextResponse.json({ message: 'Failed to fetch resumes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return handleSaveResume(req);
}

export async function PUT(req: Request) {
  return handleSaveResume(req);
}

export async function DELETE(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let resumeId = searchParams.get('id');

    if (!resumeId) {
      try {
        const body = await req.json();
        resumeId = body.id || body.resumeId;
      } catch {}
    }

    if (!resumeId) {
      return NextResponse.json({ message: 'Resume ID is required.' }, { status: 400 });
    }

    const result = await deleteUserResume(user.id, resumeId);
    if (!result.found) {
      return NextResponse.json({ message: 'Resume not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Resume deleted successfully.' });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/forbidden|permission|do not own/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 403 });
    }
    return NextResponse.json({ message: msg || 'Failed to delete resume' }, { status: 500 });
  }
}

async function handleSaveResume(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const { resumeId, resumeData, filename, fileType, clientLastUpdated, force } = body;

    // Validate incoming resumeData structure
    const validation = validateResumeData(resumeData);
    if (!validation.valid) {
      return NextResponse.json(
        {
          message: 'Validation failed: Invalid resume data structure.',
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    // Persist to database under authenticated user's ownership
    const saved = await saveUserResume(user.id, {
      resumeId: resumeId ? String(resumeId).trim() : null,
      resumeData,
      filename: filename ? String(filename).trim().slice(0, 255) : null,
      fileType: fileType ? String(fileType).trim().slice(0, 50) : undefined,
      clientLastUpdated: clientLastUpdated ? String(clientLastUpdated) : null,
      force: Boolean(force),
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Resume saved to server database successfully.',
        resumeId: saved.id,
        resume: saved,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error persisting user resume:', msg);

    if (err?.code === 'CONFLICT' || /conflict/i.test(msg)) {
      return NextResponse.json(
        {
          code: 'CONFLICT',
          message: msg,
          serverResume: err?.serverResume || null,
        },
        { status: 409 }
      );
    }

    if (/forbidden|permission|do not own/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 403 });
    }

    return NextResponse.json({ message: msg || 'Failed to persist resume' }, { status: 500 });
  }
}
