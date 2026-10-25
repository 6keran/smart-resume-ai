import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromRequest } from '@/lib/userSession';
import {
  saveResumeVersion,
  getResumeVersions,
  getResumeVersion,
  restoreResumeVersion,
  verifyAdminToken,
} from '@/lib/db';

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('sra_admin_session')?.value;
    const admin = verifyAdminToken(adminToken);
    const isAdmin = Boolean(admin && admin.role === 'ADMIN');
    const user = await getUserFromRequest(req);

    if (!user && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const versionId = searchParams.get('versionId');
    const resumeId = searchParams.get('resumeId') || undefined;
    const targetUserId = (isAdmin && searchParams.get('userId')) ? searchParams.get('userId')! : (user?.id || '');

    if (!targetUserId && !resumeId) {
      return NextResponse.json({ message: 'Target user ID or resume ID is required' }, { status: 400 });
    }

    // Single version detail lookup
    if (versionId) {
      const version = await getResumeVersion(targetUserId, versionId, { isAdmin });
      return NextResponse.json({ version });
    }

    // Version list lookup (per resume or all user versions)
    const versions = await getResumeVersions(targetUserId, resumeId, { isAdmin });
    return NextResponse.json({ versions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error fetching resume versions:', msg);

    if (/forbidden|permission/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 403 });
    }
    if (/not found/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 404 });
    }
    return NextResponse.json({ message: 'Failed to fetch resume versions' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('sra_admin_session')?.value;
    const admin = verifyAdminToken(adminToken);
    const isAdmin = Boolean(admin && admin.role === 'ADMIN');
    const user = await getUserFromRequest(req);

    if (!user && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const { resumeId, resumeData, changeSummary } = body;

    if (!resumeData || (typeof resumeData !== 'object' && typeof resumeData !== 'string')) {
      return NextResponse.json(
        { message: 'Valid resumeData object is required to save a snapshot.' },
        { status: 400 }
      );
    }

    if (changeSummary !== undefined && typeof changeSummary !== 'string') {
      return NextResponse.json(
        { message: 'changeSummary must be a string.' },
        { status: 400 }
      );
    }

    const trimmedSummary = changeSummary ? changeSummary.trim().slice(0, 255) : undefined;
    const trimmedResumeId = resumeId && typeof resumeId === 'string' ? resumeId.trim() : null;

    const targetUserId = (isAdmin && body.userId) ? body.userId : (user?.id || admin!.sub);

    const version = await saveResumeVersion(targetUserId, trimmedResumeId, resumeData, trimmedSummary);

    const statusCode = version.isDuplicate ? 200 : 201;
    const message = version.isDuplicate
      ? `No changes detected since Version ${version.versionNumber}. Duplicate snapshot avoided.`
      : `Resume version ${version.versionNumber} saved successfully.`;

    return NextResponse.json(
      {
        success: true,
        message,
        version,
        isDuplicate: Boolean(version.isDuplicate),
      },
      { status: statusCode }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error saving resume version:', msg);

    if (/forbidden|permission|own this resume/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 403 });
    }
    if (/not found/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 404 });
    }
    if (/bad request/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    return NextResponse.json({ message: msg || 'Failed to save version' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('sra_admin_session')?.value;
    const admin = verifyAdminToken(adminToken);
    const isAdmin = Boolean(admin && admin.role === 'ADMIN');
    const user = await getUserFromRequest(req);

    if (!user && !isAdmin) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
    }

    const { versionId } = body;

    if (!versionId || typeof versionId !== 'string' || !versionId.trim()) {
      return NextResponse.json({ message: 'Valid versionId string is required' }, { status: 400 });
    }

    const targetUserId = user?.id || admin!.sub;

    // Restores version: creates new snapshot first to preserve history, then updates active resume
    const result = await restoreResumeVersion(targetUserId, versionId.trim(), { isAdmin });

    return NextResponse.json({
      success: true,
      message: result.message,
      resumeData: result.resumeData,
      newVersion: result.newVersion,
      restoredFromVersionNumber: result.restoredFromVersionNumber,
      preRestoreCheckpoint: result.preRestoreCheckpoint,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Error restoring resume version:', msg);

    if (/forbidden|permission|own this resume/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 403 });
    }
    if (/not found/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 404 });
    }
    if (/bad request/i.test(msg)) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    return NextResponse.json({ message: msg || 'Failed to restore version' }, { status: 500 });
  }
}
