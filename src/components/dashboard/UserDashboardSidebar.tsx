'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FileCheck2,
  Wand2,
  Briefcase,
  Send,
  BadgeCheck,
  Award,
  BookOpen,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Compass,
  FileEdit,
  FileSearch,
  Bookmark,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/components/user/UserContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface UserDashboardSidebarProps {
  user: {
    id: string;
    name: string;
    email: string | null;
  };
}

export function UserDashboardSidebar({ user }: UserDashboardSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { logout } = useUserProfile();

  const primaryNavItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'ATS Resume Score', href: '/ats-score', icon: BarChart3 },
    { label: 'Resume Builder', href: '/builder', icon: FileEdit },
    { label: 'Resume Analyzer', href: '/analyzer', icon: FileSearch },
    { label: 'AI Resume Improver', href: '/improver', icon: Wand2 },
    { label: 'Job Finder', href: '/jobs', icon: Briefcase },
  ];

  const trackingNavItems = [
    { label: 'Application Tracker', href: '/dashboard/applications', icon: Send },
    { label: 'Saved Jobs', href: '/dashboard/applications?status=Saved', icon: Bookmark },
    { label: 'Applied Jobs', href: '/dashboard/applications?status=Applied', icon: CheckCircle2 },
  ];

  const libraryNavItems: { label: string; href: string; icon: any; badge?: string }[] = [
    { label: 'Resume Library', href: '/dashboard/resumes', icon: FileText },
    { label: 'Verified Skills', href: '/dashboard/skills', icon: BadgeCheck },
    { label: 'Career Guidance', href: '/guidance', icon: Compass, badge: 'Coming Soon' },
    { label: 'Profile & Settings', href: '/dashboard/profile', icon: User },
  ];

  return (
    <aside
      data-no-print="true"
      className={cn(
        'hidden md:flex flex-col glass-sidebar transition-[width] duration-200 cubic-bezier(0.16, 1, 0.3, 1) relative z-30 shrink-0 h-screen sticky top-0 no-print select-none',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--glass-border)] shrink-0">
        <Link href="/dashboard" className="flex items-center overflow-hidden min-w-0">
          {!collapsed ? (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[16px] tracking-tight text-[var(--text-primary)] leading-tight whitespace-nowrap">
                Smart Resume
              </span>
              <span className="text-[11px] text-[var(--accent)] font-semibold tracking-wide uppercase whitespace-nowrap opacity-85">
                Career Dashboard
              </span>
            </div>
          ) : (
            <div className="w-8 flex items-center justify-center">
              <span className="font-bold text-[17px] text-[var(--accent)] tracking-tight">
                SR
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Core Career Workspace */}
        <div className="space-y-1.5">
          {!collapsed && (
            <p className="px-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 select-none">
              Workspace
            </p>
          )}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'w-full h-11 flex items-center rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.99] group relative select-none',
                  collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
                  isActive
                    ? 'bg-[var(--glass-bg-elevated)] text-[var(--accent)] border border-[var(--glass-border)] shadow-[var(--shadow-xs)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'
                )}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Icon
                    className={cn(
                      'w-4.5 h-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105',
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                    )}
                  />
                </div>
                {!collapsed && <span className="truncate flex-1 text-left leading-normal">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Application Tracking */}
        <div className="pt-3 border-t border-[var(--glass-border)] space-y-1.5">
          {!collapsed && (
            <p className="px-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 select-none">
              Applications
            </p>
          )}
          {trackingNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === '/dashboard/applications' && (
              item.href.includes('status=')
                ? pathname.includes(item.href)
                : !item.href.includes('status=')
            );

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'w-full h-11 flex items-center rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.99] group relative select-none',
                  collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
                  isActive
                    ? 'bg-[var(--glass-bg-elevated)] text-[var(--accent)] border border-[var(--glass-border)] shadow-[var(--shadow-xs)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'
                )}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Icon
                    className={cn(
                      'w-4.5 h-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105',
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                    )}
                  />
                </div>
                {!collapsed && <span className="truncate flex-1 text-left leading-normal">{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Career Library & Account */}
        <div className="pt-3 border-t border-[var(--glass-border)] space-y-1.5">
          {!collapsed && (
            <p className="px-3 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2 select-none">
              Library & Settings
            </p>
          )}
          {libraryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'w-full h-11 flex items-center rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.99] group relative select-none',
                  collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
                  isActive
                    ? 'bg-[var(--glass-bg-elevated)] text-[var(--accent)] border border-[var(--glass-border)] shadow-[var(--shadow-xs)] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'
                )}
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Icon
                    className={cn(
                      'w-4.5 h-4.5 shrink-0 transition-transform duration-150 group-hover:scale-105',
                      isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
                    )}
                  />
                </div>
                {!collapsed && <span className="truncate flex-1 text-left leading-normal">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 shrink-0">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Footer Profile, Theme Toggle & Collapse Toggle */}
      <div className="p-3 border-t border-[var(--glass-border)] bg-[var(--glass-bg)]/50 backdrop-blur-md space-y-2">
        {/* Theme Toggle Row */}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between px-1 py-0.5')}>
          {!collapsed && (
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Appearance</span>
          )}
          <ThemeToggle variant={collapsed ? 'icon' : 'default'} />
        </div>

        <div className={cn('flex items-center gap-2.5 px-2 py-2 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] shadow-xs')}>
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] font-bold text-xs flex items-center justify-center shrink-0 border border-[var(--accent)]/25">
            {user.name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-[var(--text-secondary)] truncate">
                {user.email || 'Candidate Account'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10 active:scale-95 transition-all duration-150 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--glass-bg)] active:scale-95 transition-all duration-150 cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
