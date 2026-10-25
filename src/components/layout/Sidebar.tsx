'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  FileText,
  BadgeCheck,
  FileEdit,
  BriefcaseBusiness,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Wand2,
  Target,
  Compass,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

import { useUserProfile } from '@/components/user/UserContext';

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useUserProfile();

  // If inside full assessment screen, admin console, user dashboard, auth pages, or unauthenticated public landing, hide sidebar
  if (
    pathname?.startsWith('/skills/assess/') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/dashboard') ||
    pathname === '/login' ||
    pathname === '/register' ||
    (pathname === '/' && !user)
  ) {
    return null;
  }

  const primaryNavItems: { label: string; href: string; icon: any; badge?: string }[] = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'ATS Score', href: '/ats-score', icon: BarChart3 },
    { label: 'Resume Analyzer', href: '/analyzer', icon: FileText },
    { label: 'Skill Assessments', href: '/skills', icon: BadgeCheck },
    { label: 'Career Guidance', href: '/guidance', icon: Compass, badge: 'Coming Soon' },
    { label: 'Resume Builder', href: '/builder', icon: FileEdit },
    { label: 'Job Search', href: '/jobs', icon: BriefcaseBusiness },
    { label: 'Feedback', href: '/feedback', icon: MessageSquare },
  ];

  const secondaryTools = [
    { label: 'Resume Improver', href: '/improver', icon: Wand2 },
    { label: 'Job Match', href: '/job-match', icon: Target },
  ];

  return (
    <aside
      data-no-print="true"
      className={cn(
        'hidden md:flex flex-col glass-sidebar transition-[width] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-30 shrink-0 h-screen sticky top-0 no-print select-none',
        collapsed ? 'w-[72px]' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--glass-border)] shrink-0">
        <Link href="/" className="flex items-center overflow-hidden group min-w-0">
          {!collapsed ? (
            <div className="flex flex-col leading-tight overflow-hidden">
              <span className="font-bold tracking-tight text-[16.5px] text-[var(--text-primary)] leading-tight whitespace-nowrap">
                Smart Resume
              </span>
              <span className="text-[11px] tracking-wider font-medium text-[var(--accent)] uppercase whitespace-nowrap opacity-80">
                Career Platform
              </span>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
              <span className="font-bold text-[15px] text-[var(--accent)] tracking-tight">
                SR
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--bg-elevated)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--glass-border-hover)] flex items-center justify-center shadow-[var(--shadow-sm)] active:scale-95 transition-all duration-200 z-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Platform Section */}
        <div className="w-full">
          {!collapsed && (
            <p className="px-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5 select-none">
              Platform
            </p>
          )}
          <nav className="w-full space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'w-full h-11 flex items-center rounded-xl text-[14px] font-medium transition-all duration-200 group relative select-none',
                    collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] active:scale-[0.99]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-primary)]'
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
                        isActive ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                      )}
                    />
                  </div>
                  {!collapsed && (
                    <span className="truncate flex-1 text-left leading-normal">{item.label}</span>
                  )}
                  {!collapsed && item.badge && (
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-md font-medium tracking-wide shrink-0',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--accent-subtle)] text-[var(--accent)]'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Intelligence Tools Section */}
        <div className="w-full">
          {!collapsed && (
            <p className="px-3 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5 select-none">
              AI Tools
            </p>
          )}
          <nav className="w-full space-y-1">
            {secondaryTools.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'w-full h-11 flex items-center rounded-xl text-[14px] font-medium transition-all duration-200 group relative select-none',
                    collapsed ? 'justify-center px-0' : 'justify-start gap-3 px-3',
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] active:scale-[0.99]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--bg-primary)]'
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <Icon
                      className={cn(
                        'w-[18px] h-[18px] shrink-0 transition-transform duration-200 group-hover:scale-110',
                        isActive ? 'text-white' : 'text-[var(--text-muted)] group-hover:text-[var(--text-primary)]'
                      )}
                    />
                  </div>
                  {!collapsed && (
                    <span className="truncate flex-1 text-left leading-normal">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Sidebar Footer with Theme Toggle */}
      <div className="p-3 border-t border-[var(--glass-border)] shrink-0">
        {collapsed ? (
          <div className="flex items-center justify-center">
            <ThemeToggle variant="icon" />
          </div>
        ) : (
          <div className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] overflow-hidden">
            <span className="text-[11px] font-medium text-[var(--text-muted)] shrink-0 select-none">
              Theme
            </span>
            <ThemeToggle className="shrink-0" />
          </div>
        )}
      </div>
    </aside>
  );
}
