'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  FileText,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowRight,
  Loader2,
  AlertCircle,
  FileSearch,
  Wand2,
  BadgeCheck,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import { useUserProfile } from '@/components/user/UserContext';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { motion } from 'framer-motion';

const PLATFORM_HIGHLIGHTS = [
  {
    step: '01',
    title: 'ANALYZE',
    desc: 'Review resume structure and keywords',
    icon: FileSearch,
  },
  {
    step: '02',
    title: 'IMPROVE',
    desc: 'Refine resume bullet wording',
    icon: Wand2,
  },
  {
    step: '03',
    title: 'VERIFY',
    desc: 'Take a technical assessment',
    icon: BadgeCheck,
  },
  {
    step: '04',
    title: 'MATCH',
    desc: 'Search openings and review matches',
    icon: Briefcase,
  },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get('from');
  const safeFrom =
    rawFrom &&
    rawFrom.startsWith('/') &&
    !rawFrom.startsWith('//') &&
    rawFrom !== '/login' &&
    rawFrom !== '/register' &&
    !rawFrom.startsWith('/admin')
      ? rawFrom
      : '/dashboard';

  const { user, loading: userLoading, refreshUser } = useUserProfile();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // If already authenticated, redirect immediately to dashboard
  useEffect(() => {
    if (!userLoading && user) {
      window.location.href = safeFrom;
    }
  }, [user, userLoading, safeFrom]);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
    if (isLoading) return;
    setError(null);

    const cleanName = fullName.trim();
    const cleanEmail = email.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Please provide your real full name (at least 2 characters).');
      return;
    }

    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com).');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify your password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanName,
          email: cleanEmail,
          password,
          confirmPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || 'Registration failed. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data.user && refreshUser) {
        await refreshUser(data.user);
      }

      window.location.replace(safeFrom);
    } catch {
      setError('Unable to reach the registration server. Please check your network connection.');
      setIsLoading(false);
    }
  };

  // If user is already loaded, show a minimal loading spinner while redirecting
  if (!userLoading && user) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)] mb-3" />
        <p className="text-xs text-[var(--text-secondary)] font-medium">
          Already signed in. Redirecting to your dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10">
      {/* LEFT COLUMN: Premium Brand Experience & Journey (~55%) */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex lg:col-span-7 flex-col justify-between space-y-8"
      >
        {/* Brand Header */}
        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded-xl"
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform duration-200">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-extrabold tracking-tight text-base sm:text-lg text-[var(--text-primary)]">
                SMART RESUME
              </span>
              <span className="text-[10px] tracking-widest font-bold text-[var(--accent)] uppercase">
                CAREER PLATFORM
              </span>
            </div>
          </Link>

          <div className="pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-[var(--accent-subtle)] border border-[var(--border-color)] text-[var(--text-secondary)] mb-3 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>CAREER WORKSPACE PLATFORM</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[var(--text-primary)] leading-[1.15]">
              Structured Career Workspace & Verification Platform.
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3 leading-relaxed max-w-xl">
              Save your resumes, analysis results, and application history in one account.
            </p>
          </div>
        </div>

        {/* Informational Workflow Highlights (No fake numbers) */}
        <div className="space-y-3 pt-1">
          <span className="text-[10px] font-bold tracking-widest text-[var(--text-secondary)] uppercase">
            Platform Workflow
          </span>

          <div className="grid grid-cols-1 gap-2.5 max-w-lg">
            {PLATFORM_HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="group flex items-center gap-3.5 p-3 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:border-[var(--accent)]/40 hover:bg-[var(--glass-bg-elevated)] backdrop-blur-md shadow-xs transition-all duration-200"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-[var(--accent)]">
                        {item.step}
                      </span>
                      <span className="text-xs font-bold tracking-wider text-[var(--text-primary)]">
                        {item.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </motion.div>

      {/* RIGHT COLUMN: Elevated Glass Register Card (~45%) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="lg:col-span-5 w-full max-w-md mx-auto"
      >
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] p-7 sm:p-9 shadow-xl relative overflow-hidden transition-all duration-300">
          {/* Mobile brand header */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-6 pb-4 border-b border-[var(--border-color)]">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white shadow-sm">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex flex-col text-left leading-tight">
              <span className="font-extrabold text-xs tracking-tight text-[var(--text-primary)]">
                SMART RESUME
              </span>
              <span className="text-[9px] font-bold text-[var(--accent)] tracking-widest uppercase">
                CAREER PLATFORM
              </span>
            </div>
          </div>

          {/* Card Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              Create your account
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5">
              Start building your smarter career profile.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-400 text-xs flex items-start gap-2.5 backdrop-blur-xs"
              role="alert"
              id="register-error"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed font-medium">{error}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* Full Name */}
            <div>
              <label
                htmlFor="fullName"
                className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2"
              >
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="fullName"
                  type="text"
                  required
                  autoComplete="name"
                  readOnly={!mounted}
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Rahul Sharma"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'register-error' : undefined}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 shadow-xs transition-all"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  readOnly={!mounted}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="rahul.sharma@email.com"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'register-error' : undefined}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 shadow-xs transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  readOnly={!mounted}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="At least 6 characters"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'register-error' : undefined}
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 shadow-xs transition-all"
                />
                <button
                  type="button"
                  id="toggle-password"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword((prev) => !prev);
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded z-10"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-semibold text-[var(--text-primary)] uppercase tracking-wider mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  readOnly={!mounted}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Repeat your password"
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'register-error' : undefined}
                  className="w-full pl-10 pr-11 py-2.5 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20 shadow-xs transition-all"
                />
                <button
                  type="button"
                  id="toggle-confirm-password"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowConfirmPassword((prev) => !prev);
                  }}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded z-10"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showConfirmPassword}
                  tabIndex={0}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              data-magnetic="true"
              disabled={isLoading}
              className="btn-primary w-full mt-2 h-[44px] px-4 text-sm font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 hover:shadow-lg transition-all"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--glass-border)]" />
            </div>
            <span className="relative px-3 bg-[var(--glass-bg-elevated)] text-[11px] uppercase tracking-wider text-[var(--text-secondary)] font-medium">
              Already have an account?
            </span>
          </div>

          {/* Sign In Link */}
          <Link
            href={`/login${safeFrom !== '/dashboard' ? `?from=${encodeURIComponent(safeFrom)}` : ''}`}
            className="btn-secondary w-full py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Sign in →</span>
          </Link>

          {/* Admin Footnote */}
          <div className="text-center mt-5 pt-4 border-t border-[var(--glass-border)]">
            <p className="text-[11px] text-[var(--text-secondary)]">
              Need administrative access?{' '}
              <Link
                href="/admin/login"
                className="text-[var(--accent)] hover:underline font-semibold"
              >
                Admin Portal →
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10 bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden">
      {/* Top Bar with Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center gap-2">
        <div className="sm:hidden">
          <ThemeToggle variant="icon" />
        </div>
        <div className="hidden sm:block">
          <ThemeToggle variant="segmented" />
        </div>
      </div>
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Decorative Ambient Glow Orbs */}
      <div className="w-[500px] h-[500px] rounded-full bg-[var(--accent)]/10 blur-3xl pointer-events-none absolute -top-40 -left-40" />
      <div className="w-[450px] h-[450px] rounded-full bg-slate-500/10 blur-3xl pointer-events-none absolute -bottom-20 -right-20" />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </div>
  );
}
