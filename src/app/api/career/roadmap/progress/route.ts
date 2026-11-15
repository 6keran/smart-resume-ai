import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/userSession';
import { getUserRoadmapProgress, upsertUserRoadmapProgressItem } from '@/server/db';

const VALID_ITEM_TYPES = new Set(['skill', 'project', 'certification', 'resource']);
const VALID_STATUSES = new Set(['pending', 'in_progress', 'completed']);

export async function GET(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const roleSlug = (searchParams.get('roleSlug') || '').trim();
    if (!roleSlug) {
      return NextResponse.json({ success: true, progress: [] });
    }

    const progress = await getUserRoadmapProgress(user.id, roleSlug);
    return NextResponse.json({ success: true, progress });
  } catch (err: any) {
    console.error('[API /api/career/roadmap/progress GET] Error:', err);
    return NextResponse.json({ message: 'Failed to load roadmap progress' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const roleSlug = typeof body.roleSlug === 'string' ? body.roleSlug.trim() : '';
    const itemType = typeof body.itemType === 'string' ? body.itemType.trim() : '';
    const itemKey = typeof body.itemKey === 'string' ? body.itemKey.trim() : '';
    const status = typeof body.status === 'string' ? body.status.trim() : '';

    if (!roleSlug || !VALID_ITEM_TYPES.has(itemType) || !itemKey || !VALID_STATUSES.has(status)) {
      return NextResponse.json({ message: 'Invalid roadmap progress payload.' }, { status: 400 });
    }

    const item = await upsertUserRoadmapProgressItem(user.id, {
      roleSlug,
      itemType: itemType as 'skill' | 'project' | 'certification' | 'resource',
      itemKey,
      status: status as 'pending' | 'in_progress' | 'completed',
      notes: typeof body.notes === 'string' ? body.notes.trim() : undefined,
    });

    return NextResponse.json({ success: true, item });
  } catch (err: any) {
    console.error('[API /api/career/roadmap/progress POST] Error:', err);
    return NextResponse.json({ message: 'Failed to save roadmap progress' }, { status: 500 });
  }
}

