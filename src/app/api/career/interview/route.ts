import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  createInterviewSession,
  getUserInterviewSessions,
  getInterviewSession,
  getGuidedProjectById,
  saveInterviewSessionAnswer,
  completeInterviewSession,
} from '@/server/db';
import { buildUnifiedStudentContext } from '@/server/services/unifiedStudentContext';
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
      const { targetRole, jobTitle, company, jobDescription, resumeSnippet, projectId } = body;
      const context = await buildUnifiedStudentContext(user.id).catch(() => null);

      let guidedProject: any = null;
      if (projectId && typeof projectId === 'string') {
        guidedProject = await getGuidedProjectById(projectId, user.id).catch(() => null);
      }

      const role =
        (targetRole && typeof targetRole === 'string' && targetRole.trim()) ||
        guidedProject?.targetRole ||
        context?.careerGoal.targetRole ||
        context?.studentProfile?.targetRole ||
        (typeof jobTitle === 'string' && jobTitle.trim()) ||
        '';
      if (!role) {
        return NextResponse.json(
          { message: 'Please set a target role before starting an interview session.' },
          { status: 400 }
        );
      }

      let effectiveSnippet = resumeSnippet;
      if (!effectiveSnippet && context) {
        const academic = context.academic;
        const projectDetails = [
          ...(guidedProject ? [`- Target Guided Project: ${guidedProject.title} (Tech: ${guidedProject.techStack.join(', ')}). Architecture: ${guidedProject.architectureOverview || guidedProject.problemStatement || ''}`] : []),
          ...(academic?.documentedProjects || []).map((p) => `- Project: ${p.title}. Tech: ${p.techStack.join(', ')}`),
          ...(context.projects?.projects || []).map((p) => `- Guided Project: ${p.title} (${p.status}). Tech: ${p.techStack.join(', ')}`),
        ].slice(0, 4).join('\n');

        const expDetails = (context.experience?.items || [])
          .slice(0, 2)
          .map((e) => `- Role: ${e.position} at ${e.company}${e.bullets ? ` (${e.bullets.slice(0, 2).join('; ')})` : ''}`)
          .join('\n');

        const verifiedSkills = context.skills?.verified?.map((s) => `${s.name} (${s.score}%)`).join(', ');

        effectiveSnippet = `Education: ${academic?.degree || 'Degree'} in ${academic?.fieldOfStudy || 'Field'} at ${academic?.institution || 'Institution'}${academic?.graduationYear ? ` (Class of ${academic.graduationYear})` : ''}.
Coursework: ${(academic?.coursework || []).join(', ') || 'Standard domain curriculum'}
${verifiedSkills ? `Verified Competencies: ${verifiedSkills}\n` : ''}${expDetails ? `Experience:\n${expDetails}\n` : ''}Projects:\n${projectDetails || 'None documented'}`;
      } else if (guidedProject && effectiveSnippet) {
        effectiveSnippet = `${effectiveSnippet}\n\nTarget Guided Project: ${guidedProject.title} (Tech: ${guidedProject.techStack.join(', ')}). Architecture: ${guidedProject.architectureOverview || guidedProject.problemStatement || ''}`;
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

      const role = (targetRole && typeof targetRole === 'string' && targetRole.trim()) ? targetRole.trim() : 'General Role';
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

