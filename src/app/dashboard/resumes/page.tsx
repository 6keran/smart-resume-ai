import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserResumes } from '@/lib/db';
import DashboardResumesGrid, { DashboardResumeItem } from '@/components/dashboard/DashboardResumesGrid';

export const metadata = {
  title: 'My Resumes | Smart Resume AI',
  description: 'Manage, edit and track all your resumes, versions, and ATS scans.',
};

export default async function UserResumesPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login?from=/dashboard/resumes');
  }

  const resumes = await getUserResumes(user.id);
  const serializedResumes: DashboardResumeItem[] = resumes.map((r) => ({
    id: r.id,
    filename: r.filename || 'Untitled Resume',
    file_type: r.file_type || null,
    uploaded_at: r.uploaded_at || new Date().toISOString(),
    isActive: Boolean(r.isActive),
    analyses_count: Number(r.analyses_count || 0),
    versionsCount: Number(r.versionsCount || 0),
    latestAtsScore: typeof r.latestAtsScore === 'number' ? r.latestAtsScore : null,
  }));

  return <DashboardResumesGrid initialResumes={serializedResumes} />;
}
