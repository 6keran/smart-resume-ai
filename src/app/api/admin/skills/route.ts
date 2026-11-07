import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminTokenAsync,
  getSkillsCatalogWithMetrics,
  toggleSkillStatus,
  updateSkill,
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

    const skills = await getSkillsCatalogWithMetrics();
    return NextResponse.json({ skills });
  } catch (err) {
    console.error('API /api/admin/skills GET error:', err);
    return NextResponse.json({ message: 'Failed to retrieve skills' }, { status: 500 });
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
      return NextResponse.json({ message: 'id and is_active are required.' }, { status: 400 });
    }

    const success = await toggleSkillStatus(id, is_active);
    if (!success) {
      return NextResponse.json({ message: 'Skill not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, is_active });
  } catch (err) {
    console.error('API /api/admin/skills PATCH error:', err);
    return NextResponse.json({ message: 'Failed to update skill status' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const isAuthed = await checkAdminAuth();
    if (!isAuthed) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, category, description } = body;

    if (!id) {
      return NextResponse.json({ message: 'Skill ID is required.' }, { status: 400 });
    }

    const success = await updateSkill(id, { name, category, description });
    if (!success) {
      return NextResponse.json({ message: 'Skill not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('API /api/admin/skills PUT error:', err);
    return NextResponse.json({ message: 'Failed to update skill' }, { status: 500 });
  }
}
