import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  createInterviewSession,
  getUserInterviewSessions,
  getInterviewSession,
  saveInterviewSessionAnswer,
  completeInterviewSession,
  getStudentProfile,
} from '@/server/db';
import {
  generateInterviewQuestions,
  evaluateInterviewAnswer,
} from '@/server/services/careerIntelligence';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');

    if (sessionId) {
      const session = await getInterviewSession(user.id, sessionId);
      if (!session) {
        return NextResponse.json({ message: 'Interview session not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, session });
    }

    const sessions = await getUserInterviewSessions(user.id);
    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    console.error('[API /api/career/interview GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve interview sessions',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { action } = body;

    // ACTION 1: START NEW INTERVIEW SESSION
    if (action === 'start') {
      const { targetRole, jobTitle, company, jobDescription, resumeSnippet } = body;
      const role = (targetRole && typeof targetRole === 'string') ? targetRole.trim() : 'Graduate Software Engineer';

      let effectiveSnippet = resumeSnippet;
      if (!effectiveSnippet) {
        const student = await getStudentProfile(user.id);
        if (student) {
          const projectDetails = (student.projects || [])
            .map((p) => `- Project: ${p.title}. ${p.description}. Tech: ${p.techStack.join(', ')}`)
            .join('\n');
          const courseDetails = (student.coursework || []).join(', ');
          effectiveSnippet = `Education: ${student.degree} in ${student.fieldOfStudy} at ${student.institution} (Class of ${student.graduationYear}).
Coursework: ${courseDetails || 'Computer Science fundamentals'}
Projects:\n${projectDetails || 'Academic capstone projects'}`;
        }
      }

      const questions = await generateInterviewQuestions(role, jobDescription, effectiveSnippet);
      const session = await createInterviewSession(user.id, {
        targetRole: role,
        jobTitle: jobTitle || null,
        company: company || null,
        questions,
      });

      return NextResponse.json({ success: true, session });
    }

    // ACTION 2: EVALUATE CANDIDATE ANSWER
    if (action === 'evaluate' || (!action && body.question && body.answer)) {
      const { sessionId, questionIndex, question, answer, targetRole } = body;

      if (!question || typeof answer !== 'string') {
        return NextResponse.json({ message: 'Missing evaluation parameters.' }, { status: 400 });
      }

      const role = (targetRole && typeof targetRole === 'string') ? targetRole.trim() : 'Full Stack Developer';
      const evaluation = await evaluateInterviewAnswer(question, answer, role);

      if (sessionId && typeof questionIndex === 'number') {
        await saveInterviewSessionAnswer(user.id, sessionId, questionIndex, {
          answer,
          score: evaluation.score,
          feedback: evaluation.sampleRefinement,
          strengths: evaluation.strengths,
          improvements: evaluation.areasForImprovement,
          modelAnswer: typeof question === 'string' ? '' : question.sampleStrongAnswer,
        });
      }

      return NextResponse.json({ success: true, evaluation });
    }

    // ACTION 3: FINISH INTERVIEW SESSION
    if (action === 'finish') {
      const { sessionId, overallScore, overallFeedback } = body;

      if (!sessionId || typeof overallScore !== 'number') {
        return NextResponse.json({ message: 'Missing session completion parameters.' }, { status: 400 });
      }

      const feedback = (overallFeedback && typeof overallFeedback === 'string')
        ? overallFeedback
        : `Completed interview session with a score of ${Math.round(overallScore)}/100.`;

      await completeInterviewSession(user.id, sessionId, overallScore, feedback);
      const updated = await getInterviewSession(user.id, sessionId);

      return NextResponse.json({ success: true, session: updated });
    }

    return NextResponse.json({ message: 'Unknown action specified.' }, { status: 400 });
  } catch (err: any) {
    console.error('[API /api/career/interview POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to process interview request',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}

