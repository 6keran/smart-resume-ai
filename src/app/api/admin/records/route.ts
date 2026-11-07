import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  verifyAdminTokenAsync,
  getAdminUsers,
  getAdminUserDetail,
  getAdminVisitors,
  getAdminResumeAnalyses,
  getAdminVerifiedSkills,
  getAdminAssessments,
  getAdminJobSearches,
  getAdminJobMatches,
  getAdminJobApplications,
  getAdminFeedback,
  getVisitorActivity,
  deleteUserAndData,
} from '@/lib/db';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;

    if (!(await verifyAdminTokenAsync(token))) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'users';
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;
    const filter = searchParams.get('filter') || undefined;
    const id = searchParams.get('id') || undefined;

    switch (type) {
      case 'users':
        return NextResponse.json({ data: await getAdminUsers(limit) });
      case 'user_detail':
        if (!id) return NextResponse.json({ message: 'User ID required' }, { status: 400 });
        return NextResponse.json({ data: await getAdminUserDetail(id) });
      case 'visitors':
        return NextResponse.json({ data: await getAdminVisitors(limit) });
      case 'visitor_activity':
        if (!id) return NextResponse.json({ message: 'Visitor ID required' }, { status: 400 });
        return NextResponse.json({ data: await getVisitorActivity(id) });
      case 'resumes':
      case 'analyses':
        return NextResponse.json({ data: await getAdminResumeAnalyses(limit) });
      case 'skills':
        return NextResponse.json({ data: await getAdminVerifiedSkills(limit) });
      case 'assessments':
        return NextResponse.json({ data: await getAdminAssessments(limit) });
      case 'jobs':
        return NextResponse.json({ data: await getAdminJobSearches(limit) });
      case 'matches':
        return NextResponse.json({ data: await getAdminJobMatches(limit) });
      case 'applications':
      case 'job_applications':
        return NextResponse.json({ data: await getAdminJobApplications(limit) });
      case 'feedback':
        return NextResponse.json({ data: await getAdminFeedback(limit, filter) });
      default:
        return NextResponse.json({ message: `Unknown record type: ${type}` }, { status: 400 });
    }
  } catch (err) {
    console.error('API /api/admin/records error:', err);
    return NextResponse.json({ message: 'Failed to retrieve records.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('sra_admin_session')?.value;
    const admin = await verifyAdminTokenAsync(token);

    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (type === 'users' || type === 'user') {
      if (!id) return NextResponse.json({ message: 'User ID required' }, { status: 400 });
      const result = await deleteUserAndData(id, { id: admin.sub, email: admin.email });
      return NextResponse.json(result);
    }

    return NextResponse.json({ message: `Deletion not supported for type: ${type}` }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (errorMsg.includes('not found')) {
      return NextResponse.json({ message: errorMsg }, { status: 404 });
    }
    if (errorMsg.includes('Action prohibited')) {
      return NextResponse.json({ message: errorMsg }, { status: 403 });
    }
    return NextResponse.json({ message: errorMsg || 'Failed to delete record.' }, { status: 500 });
  }
}
