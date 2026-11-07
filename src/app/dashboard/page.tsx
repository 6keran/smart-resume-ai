import React from 'react';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserDashboardData } from '@/lib/db';
import { getStudentCareerActions } from '@/server/services/careerActionEngine';
import { getUnifiedStudentContext } from '@/server/services/unifiedStudentContext';
import { DashboardContent } from '@/components/dashboard/DashboardContent';

export const metadata = {
  title: 'Career Command Center | Smart Resume AI',
  description: 'Unified career command center with explainable readiness scoring, ATS history, guided projects, and job tracking.',
};

export const dynamic = 'force-dynamic';

export default async function UserDashboardPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login?from=/dashboard');
  }

  const [data, actionPlan, unifiedContext] = await Promise.all([
    getUserDashboardData(user.id),
    getStudentCareerActions(user.id).catch(() => null),
    getUnifiedStudentContext(user.id).catch(() => null),
  ]);

  return <DashboardContent user={user} data={data} actionPlan={actionPlan} unifiedContext={unifiedContext} />;
}
