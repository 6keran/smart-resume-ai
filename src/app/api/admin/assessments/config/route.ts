import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminTokenAsync,
  getAssessmentConfigs,
  updateAssessmentConfig,
} from '@/lib/db';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('sra_admin_session')?.value;
  return Boolean(await verifyAdminTokenAsync(token));
}

export async function GET() {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const configs = await getAssessmentConfigs();
    return NextResponse.json({ configs });
  } catch (err) {
    console.error('API /api/admin/assessments/config GET error:', err);
    return NextResponse.json({ message: 'Failed to retrieve assessment configs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { skillSlug, questionsCount, passPercentage, timeLimitMinutes } = body;

    if (!skillSlug) {
      return NextResponse.json({ message: 'skillSlug is required.' }, { status: 400 });
    }

    const success = await updateAssessmentConfig(skillSlug, {
      questionsCount: questionsCount !== undefined ? Number(questionsCount) : undefined,
      passPercentage: passPercentage !== undefined ? Number(passPercentage) : undefined,
      timeLimitMinutes: timeLimitMinutes !== undefined ? Number(timeLimitMinutes) : undefined,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API /api/admin/assessments/config POST error:', err);
    return NextResponse.json({ message: 'Failed to update assessment config' }, { status: 500 });
  }
}
