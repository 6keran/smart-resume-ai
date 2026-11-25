import React from 'react';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserDashboardData } from '@/lib/db';
import { getLandingPageData } from '@/lib/landingPageData.server';
import { DashboardContent } from '@/components/dashboard/DashboardContent';
import LandingPage from '@/components/landing/ProfessionalLandingPage';

export const metadata = {
  title: 'Smart Resume AI | Resume Builder and ATS Checker',
  description: 'Build or upload a resume, check it with repeatable ATS scoring, and review grounded suggestions for your next application.',
};

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    const landingData = await getLandingPageData();
    return <LandingPage landingData={landingData} />;
  }

  const data = await getUserDashboardData(user.id);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <DashboardContent user={user} data={data} />
    </div>
  );
}
