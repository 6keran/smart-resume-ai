import { NextResponse } from 'next/server';
import { analyzeResume } from '@/lib/gemini';
import { extractResumeText } from '@/lib/extractResumeText';
import { validateResumeDocument } from '@/lib/resumeValidator';
import { recordResumeUpload, recordResumeAnalysis } from '@/lib/db';
import { getOrCreateVisitorId } from '@/lib/visitor';
import { getUserFromRequest } from '@/lib/userSession';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let resumeText = '';
    let extractedMeta: { fileName?: string; wordCount?: number; fileType?: string } = {};

    let jobDescription = '';
    let jobTitle = '';
    let company = '';
    let allowUncertainOverride = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const rawJd = formData.get('jobDescription');
      if (typeof rawJd === 'string') {
        jobDescription = rawJd.trim();
      }
      const rawJobTitle = formData.get('jobTitle');
      if (typeof rawJobTitle === 'string') {
        jobTitle = rawJobTitle.trim();
      }
      const rawCompany = formData.get('company');
      if (typeof rawCompany === 'string') {
        company = rawCompany.trim();
      }
      const rawOverride = formData.get('allowUncertainOverride');
      if (rawOverride === 'true') {
        allowUncertainOverride = true;
      }

      if (!file) {
        return NextResponse.json(
          { message: 'No file was provided. Please upload a valid PDF or DOCX file.' },
          { status: 400 }
        );
      }

      // Read file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Perform text extraction
      try {
        const extraction = await extractResumeText(buffer, file.name, file.type);
        resumeText = extraction.text;
        extractedMeta = {
          fileName: extraction.fileName,
          wordCount: extraction.wordCount,
          fileType: extraction.fileType,
        };
      } catch (extractError: unknown) {
        const errorMsg =
          extractError instanceof Error
            ? extractError.message
            : 'Unable to read this resume. Please upload a valid PDF or DOCX file.';
        return NextResponse.json({ message: errorMsg }, { status: 400 });
      }
    } else {
      // JSON payload
      try {
        const body = await req.json();
        resumeText = typeof body.resumeText === 'string' ? body.resumeText.trim() : '';
        if (typeof body.jobDescription === 'string') {
          jobDescription = body.jobDescription.trim();
        }
        if (typeof body.jobTitle === 'string') {
          jobTitle = body.jobTitle.trim();
        }
        if (typeof body.company === 'string') {
          company = body.company.trim();
        }
        if (body.allowUncertainOverride === true || body.allowUncertainOverride === 'true') {
          allowUncertainOverride = true;
        }
        if (body.fileName) {
          extractedMeta.fileName = String(body.fileName);
        }
      } catch {
        return NextResponse.json(
          { message: 'Invalid JSON request payload.' },
          { status: 400 }
        );
      }
    }

    // 1. Structural and Document-Type Validation
    // Validates whether the document is authentic resume/CV before any ATS analysis
    const validation = validateResumeDocument(resumeText, {
      fileName: extractedMeta.fileName,
      allowUncertainOverride,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          message: validation.message,
          validation,
        },
        { status: 422 }
      );
    }

    // Run AI / ATS analysis with optional job description context
    const result = await analyzeResume(resumeText, jobDescription, jobTitle, company);

    // Merge actual extracted metadata if available
    if (extractedMeta.wordCount) {
      result.wordCount = extractedMeta.wordCount;
    }

    // Persist real upload and analysis to database
    let createdResumeId: string | null = null;
    let assignedVisitorId: string | null = null;
    try {
      const user = await getUserFromRequest(req);
      const visitorId = await getOrCreateVisitorId(req);
      assignedVisitorId = visitorId;
      const resumeId = await recordResumeUpload({
        visitorId,
        userId: user?.id,
        filename: extractedMeta.fileName || 'Pasted-Resume.txt',
        fileType: extractedMeta.fileType || 'raw-text',
        parsedSuccessfully: true,
      });
      createdResumeId = resumeId;

      await recordResumeAnalysis({
        visitorId,
        userId: user?.id,
        resumeId,
        fileType: extractedMeta.fileType || 'raw-text',
        atsScore: result.overallAtsScore,
        keywordScore: result.keywordMatchScore,
        formattingScore: result.formattingScore,
        sectionScore: result.sectionScore,
        analysisStatus: 'COMPLETED',
        detectedKeywords: result.detectedKeywords || [],
        missingKeywords: result.missingKeywords || [],
        recommendations: result.recommendations || [],
      });
    } catch (dbErr) {
      console.error('[DB Event Error] Failed to persist resume analysis:', dbErr);
    }

    const response = NextResponse.json({ ...result, resumeId: createdResumeId });
    if (assignedVisitorId && !req.headers.get('cookie')?.includes('sra_visitor_id=')) {
      response.cookies.set('sra_visitor_id', assignedVisitorId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
      });
    }
    return response;
  } catch (err: unknown) {
    // Log developer information locally without exposing raw stack traces to users
    console.error('Server error in /api/resume/analyze:', err);

    return NextResponse.json(
      { message: 'AI analysis is temporarily unavailable. Please try again in a moment.' },
      { status: 503 }
    );
  }
}
