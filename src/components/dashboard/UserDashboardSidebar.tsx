'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileEdit,
  FileText,
  Briefcase,
  Award,
  Send,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
  Wand2,
  FileSearch,
  Sparkles,
  Code2,
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

  const primaryNavItems: Array<{ label: string; href: string; icon: any; badge?: string }> = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Resume Builder', href: '/builder', icon: FileEdit },
    { label: 'Project Mentor', href: '/projects', icon: Code2, badge: 'AI' },
    { label: 'My Resumes', href: '/dashboard/resumes', icon: FileText },
    { label: 'Job Search', href: '/jobs', icon: Briefcase },
    { label: 'Skill Assessment', href: '/skills', icon: Award },
    { label: 'Apply Assistant', href: '/apply-assistant', icon: Sparkles, badge: 'AI' },
    { label: 'Application Tracker', href: '/dashboard/applications', icon: Send },
    { label: 'Profile & Settings', href: '/dashboard/profile', icon: User },
  ];

  const aiToolItems: Array<{ label: string; href: string; icon: any; badge?: string }> = [
    { label: 'ATS Score', href: '/ats-score', icon: BarChart3 },
    { label: 'AI Phrasing Improver', href: '/improver', icon: Wand2 },
    { label: 'Resume Analyzer', href: '/analyzer', icon: FileSearch },
  ];

  return (
    <aside
      data-no-print="true"
      className={cn(
        'hidden md:flex flex-col bg-[var(--bg-secondary)] border-r border-[var(--border-color)] transition-[width] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-30 shrink-0 h-screen sticky top-0 no-print select-none',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-color)] shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight text-[var(--text-primary)] leading-tight whitespace-nowrap">
                Smart Resume
              </span>
              <span className="text-[10px] text-[var(--accent)] font-mono font-semibold tracking-wider uppercase whitespace-nowrap">
                Career AI
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        {/* Core Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 select-none">
              Workspace
            </p>
          )}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'w-full h-9 flex items-center rounded-full text-xs font-medium transition-all duration-150 relative select-none',
                  collapsed ? 'justify-center px-0' : 'justify-start gap-2.5 px-3.5',
                  isActive
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-color)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-transform duration-150',
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  )}
                />
                {!collapsed && (
                  <span className="truncate flex-1 text-left leading-normal">
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/30 mr-1">
                    {item.badge}
                  </span>
                )}
                {!collapsed && isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 shadow-[0_0_6px_var(--accent)]" />
                )}
              </Link>
            );
          })}
        </div>

        {/* AI & Optimization Tools */}
        <div className="pt-3 border-t border-[var(--border-color)] space-y-1">
          {!collapsed && (
            <p className="px-3.5 text-[10px] font-mono font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2 select-none">
              AI Tools
            </p>
          )}
          {aiToolItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'w-full h-9 flex items-center rounded-full text-xs font-medium transition-all duration-150 relative select-none',
                  collapsed ? 'justify-center px-0' : 'justify-start gap-2.5 px-3.5',
                  isActive
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] font-semibold border border-[var(--border-color)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                )}
              >
                <Icon
                  className={cn(
                    'w-3.5 h-3.5 shrink-0',
                    isActive ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'
                  )}
                />
                {!collapsed && (
                  <span className="truncate flex-1 text-left leading-normal">
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/30 mr-1">
                    {item.badge}
                  </span>
                )}
                {!collapsed && isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 shadow-[0_0_6px_var(--accent)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* User Footer Profile & Appearance Toggle */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2">
        {/* Appearance Row */}
        <div className={cn('flex items-center', collapsed ? 'justify-center' : 'justify-between px-1.5 py-0.5')}>
          {!collapsed && (
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Theme</span>
          )}
          <ThemeToggle variant={collapsed ? 'icon' : 'default'} />
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-xs">
          <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white font-bold text-xs flex items-center justify-center shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                {user.name}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                {user.email || 'Candidate'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => logout()}
              title="Sign Out"
              aria-label="Sign Out"
              className="p-1 rounded-full text-[var(--text-muted)] hover:text-rose-400 hover:bg-rose-400/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
          title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
