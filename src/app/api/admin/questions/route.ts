import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminTokenAsync,
  getAdminQuestions,
  createQuestion,
  updateQuestion,
  toggleQuestionStatus,
  softDeleteQuestion,
  getQuestionById,
} from '@/lib/db';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sra_admin_session')?.value;
  return Boolean(await verifyAdminTokenAsync(token));
}

export async function GET(req: Request) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const question = await getQuestionById(id);
      if (!question) {
        return NextResponse.json({ message: 'Question not found' }, { status: 404 });
      }
      return NextResponse.json({ question });
    }

    const skill = searchParams.get('skill') || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const questionType = searchParams.get('type') || undefined;
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '15', 10);

    const result = await getAdminQuestions({
      skill,
      difficulty,
      questionType,
      status,
      search,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('API /api/admin/questions GET error:', err);
    return NextResponse.json({ message: 'Failed to query questions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      skill,
      question_text,
      question_type = 'MCQ',
      difficulty = 'Medium',
      options,
      correct_answer,
      explanation,
      time_limit_seconds = 120,
      is_active = true,
    } = body;

    // Server-side validation
    if (!skill || !question_text || !correct_answer) {
      return NextResponse.json(
        { message: 'Skill, Question text, and Correct Answer are required.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(options) || options.length < 2) {
      return NextResponse.json(
        { message: 'At least 2 options are required for assessment questions.' },
        { status: 400 }
      );
    }

    // Verify correct_answer corresponds to one of the options or option letters
    const validLetters = options.map((_, i) => `Option ${String.fromCharCode(65 + i)}`);
    const validLettersShort = options.map((_, i) => String.fromCharCode(65 + i));
    const trimmedAns = correct_answer.trim();

    const matchesOption = options.some((opt) => opt.trim() === trimmedAns);
    const matchesLetter = validLetters.includes(trimmedAns) || validLettersShort.includes(trimmedAns);

    if (!matchesOption && !matchesLetter) {
      return NextResponse.json(
        { message: 'Correct answer must correspond to one of the provided options or option letters.' },
        { status: 400 }
      );
    }

    const newId = await createQuestion({
      skill: skill.trim(),
      question_text: question_text.trim(),
      question_type,
      difficulty,
      options: options.map((o: string) => o.trim()),
      correct_answer: trimmedAns,
      explanation: explanation ? explanation.trim() : undefined,
      time_limit_seconds: Number(time_limit_seconds) || 120,
      is_active: Boolean(is_active),
    });

    return NextResponse.json({ success: true, id: newId }, { status: 201 });
  } catch (err) {
    console.error('API /api/admin/questions POST error:', err);
    return NextResponse.json({ message: 'Failed to create question' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ message: 'Question ID is required.' }, { status: 400 });
    }

    if (data.options && (!Array.isArray(data.options) || data.options.length < 2)) {
      return NextResponse.json(
        { message: 'At least 2 options are required.' },
        { status: 400 }
      );
    }

    const updated = await updateQuestion(id, data);
    if (!updated) {
      return NextResponse.json({ message: 'Question not found or update failed.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API /api/admin/questions PUT error:', err);
    return NextResponse.json({ message: 'Failed to update question' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, is_active } = body;

    if (!id || typeof is_active !== 'boolean') {
      return NextResponse.json({ message: 'id and is_active boolean are required.' }, { status: 400 });
    }

    const toggled = await toggleQuestionStatus(id, is_active);
    if (!toggled) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, is_active });
  } catch (err) {
    console.error('API /api/admin/questions PATCH error:', err);
    return NextResponse.json({ message: 'Failed to toggle question status' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'Question ID is required.' }, { status: 400 });
    }

    const deleted = await softDeleteQuestion(id);
    if (!deleted) {
      return NextResponse.json({ message: 'Question not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Question safely deactivated and removed from assessment pool.' });
  } catch (err) {
    console.error('API /api/admin/questions DELETE error:', err);
    return NextResponse.json({ message: 'Failed to delete question' }, { status: 500 });
  }
}
