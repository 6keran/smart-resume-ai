import React from 'react';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserDashboardData } from '@/lib/db';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import LandingPage from '@/components/landing/ProfessionalLandingPage';

export const metadata = {
  title: 'Smart Resume AI | Home',
  description: 'AI-powered resume intelligence for analyzing, improving, building, verifying and matching your career profile.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return <LandingPage />;
  }

  const data = await getUserDashboardData(user.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <DashboardContent user={user} data={data} />
    </div>
  );
}
