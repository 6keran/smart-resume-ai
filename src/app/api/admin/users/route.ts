import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminToken,
  getDb,
  hashPassword,
  createAdminUserRecord,
} from '@/server/db';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;

    const admin = verifyAdminToken(token);
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized. Administrator credentials required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || '').trim();
    const role = (searchParams.get('role') || 'all').toUpperCase();
    const status = (searchParams.get('status') || 'all').toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10));
    const offset = (page - 1) * limit;

    const db = getDb();
    const whereConditions: string[] = [];
    const queryParams: any[] = [];

    if (search) {
      whereConditions.push("(LOWER(u.name) LIKE ? OR LOWER(COALESCE(u.email, '')) LIKE ?)");
      queryParams.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    if (role === 'ADMIN') {
      whereConditions.push("u.role = 'ADMIN'");
    } else if (role === 'USER') {
      whereConditions.push("(u.role = 'USER' OR u.role IS NULL)");
    }

    if (status === 'active') {
      whereConditions.push('(u.is_active = 1 OR u.is_active IS NULL)');
    } else if (status === 'inactive') {
      whereConditions.push('u.is_active = 0');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const countRow = (await db
      .prepare(`SELECT COUNT(*) as total FROM users u ${whereClause}`)
      .get(...queryParams)) as { total: number } | undefined;
    const total = countRow?.total || 0;
    const totalPages = Math.ceil(total / limit) || 1;

    const users = (await db
      .prepare(`
        SELECT
          u.id,
          u.name,
          u.email,
          COALESCE(u.role, 'USER') as role,
          COALESCE(u.is_active, 1) as is_active,
          u.created_at,
          u.last_active_at,
          (SELECT COUNT(*) FROM resumes WHERE user_id = u.id) as resumes_count,
          (SELECT COUNT(*) FROM resume_analyses WHERE user_id = u.id) as analyses_count,
          (SELECT COUNT(*) FROM job_searches WHERE user_id = u.id) as searches_count,
          (SELECT COUNT(*) FROM assessments WHERE user_id = u.id) as assessments_count,
          (SELECT COUNT(*) FROM verified_skills WHERE user_id = u.id AND status = 'VERIFIED') as verified_skills_count
        FROM users u
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT ? OFFSET ?
      `)
      .all(...queryParams, limit, offset)) as any[];

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in GET /api/admin/users:', errorMsg);
    return NextResponse.json(
      { message: 'Failed to retrieve user accounts.', details: errorMsg },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;

    const admin = verifyAdminToken(token);
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { message: 'Unauthorized. Administrator credentials required.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, is_active } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { message: 'Full name is required (minimum 2 characters).' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { message: 'A valid email address is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { message: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const normalizedRole = role && String(role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
    const normalizedIsActive = is_active === 0 || is_active === false ? 0 : 1;

    const passwordHash = hashPassword(password);

    const newUser = await createAdminUserRecord({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: normalizedRole,
      isActive: normalizedIsActive,
      adminActor: {
        id: admin.sub,
        email: admin.email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `User account "${newUser.name}" successfully created.`,
        user: newUser,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/admin/users:', errorMsg);

    if (errorMsg.includes('already exists')) {
      return NextResponse.json({ message: errorMsg }, { status: 409 });
    }

    return NextResponse.json(
      { message: errorMsg || 'Failed to create user account.' },
      { status: 500 }
    );
  }
}
