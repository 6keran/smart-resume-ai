import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifyAdminTokenAsync } from '@/lib/db';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { AdminHeader } from '@/components/admin/AdminHeader';

export const dynamic = 'force-dynamic';

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('sra_admin_session')?.value;

  if (!token) {
    redirect('/admin/login');
  }

  const payload = await verifyAdminTokenAsync(token);
  if (!payload || payload.role !== 'ADMIN') {
    redirect('/admin/login');
  }

  return (
    <div className="flex w-full min-h-screen bg-[var(--bg-primary)]">
      <AdminSidebar adminEmail={payload.email} adminRole={payload.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader adminEmail={payload.email} adminRole={payload.role} />
        <main className="flex-1 w-full">{children}</main>
      </div>
    </div>
  );
}
