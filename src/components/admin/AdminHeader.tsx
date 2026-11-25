'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Menu,
  X,
  ShieldCheck,
  LogOut,
  ExternalLink,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

interface AdminHeaderProps {
  adminEmail: string;
  adminRole: string;
}

export function AdminHeader({ adminEmail, adminRole }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const getPageTitle = () => {
    switch (pathname) {
      case '/admin/dashboard':
        return 'System Overview & Analytics';
      case '/admin/resumes':
        return 'Resume Analytics & Uploads';
      case '/admin/skills':
        return 'Skill Verifications';
      case '/admin/assessments':
        return 'Question Bank & Assessments';
      case '/admin/jobs':
        return 'Job Discovery & Searches';
      case '/admin/job-matches':
        return 'Resume-Job Match Operations';
      case '/admin/feedback':
        return 'User Feedback & Reviews';
      case '/admin/settings':
        return 'System Configuration & Security';
      default:
        return 'Admin Console';
    }
  };

  const navItems = [
    { label: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
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
      // Continue
    }
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <>
      <header
        data-no-print="true"
        className="app-topbar sticky top-3 z-20 h-[4.25rem] w-auto mx-3 sm:mx-4 border border-[var(--border-color)] rounded-full flex items-center justify-between px-3 sm:px-6 overflow-hidden no-print"
      >
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
            aria-label="Open admin navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex flex-col text-left min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-extrabold text-[var(--accent)] tracking-wider">
                Admin Console
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
                Live DB
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-extrabold text-[var(--text-primary)] truncate max-w-[110px] xs:max-w-[170px] sm:max-w-none">
              {getPageTitle()}
            </h2>
          </div>
        </div>

        {/* Right: Real Admin Identity */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Responsive ThemeToggle: icon on mobile/tablet, segmented on desktop */}
          <div className="lg:hidden shrink-0">
            <ThemeToggle variant="icon" />
          </div>
          <div className="hidden lg:block shrink-0">
            <ThemeToggle variant="segmented" />
          </div>

          <Link
            href="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors shrink-0"
          >
            <ExternalLink className="w-3 h-3" />
            Public App
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shrink-0">
            <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center font-bold text-xs shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-xs font-bold text-[var(--text-primary)] truncate max-w-[160px]">
                {adminEmail}
              </span>
              <span className="text-[9px] font-semibold text-[var(--text-secondary)] uppercase">
                {adminRole}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="p-2 rounded-lg border border-[var(--border-color)] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors shrink-0"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-black/60 backdrop-blur-sm animate-fade-in flex">
          <div className="w-72 max-w-[85vw] h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="font-black text-xs text-[var(--text-primary)]">
                      SMART RESUME AI
                    </span>
                    <span className="text-[9px] font-extrabold text-[var(--accent)] uppercase">
                      Admin Console
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <nav className="mt-4 space-y-1 text-left">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href.includes('?')
                    ? pathname === item.href.split('?')[0]
                    : pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
                        isActive
                          ? 'bg-[var(--accent)] text-white'
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

            <div className="pt-4 border-t border-[var(--border-color)] space-y-2">
              <div className="px-3 py-2 rounded-xl bg-[var(--bg-card)] text-left">
                <div className="text-[10px] uppercase font-bold text-[var(--accent)]">
                  {adminRole}
                </div>
                <div className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {adminEmail}
                </div>
              </div>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}
    </>
  );
}
