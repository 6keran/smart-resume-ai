'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileSearch,
  FileText,
  BadgeCheck,
  Award,
  Briefcase,
  Target,
  MessageSquare,
  Layers,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Camera,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface AdminSidebarProps {
  adminEmail: string;
  adminRole: string;
}

export function AdminSidebar({ adminEmail, adminRole }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Live Proctoring', href: '/admin/proctoring', icon: Camera },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'Resume Analytics', href: '/admin/resumes', icon: FileSearch },
    { label: 'Skill Verification', href: '/admin/skills', icon: BadgeCheck },
    { label: 'Question Bank', href: '/admin/assessments?tab=questions', icon: Layers },
    { label: 'Assessment Attempts', href: '/admin/assessments?tab=attempts', icon: Award },
    { label: 'Job Analytics', href: '/admin/jobs', icon: Briefcase },
    { label: 'Job Matches', href: '/admin/job-matches', icon: Target },
    { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
    { label: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {
      // Continue redirect
    }
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <aside
      data-no-print="true"
      className={cn(
        'app-sidebar hidden md:flex flex-col border border-[var(--border-color)] transition-all duration-300 relative z-30 shrink-0 h-[calc(100vh-1.5rem)] sticky top-3 my-3 ml-3 rounded-[26px] overflow-hidden no-print',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-color)]">
        <Link href="/admin/dashboard" className="flex items-center gap-3 overflow-hidden group">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight overflow-hidden text-left">
              <span className="font-bold tracking-tight text-xs sm:text-sm text-[var(--text-primary)]">
                Smart Resume
              </span>
              <span className="text-[10px] tracking-wider font-medium text-[var(--text-secondary)]">
                Admin Console
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center shadow-md hover:scale-110 transition-transform z-40 focus:outline-none"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {!collapsed && (
          <p className="px-3 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 text-left">
            Admin Management
          </p>
        )}
        <nav className="space-y-1 text-left">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href.includes('?')
              ? pathname === item.href.split('?')[0]
              : pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-transform group-hover:scale-105',
                    isActive ? 'text-white' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                  )}
                />
                {!collapsed && <span className="truncate flex-1">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Account & Sign Out */}
      <div className="p-3 border-t border-[var(--border-color)] space-y-2">
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between px-1 py-0.5')}>
          {!collapsed && (
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Theme</span>
          )}
          <ThemeToggle variant={collapsed ? 'icon' : 'default'} />
        </div>

        <Link
          href="/"
          target="_blank"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'View Public Site' : undefined}
        >
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          {!collapsed && <span>View Public Site</span>}
        </Link>

        {!collapsed && (
          <div className="px-3 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-left">
            <div className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-wider">
              {adminRole}
            </div>
            <div className="text-xs font-semibold text-[var(--text-primary)] truncate" title={adminEmail}>
              {adminEmail}
            </div>
          </div>
        )}

        <button
          onClick={handleSignOut}
          disabled={isLoggingOut}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors',
            collapsed && 'justify-center'
          )}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>}
        </button>
      </div>
    </aside>
  );
}
