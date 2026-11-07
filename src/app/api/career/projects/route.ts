import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import {
  getUserGuidedProjects,
  createGuidedProject,
  getStudentProfile,
} from '@/server/db';
import {
  generateProjectSpecification,
  buildStandardProjectMilestones,
  type RecommendedProject,
} from '@/server/services/projectMentor';

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required. Please sign in to access your guided projects.' },
        { status: 401 }
      );
    }

    const projects = await getUserGuidedProjects(user.id);

    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (err: any) {
    console.error('[API /api/career/projects GET] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to retrieve guided projects.',
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
      return NextResponse.json(
        { message: 'Authentication required. Please sign in to create a guided project.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const payload = body.recommendation && typeof body.recommendation === 'object'
      ? { ...body.recommendation, ...body }
      : body;

    const {
      title,
      difficulty,
      targetRole,
      techStack,
      problemStatement,
      realWorldUseCase,
      architectureOverview,
      databaseDesign,
      estimatedComplexity,
      resumeValue,
      suggestedDatabaseDesign,
    } = payload;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { message: 'Project title is required.' },
        { status: 400 }
      );
    }

    const cleanStack = Array.isArray(techStack)
      ? techStack.map((t: any) => String(t).trim()).filter(Boolean)
      : ['TypeScript', 'PostgreSQL'];

    const recProject: RecommendedProject = {
      id: `init_${Date.now()}`,
      title: title.trim(),
      difficulty: ['Beginner', 'Intermediate', 'Advanced'].includes(difficulty) ? difficulty : 'Intermediate',
      targetRole: (targetRole || 'Graduate Software Engineer').trim(),
      matchedGaps: [],
      techStack: cleanStack,
      problemStatement: (problemStatement || '').trim(),
      realWorldUseCase: (realWorldUseCase || '').trim(),
      learningOutcomes: [],
      mainFeatures: [],
      suggestedDatabaseDesign: suggestedDatabaseDesign || { overview: '', entities: [] },
      architectureOverview: (architectureOverview || '').trim(),
      estimatedComplexity: (estimatedComplexity || '2-3 weeks').trim(),
      resumeValue: (resumeValue || '').trim(),
    };

    const studentProfile = await getStudentProfile(user.id).catch(() => null);
    const specification = await generateProjectSpecification(recProject, studentProfile);
    const milestones = buildStandardProjectMilestones(recProject.title, recProject.techStack);

    const project = await createGuidedProject(user.id, {
      title: recProject.title,
      difficulty: recProject.difficulty,
      targetRole: recProject.targetRole,
      techStack: recProject.techStack,
      problemStatement: recProject.problemStatement,
      realWorldUseCase: recProject.realWorldUseCase,
      architectureOverview: recProject.architectureOverview,
      databaseDesign: typeof databaseDesign === 'string' ? databaseDesign : recProject.suggestedDatabaseDesign?.overview || '',
      estimatedComplexity: recProject.estimatedComplexity,
      resumeValue: recProject.resumeValue,
      specification,
      milestones,
      currentMilestone: 1,
      progressPercent: 0,
      status: 'in_progress',
    });

    return NextResponse.json(
      {
        success: true,
        project,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('[API /api/career/projects POST] Error:', err);
    return NextResponse.json(
      {
        message: 'Failed to create guided project.',
        ...(process.env.NODE_ENV !== 'production' && { error: err?.message }),
      },
      { status: 500 }
    );
  }
}
