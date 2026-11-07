'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawFrom = searchParams.get('from');
  const safeFrom =
    rawFrom &&
    rawFrom.startsWith('/') &&
    !rawFrom.startsWith('//')
      ? rawFrom
      : '/admin/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault?.();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please enter both your administrator email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || 'Invalid email or password. Access denied.');
        setIsLoading(false);
        return;
      }

      // Successful authentication -> navigate to safe destination
      window.location.replace(safeFrom);
    } catch {
      setError('Secure connection failed. Please check network connectivity and retry.');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto relative z-10">

      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--accent)] text-white mb-4">
          <ShieldCheck className="w-7 h-7" />
        </div>

        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-extrabold tracking-wider uppercase bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
            <ShieldCheck className="w-3 h-3 text-[var(--accent)]" />
            Smart Resume AI
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
          ADMIN PORTAL
        </h1>

        <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1.5 max-w-xs mx-auto leading-relaxed">
          Sign in to continue to the administration dashboard.
        </p>
      </div>

      {/* Main Login Card */}
      <div className="p-6 sm:p-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm text-left relative overflow-hidden">

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-[var(--accent)]" />
              Secure Sign In
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Secure access to career intelligence administration.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Email Field */}
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-bold text-[var(--text-primary)] mb-1.5 uppercase tracking-wider"
            >
              Email Address
            </label>
            <div className="relative group">
              <Mail className="w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
              <input
                id="admin-email"
                type="email"
                required
                readOnly={!mounted}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="admin@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all"
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="admin-password"
                className="block text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider"
              >
                Password
              </label>
            </div>
            <div className="relative group">
              <Lock className="w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-[var(--accent)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors" />
              <input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                required
                readOnly={!mounted}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-all font-mono text-xs sm:text-sm"
                autoComplete="current-password"
              />
              <button
                type="button"
                id="admin-toggle-password"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPassword((prev) => !prev);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer z-10"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                tabIndex={0}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 h-[44px] px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Clean Invalid Credentials Error Message Below Form */}
          {error && (
            <div
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-500 dark:text-rose-400 mt-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{error}</div>
            </div>
          )}
        </form>

        {/* Footer Guarantee & User Portal Navigation */}
        <div className="mt-6 pt-5 border-t border-[var(--border-color)] text-center space-y-2.5">
          <p className="text-[11px] text-[var(--text-secondary)] font-medium">
            Authorized administrative personnel only.
          </p>
          <div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--accent)] font-medium transition-colors cursor-pointer group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to User Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden">
      {/* Top Bar: Back to User Portal (Left) & Theme Toggle (Right) */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-30">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/80 hover:bg-[var(--bg-card)] hover:border-[var(--border-hover)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-95 shadow-xs backdrop-blur-xs cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to User Portal</span>
        </Link>
      </div>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-30 flex items-center gap-2">
        <div className="sm:hidden">
          <ThemeToggle variant="icon" />
        </div>
        <div className="hidden sm:block">
          <ThemeToggle variant="segmented" />
        </div>
      </div>

      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

      <Suspense
        fallback={
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--accent)]" />
            Loading Admin Portal...
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>
    </div>
  );
}
