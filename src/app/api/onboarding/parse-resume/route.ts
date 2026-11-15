import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { checkParseResumeRateLimit } from '@/lib/rateLimit';
import { extractResumeText } from '@/server/services/extractResumeText';
import { parseResumeTextToResumeData } from '@/server/services/parseResumeToData';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkParseResumeRateLimit(user.id, req);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          message: `Too many resume parse attempts. Please wait ${rateLimit.retryAfter} seconds and try again.`,
          retryAfter: rateLimit.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfter),
            'X-RateLimit-Limit': String(rateLimit.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimit.resetInSeconds),
          },
        }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Please attach a PDF, DOCX, or TXT resume file.' }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ message: 'Uploaded file is empty.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ message: 'File exceeds the 10MB size limit.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parses strictly in memory (reuses magic-byte signature validation & size limits). Raw file is never stored.
    const extraction = await extractResumeText(buffer, file.name, file.type);
    const parsedResume = parseResumeTextToResumeData(extraction.text, file.name);

    const skillCandidates: Array<{
      skillName: string;
      category: string;
      source: 'resume_parsed';
      confidence: number;
      confirmed: false;
    }> = [];
    const seenSkills = new Set<string>();

    const pushSkill = (raw: string, category: string, confidence: number) => {
      const clean = String(raw || '').trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (seenSkills.has(key)) return;
      seenSkills.add(key);
      skillCandidates.push({
        skillName: clean,
        category,
        source: 'resume_parsed',
        confidence,
        confirmed: false,
      });
    };

    for (const s of parsedResume.skills?.technical || []) pushSkill(s, 'Core / Technical', 0.8);
    for (const s of parsedResume.skills?.tools || []) pushSkill(s, 'Tools & Software', 0.8);
    for (const s of parsedResume.skills?.soft || []) pushSkill(s, 'Professional', 0.7);

    const cleanFullName =
      parsedResume.personalInfo?.fullName &&
      parsedResume.personalInfo.fullName !== 'Candidate Profile'
        ? parsedResume.personalInfo.fullName
        : '';

    const primaryEdu = parsedResume.education?.[0] || null;

    return NextResponse.json({
      success: true,
      claimedNotice: 'Parsed resume items are unconfirmed claims until you review and confirm them.',
      parsed: {
        fileName: file.name,
        extractionMethod: extraction.method,
        wordCount: extraction.wordCount,
        fullName: cleanFullName,
        headline: parsedResume.personalInfo?.headline || '',
        location: parsedResume.personalInfo?.location || '',
        education: primaryEdu
          ? {
              institution: primaryEdu.institution || '',
              degree: primaryEdu.degree || '',
              fieldOfStudy: primaryEdu.qualification || primaryEdu.university || '',
              graduationYear: primaryEdu.graduationYear || '',
            }
          : null,
        experienceCount: parsedResume.experience?.length || 0,
        projectsCount: parsedResume.projects?.length || 0,
        skills: skillCandidates,
      },
    });
  } catch (err: any) {
    console.error('[API /api/onboarding/parse-resume POST] Error:', err);
    return NextResponse.json(
      {
        message: err?.message || 'Could not extract readable text from that file.',
      },
      { status: 400 }
    );
  }
}

