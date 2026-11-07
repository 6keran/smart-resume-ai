'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  LayoutDashboard,
  FileEdit,
  FileText,
  Briefcase,
  Award,
  Send,
  User,
  Settings,
  LogOut,
  Plus,
  Search,
  Bell,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Wand2,
  FileSearch,
  Sparkles,
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
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { logout } = useUserProfile();

  const getBreadcrumb = () => {
    switch (pathname) {
      case '/dashboard':
        return { section: 'Workspace', page: 'Career Overview' };
      case '/dashboard/resumes':
        return { section: 'Workspace', page: 'My Resumes' };
      case '/dashboard/analyses':
        return { section: 'Intelligence', page: 'Resume Analyses' };
      case '/dashboard/improvements':
        return { section: 'Studio', page: 'AI Improvements' };
      case '/dashboard/jobs':
        return { section: 'Pipeline', page: 'Job Matches' };
      case '/dashboard/applications':
        return { section: 'Pipeline', page: 'Application Tracker' };
      case '/dashboard/skills':
        return { section: 'Credentials', page: 'Verified Skills' };
      case '/dashboard/assessments':
        return { section: 'Credentials', page: 'Skill Assessments' };
      case '/dashboard/certificates':
        return { section: 'Credentials', page: 'Certificates' };
      case '/dashboard/courses':
        return { section: 'Learning', page: 'Courses' };
      case '/dashboard/profile':
        return { section: 'Account', page: 'Profile & Settings' };
      default:
        return { section: 'Workspace', page: 'Dashboard' };
    }
  };

  const { section, page } = getBreadcrumb();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/jobs?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const mobileNavItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Resume Builder', href: '/builder', icon: FileEdit },
    { label: 'My Resumes', href: '/dashboard/resumes', icon: FileText },
    { label: 'Job Search', href: '/jobs', icon: Briefcase },
    { label: 'Skill Assessment', href: '/skills', icon: Award },
    { label: 'Application Tracker', href: '/dashboard/applications', icon: Send },
    { label: 'Profile & Settings', href: '/dashboard/profile', icon: User },
    { label: 'ATS Score', href: '/ats-score', icon: BarChart3 },
    { label: 'AI Phrasing Improver', href: '/improver', icon: Wand2 },
    { label: 'Resume Analyzer', href: '/analyzer', icon: FileSearch },
  ];

  return (
    <>
      <header
        data-no-print="true"
        className="sticky top-0 z-20 h-16 w-full border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/90 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 lg:px-8 no-print shadow-xs"
      >
        {/* Left: Mobile Toggle & Page Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden btn-icon btn-icon-sm rounded-full shrink-0"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
              <span>{section}</span>
              <ChevronRight className="w-3 h-3 text-[var(--border-color)]" />
              <span className="text-[var(--accent)] font-semibold">{page}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight truncate leading-tight">
              {page}
            </h1>
          </div>
        </div>

        {/* Center: Search Bar (Desktop) */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-6">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs, resumes, applications..."
              className="w-full h-9 pl-9 pr-10 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-full text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(79,131,241,0.22)] transition-all"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono text-[var(--text-muted)] px-1.5 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)]">
              ↵
            </span>
          </form>
        </div>

        {/* Right: Quick Actions & Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Action: New Resume with Ink Pill */}
          <Link
            href="/builder"
            className="btn-primary text-xs py-1.5 px-4 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Resume</span>
          </Link>

          {/* Theme Toggle */}
          <div className="shrink-0">
            <ThemeToggle variant="icon" />
          </div>

          {/* Notification Alert Link */}
          <Link
            href="/dashboard/applications"
            title="Application Alerts"
            aria-label="Application Alerts"
            className="btn-icon btn-icon-sm rounded-full relative shadow-xs"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] absolute top-2 right-2 ring-2 ring-[var(--bg-secondary)]" />
          </Link>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 sm:px-2.5 rounded-full border border-[var(--border-color)] hover:border-[var(--border-hover)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] transition-all cursor-pointer shadow-xs"
              aria-label="User menu"
              aria-expanded={profileDropdownOpen}
            >
              <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline font-semibold text-xs text-[var(--text-primary)] max-w-[100px] truncate">
                {user.name}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)] hidden sm:inline" />
            </button>

            <AnimatePresence>
              {profileDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 mt-2 w-56 rounded-2xl bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-color)] shadow-xl py-2 z-50"
                  onMouseLeave={() => setProfileDropdownOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-[var(--border-color)]">
                    <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {user.email || 'Candidate Account'}
                    </p>
                  </div>

                  <div className="p-1 space-y-0.5">
                    <Link
                      href="/dashboard/profile"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Profile & Settings</span>
                    </Link>

                    <Link
                      href="/dashboard/resumes"
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>My Resumes</span>
                    </Link>
                  </div>

                  <div className="pt-1 mt-1 border-t border-[var(--border-color)] px-1">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm flex"
            onClick={(e) => {
              if (e.target === e.currentTarget) setMobileMenuOpen(false);
            }}
          >
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-72 max-w-[85vw] h-full bg-[var(--glass-bg-elevated)] backdrop-blur-2xl border-r border-[var(--glass-border)] p-4 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between pb-3.5 border-b border-[var(--glass-border)]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-sm tracking-tight text-[var(--text-primary)] block leading-tight">
                        Smart Resume
                      </span>
                      <span className="text-[10px] text-[var(--accent)] font-semibold uppercase">
                        Career OS
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <nav className="mt-4 space-y-1">
                  {mobileNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors',
                          isActive
                            ? 'bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold border border-[var(--accent)]/30'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'
                        )}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-3 border-t border-[var(--glass-border)] space-y-2">
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Appearance</span>
                  <ThemeToggle />
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent)] text-white font-bold text-xs flex items-center justify-center shrink-0">
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
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-[var(--color-error)]/30 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
