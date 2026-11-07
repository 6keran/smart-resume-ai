import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminTokenAsync,
  getAdminAssessmentAttempts,
  getAssessmentAttemptDetail,
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
      const detail = await getAssessmentAttemptDetail(id);
      if (!detail) {
        return NextResponse.json({ message: 'Assessment attempt not found' }, { status: 404 });
      }
      return NextResponse.json(detail);
    }

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const result = await getAdminAssessmentAttempts(limit, page);
    return NextResponse.json(result);
  } catch (err) {
    console.error('API /api/admin/assessments/attempts GET error:', err);
    return NextResponse.json({ message: 'Failed to retrieve assessment attempts' }, { status: 500 });
  }
}
