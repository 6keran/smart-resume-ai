import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/userSession';
import { UserDashboardSidebar } from '@/components/dashboard/UserDashboardSidebar';
import { UserDashboardHeader } from '@/components/dashboard/UserDashboardHeader';

export const dynamic = 'force-dynamic';

export default async function UserDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login?from=/dashboard');
  }

  return (
    <div className="flex w-full min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors relative">
      <UserDashboardSidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <UserDashboardHeader user={user} />
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
