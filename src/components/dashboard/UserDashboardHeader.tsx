'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  LayoutDashboard,
  FileText,
  Wand2,
  Briefcase,
  Send,
  BadgeCheck,
  FileCheck2,
  Award,
  BookOpen,
  User,
  LogOut,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/components/user/UserContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface UserDashboardHeaderProps {
  user: {
    id: string;
    name: string;
    email: string | null;
  };
}

export function UserDashboardHeader({ user }: UserDashboardHeaderProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { logout } = useUserProfile();

  const getPageTitle = () => {
    switch (pathname) {
      case '/dashboard':
        return 'Career Overview';
      case '/dashboard/resumes':
        return 'My Resumes';
      case '/dashboard/analyses':
        return 'Resume Analyses';
      case '/dashboard/improvements':
        return 'Resume Improvements';
      case '/dashboard/jobs':
        return 'Job Matches';
      case '/dashboard/applications':
        return 'Job Application Tracker';
      case '/dashboard/skills':
        return 'Verified Skills';
      case '/dashboard/assessments':
        return 'Skill Assessments';
      case '/dashboard/certificates':
        return 'Earned Certificates';
      case '/dashboard/courses':
        return 'Career Courses & Progress';
      case '/dashboard/profile':
        return 'Profile & Account Settings';
      default:
        return 'Dashboard';
    }
  };

  const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'My Resumes', href: '/dashboard/resumes', icon: FileText },
    { label: 'My Improvements', href: '/dashboard/improvements', icon: Wand2 },
    { label: 'Job Matches', href: '/dashboard/jobs', icon: Briefcase },
    { label: 'My Applications', href: '/dashboard/applications', icon: Send },
    { label: 'My Skills', href: '/dashboard/skills', icon: BadgeCheck },
    { label: 'My Assessments', href: '/dashboard/assessments', icon: FileCheck2 },
    { label: 'My Certificates', href: '/dashboard/certificates', icon: Award },
    { label: 'My Courses', href: '/dashboard/courses', icon: BookOpen },
    { label: 'My Profile', href: '/dashboard/profile', icon: User },
  ];

  return (
    <>
      <header
        data-no-print="true"
        className="sticky top-0 z-20 h-16 w-full max-w-full glass-nav flex items-center justify-between px-4 sm:px-8 overflow-hidden no-print"
      >
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] active:scale-95 transition-all duration-150 shrink-0"
            aria-label="Open dashboard navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center min-w-0">
            <h1 className="font-bold text-sm sm:text-base md:text-lg text-[var(--text-primary)] tracking-tight truncate max-w-[110px] xs:max-w-[160px] sm:max-w-none">
              {getPageTitle()}
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Responsive ThemeToggle */}
          <div className="lg:hidden shrink-0">
            <ThemeToggle variant="icon" />
          </div>
          <div className="hidden lg:block shrink-0">
            <ThemeToggle variant="segmented" />
          </div>

          <Link
            href="/analyzer"
            title="Upload New Resume"
            aria-label="Upload New Resume"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-all duration-150 shadow-[0_2px_10px_rgba(79,143,247,0.3)] active:scale-95 cursor-pointer shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload New Resume</span>
          </Link>

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2 p-1.5 sm:px-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] active:scale-[0.98] transition-all duration-150 cursor-pointer shrink-0 shadow-xs"
            title={`Account Settings (${user.name})`}
            aria-label={`Account Settings (${user.name})`}
          >
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] font-bold text-xs flex items-center justify-center border border-[var(--accent)]/20 shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="hidden md:inline font-semibold text-xs text-[var(--text-primary)] max-w-[120px] truncate">
              {user.name}
            </span>
          </Link>

          <button
            onClick={() => logout()}
            title="Sign Out"
            aria-label="Sign Out"
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-[var(--glass-border)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
          >
            <LogOut className="w-3.5 h-3.5 sm:hidden" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm animate-fade-in flex">
          <div className="w-72 max-w-[85vw] h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] p-5 flex flex-col justify-between shadow-2xl animate-scale-in">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div className="flex flex-col">
                  <span className="font-bold text-sm tracking-tight text-[var(--text-primary)] leading-tight">
                    Smart Resume
                  </span>
                  <span className="text-[10px] text-[var(--accent)] font-semibold tracking-wide uppercase">
                    Career Dashboard
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] active:scale-95 transition-all duration-150"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="mt-5 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname === item.href || pathname?.startsWith(item.href + '/');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.99]',
                        isActive
                          ? 'bg-[var(--accent)] text-white shadow-xs font-semibold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="pt-3 border-t border-[var(--border-color)]">
              {/* Mobile Drawer Theme Toggle */}
              <div className="py-2 px-2.5 mb-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Theme</span>
                <ThemeToggle />
              </div>

              <div className="flex items-center gap-2 mb-3 px-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] font-bold text-xs flex items-center justify-center">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">
                    {user.email || 'Candidate'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 active:scale-95 text-xs font-semibold transition-all duration-150 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
