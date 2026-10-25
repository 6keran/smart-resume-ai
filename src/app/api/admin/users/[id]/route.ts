import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminToken,
  deleteUserAndData,
  getAdminUserDetail,
  updateAdminUserRecord,
  hashPassword,
} from '@/server/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { message: 'Target user ID is required.' },
        { status: 400 }
      );
    }

    const userDetail = await getAdminUserDetail(id.trim());
    if (!userDetail) {
      return NextResponse.json(
        { message: 'User account not found.' },
        { status: 404 }
      );
    }

    // Never expose password hash in response
    if (userDetail.user && 'password_hash' in userDetail.user) {
      delete (userDetail.user as any).password_hash;
    }

    return NextResponse.json({ success: true, data: userDetail });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in GET /api/admin/users/[id]:', errorMsg);
    return NextResponse.json(
      { message: 'Failed to retrieve user details.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { message: 'Target user ID is required.' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, email, password, role, is_active } = body;

    // Validation
    if (name !== undefined && (typeof name !== 'string' || name.trim().length < 2)) {
      return NextResponse.json(
        { message: 'Full name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    if (email !== undefined && email !== null && email !== '') {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return NextResponse.json(
          { message: 'Please provide a valid email address.' },
          { status: 400 }
        );
      }
    }

    let passwordHash: string | undefined = undefined;
    if (password !== undefined && password !== null && password !== '') {
      if (typeof password !== 'string' || password.length < 6) {
        return NextResponse.json(
          { message: 'New password must be at least 6 characters long.' },
          { status: 400 }
        );
      }
      passwordHash = hashPassword(password);
    }

    const updatedUser = await updateAdminUserRecord(id.trim(), {
      name: name !== undefined ? name.trim() : undefined,
      email: email !== undefined ? (email ? email.trim().toLowerCase() : '') : undefined,
      passwordHash,
      role: role !== undefined ? (String(role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER') : undefined,
      isActive: is_active !== undefined ? (is_active === 0 || is_active === false ? 0 : 1) : undefined,
      adminActor: {
        id: admin.sub,
        email: admin.email,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User account "${updatedUser.name}" successfully updated.`,
      user: updatedUser,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in PATCH /api/admin/users/[id]:', errorMsg);

    if (errorMsg.includes('not found')) {
      return NextResponse.json({ message: errorMsg }, { status: 404 });
    }
    if (errorMsg.includes('already exists')) {
      return NextResponse.json({ message: errorMsg }, { status: 409 });
    }
    if (errorMsg.includes('Action prohibited')) {
      return NextResponse.json({ message: errorMsg }, { status: 403 });
    }

    return NextResponse.json(
      { message: errorMsg || 'Failed to update user account.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return NextResponse.json(
        { message: 'Target user ID is required.' },
        { status: 400 }
      );
    }

    const result = await deleteUserAndData(id.trim(), {
      id: admin.sub,
      email: admin.email,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in DELETE /api/admin/users/[id]:', errorMsg);

    if (errorMsg.includes('not found')) {
      return NextResponse.json({ message: errorMsg }, { status: 404 });
    }
    if (errorMsg.includes('Action prohibited')) {
      return NextResponse.json({ message: errorMsg }, { status: 403 });
    }

    return NextResponse.json(
      { message: errorMsg || 'Failed to delete user account.' },
      { status: 500 }
    );
  }
}
