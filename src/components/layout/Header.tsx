'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
  FileText,
  FileSearch,
  BadgeCheck,
  FileEdit,
  Briefcase,
  BriefcaseBusiness,
  LayoutDashboard,
  MessageSquare,
  Wand2,
  Target,
  Home,
  User,
  Compass,
  LogOut,
  Sparkles,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/components/user/UserContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { AnimatedDrawer } from '@/components/ui/MotionPrimitives';

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, openModal, logout } = useUserProfile();

  // If in full assessment screen, admin console, user dashboard, or auth pages, hide standard header
  if (
    pathname?.startsWith('/skills/assess/') ||
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/dashboard') ||
    pathname === '/login' ||
    pathname === '/register'
  ) {
    return null;
  }

  const isPublicLanding = pathname === '/' && !user;

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'Home';
      case '/ats-score':
        return 'ATS Resume Score';
      case '/analyzer':
        return 'Resume Analyzer';
      case '/improver':
        return 'Resume Improver';
      case '/builder':
        return 'Resume Builder';
      case '/skills':
        return 'Skill Assessments';
      case '/job-match':
        return 'Job Match';
      case '/jobs':
        return 'Job Search';
      case '/guidance':
        return 'Career Guidance';
      case '/feedback':
        return 'Feedback';
      default:
        if (pathname?.startsWith('/skills/certificate/')) return 'Skill Certificate';
        return 'Smart Resume AI';
    }
  };

  const navLinks: { label: string; href: string; icon: any; badge?: string }[] = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'ATS Score', href: '/ats-score', icon: BarChart3 },
    { label: 'Resume Analyzer', href: '/analyzer', icon: FileText },
    { label: 'Skill Assessments', href: '/skills', icon: BadgeCheck },
    { label: 'Career Guidance', href: '/guidance', icon: Compass, badge: 'Coming Soon' },
    { label: 'Resume Builder', href: '/builder', icon: FileEdit },
    { label: 'Job Search', href: '/jobs', icon: BriefcaseBusiness },
    { label: 'Feedback', href: '/feedback', icon: MessageSquare },
  ];

  return (
    <>
      <header
        data-no-print="true"
        className={cn(
          "sticky top-0 z-20 w-full max-w-full glass-nav flex items-center justify-between px-4 sm:px-8 no-print overflow-hidden transition-all",
          isPublicLanding ? "h-12" : "h-14"
        )}
      >
        {/* Left: Brand or Mobile menu button & Title */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 shrink">
          {isPublicLanding ? (
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-7 h-7 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(79,143,247,0.35)] group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 leading-tight">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-[var(--text-primary)]">
                  Smart Resume
                </span>
                <span className="text-[10px] font-bold text-[var(--accent)] px-1.5 py-0.5 rounded-md bg-[var(--accent-subtle)] border border-[var(--accent)]/20 uppercase">
                  AI
                </span>
              </div>
            </Link>
          ) : (
            <>
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-xl border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] active:scale-95 transition-all duration-200 shrink-0"
                aria-label="Open mobile navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center min-w-0">
                <span className="font-semibold text-sm sm:text-base text-[var(--text-primary)] truncate max-w-[120px] xs:max-w-[170px] sm:max-w-none">
                  {getPageTitle()}
                </span>
              </div>
            </>
          )}

          {/* Desktop Nav Links when on public landing */}
          {isPublicLanding && (
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-[var(--glass-border)]">
              <a
                href="#features"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
              >
                Features
              </a>
              <a
                href="#workflow"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
              >
                How It Works
              </a>
              <Link
                href="/ats-score"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
              >
                ATS Score
              </Link>
              <Link
                href="/analyzer"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
              >
                ATS Audit
              </Link>
              <Link
                href="/builder"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
              >
                A4 Builder
              </Link>
              <Link
                href="/jobs"
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors"
              >
                Job Search
              </Link>
            </nav>
          )}
        </div>

        {/* Right: ThemeToggle, Auth buttons / User Profile & Primary action */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Responsive ThemeToggle: icon button on mobile/tablet, segmented on desktop */}
          <div className="lg:hidden shrink-0">
            <ThemeToggle variant="icon" />
          </div>
          <div className="hidden lg:block shrink-0">
            <ThemeToggle variant="segmented" />
          </div>

          {user?.name ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/dashboard"
                title={`Dashboard (${user.name})`}
                aria-label={`Dashboard (${user.name})`}
                className="inline-flex items-center gap-1.5 p-1.5 sm:px-2.5 lg:px-3 sm:py-1.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] text-xs text-[var(--text-primary)] transition-all duration-200 active:scale-[0.98] cursor-pointer shadow-[var(--shadow-xs)] group shrink-0"
              >
                <div className="w-6 h-6 sm:w-5 sm:h-5 rounded-lg bg-[var(--accent)]/12 text-[var(--accent)] font-semibold text-[11px] sm:text-[10px] flex items-center justify-center border border-[var(--accent)]/20 shrink-0">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-xs max-w-[90px] lg:max-w-[120px] truncate text-[var(--text-primary)] hidden sm:inline">
                  {user.name}
                </span>
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-[var(--accent-subtle)] text-[var(--accent)] hidden lg:inline">
                  Dashboard
                </span>
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl border border-[var(--glass-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--color-error)] hover:border-[var(--color-error)]/30 transition-all duration-200 active:scale-95 cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4 md:hidden text-[var(--text-secondary)]" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[var(--glass-border)] text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--glass-bg)] active:scale-[0.98] transition-all duration-200"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all duration-200 shadow-[var(--shadow-sm)] active:scale-95"
              >
                Get Started
              </Link>
            </div>
          )}

          <Link
            href="/analyzer"
            className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:border-[var(--glass-border-hover)] text-xs font-medium text-[var(--text-primary)] transition-all duration-200 active:scale-[0.98] shadow-[var(--shadow-xs)]"
          >
            <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
            Analyze Resume
          </Link>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <AnimatedDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        containerClassName="md:hidden"
        className="w-72 max-w-[85vw] p-5 flex flex-col justify-between"
      >
        <div>
          {/* Drawer Header - Text-only branding matching Sidebar */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--glass-border)]">
            <div className="flex flex-col">
              <span className="font-bold text-[16.5px] tracking-tight text-[var(--text-primary)] leading-tight">
                Smart Resume
              </span>
              <span className="text-[11px] text-[var(--accent)] font-medium tracking-wide uppercase opacity-80">
                Career Platform
              </span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] active:scale-95 transition-all duration-200 cursor-pointer"
              aria-label="Close navigation drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Links */}
          <nav className="mt-5 space-y-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'w-full h-11 flex items-center gap-3.5 px-3.5 rounded-xl text-[14px] font-medium transition-all duration-200 active:scale-[0.99]',
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-[var(--shadow-sm)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'
                  )}
                >
                  <div className="w-5 h-5 flex items-center justify-center shrink-0">
                    <Icon className="w-[18px] h-[18px] shrink-0" />
                  </div>
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-semibold tracking-wide shrink-0',
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Extra Tools */}
          <div className="mt-6 pt-4 border-t border-[var(--glass-border)]">
            <p className="px-3.5 text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2.5">
              AI Tools
            </p>
            <div className="space-y-1">
              <Link
                href="/improver"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 flex items-center gap-3.5 px-3.5 rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-all duration-200"
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Wand2 className="w-[18px] h-[18px] shrink-0" />
                </div>
                <span className="truncate flex-1 text-left">Resume Improver</span>
              </Link>
              <Link
                href="/job-match"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full h-11 flex items-center gap-3.5 px-3.5 rounded-xl text-[14px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-all duration-200"
              >
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <Target className="w-[18px] h-[18px] shrink-0" />
                </div>
                <span className="truncate flex-1 text-left">Job Match Engine</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile Theme Toggle */}
        <div className="py-2.5 px-3 mb-2 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] flex items-center justify-between">
          <span className="text-[11px] font-semibold text-[var(--text-muted)]">Theme</span>
          <ThemeToggle />
        </div>

        {/* Drawer Footer */}
        <div className="pt-3 border-t border-[var(--glass-border)] space-y-2">
          {user?.name ? (
            <div className="space-y-1.5">
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)] text-xs font-semibold shadow-[var(--shadow-xs)] hover:border-[var(--accent)]/30 transition-all"
              >
                <span>Dashboard ({user.name})</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/8 transition-all cursor-pointer"
              >
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center px-3 py-2.5 rounded-xl border border-[var(--glass-border)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)]/30 transition-all text-center"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center px-3 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all text-center shadow-[var(--shadow-sm)]"
              >
                Register
              </Link>
            </div>
          )}
          <Link
            href="/analyzer"
            onClick={() => setMobileMenuOpen(false)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold shadow-[var(--shadow-sm)] hover:bg-[var(--accent-hover)] transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Analyze My Resume</span>
          </Link>
        </div>
      </AnimatedDrawer>
    </>
  );
}
