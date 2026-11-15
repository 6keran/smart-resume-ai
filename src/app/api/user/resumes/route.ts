import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  getUserResumes,
  getUserResume,
  getUserActiveResume,
  setUserActiveResume,
  saveUserResume,
  deleteUserResume,
} from '@/lib/db';
import { validateResumeData } from '@/lib/resumeValidator';
import { detectFileSignature, extractResumeText } from '@/server/services/extractResumeText';
import { validateResumeDocument } from '@/server/services/resumeValidator';
import { parseResumeTextToResumeData } from '@/server/services/parseResumeToData';

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
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    return handleUploadResume(req);
  }
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

    return NextResponse.json({
      success: true,
      message: 'Resume deleted successfully.',
      nextActiveResumeId: result.nextActiveResumeId ?? null,
    });
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

    let body: any = {};
    try {
      const text = await req.text();
      if (text && text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      return NextResponse.json({ message: 'Invalid JSON request payload.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // Handle explicit set_active action
    if (action === 'set_active' || body?.action === 'set_active') {
      const targetId = searchParams.get('id') || body?.resumeId || body?.id;
      if (!targetId) {
        return NextResponse.json({ message: 'Resume ID is required to set active.' }, { status: 400 });
      }
      const activeResult = await setUserActiveResume(user.id, String(targetId));
      return NextResponse.json({ success: true, activeResumeId: activeResult.activeResumeId }, { status: 200 });
    }

    const { resumeId, resumeData, filename, fileType, clientLastUpdated, force, createNew, setActive } = body;

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
      createNew: Boolean(createNew),
    });

    if (setActive) {
      await setUserActiveResume(user.id, saved.id).catch(() => null);
    }

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

async function handleUploadResume(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ message: 'Invalid form data.' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        { message: 'No file was provided. Please upload a valid PDF or DOCX file.' },
        { status: 400 }
      );
    }

    // 10MB file limit
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'File size exceeds the 10MB limit. Please upload a smaller resume document.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate binary format signature
    const signature = detectFileSignature(buffer);
    if (signature.format !== 'pdf' && signature.format !== 'docx' && signature.format !== 'text') {
      return NextResponse.json(
        { message: 'Unsupported file format. Please upload an authentic PDF or DOCX resume.' },
        { status: 400 }
      );
    }

    // Extract text
    let extractedText = '';
    let detectedType: string = signature.format;
    try {
      const extraction = await extractResumeText(buffer, file.name, file.type);
      extractedText = extraction.text;
      detectedType = extraction.fileType || signature.format;
    } catch (extractErr: any) {
      return NextResponse.json(
        { message: extractErr.message || 'Unable to read this document. Please ensure it contains readable text.' },
        { status: 400 }
      );
    }

    if (!extractedText || extractedText.trim().length < 20) {
      return NextResponse.json(
        { message: 'No readable text found in document. Please upload a text-based PDF or DOCX file rather than a scanned image.' },
        { status: 400 }
      );
    }

    // Validate document is an authentic resume
    const validation = validateResumeDocument(extractedText, { fileName: file.name });
    if (!validation.isValid) {
      return NextResponse.json(
        {
          message: validation.message || 'The uploaded file does not appear to be an authentic resume/CV.',
          validation,
        },
        { status: 422 }
      );
    }

    // Parse into structured ResumeData model
    const parsedData = parseResumeTextToResumeData(extractedText, file.name);

    // Persist as a new resume record under the user's account
    const saved = await saveUserResume(user.id, {
      resumeData: parsedData,
      filename: file.name,
      fileType: detectedType,
      createNew: true,
    });

    await setUserActiveResume(user.id, saved.id).catch(() => null);

    return NextResponse.json({
      success: true,
      message: `Resume "${file.name}" uploaded and loaded into editor.`,
      resumeId: saved.id,
      resume: saved,
      resumeData: parsedData,
    });
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error uploading user resume:', msg);
    return NextResponse.json({ message: msg || 'Failed to upload and parse resume' }, { status: 500 });
  }
}
