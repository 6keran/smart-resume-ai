'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Briefcase,
  CheckCircle2,
  Code2,
  Compass,
  FileEdit,
  FileSearch,
  Layers,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Wand2,
  X,
} from 'lucide-react';
import { ScrollReveal, StaggerChild, StaggerGroup } from '@/components/ui/MotionPrimitives';
import { GlassCard } from '@/components/ui/GlassCard';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 25);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-x-hidden">
      {/* ========================================================================= */}
      {/* 1. HALCYON-INSPIRED FULL-BLEED PHOTOGRAPHIC HERO                         */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[94vh] lg:min-h-screen flex flex-col justify-between hero-landscape-bg text-white">
        {/* Subtle Atmospheric Sky Tint */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-[#123F43]/35 via-transparent to-[#0B1518]/90 pointer-events-none"
          aria-hidden="true"
        />

        {/* ─── Transparent Navigation Bar ──────────────────────────────── */}
        <header
          className={`sticky top-0 z-40 w-full transition-all duration-300 ${
            scrolled
              ? 'bg-[#0F2226]/95 backdrop-blur-md border-b border-white/10 shadow-md py-3'
              : 'bg-transparent border-b border-white/10 py-5'
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
            {/* Left: Smart Resume AI Wordmark */}
            <Link href="/" className="flex items-center gap-2 group">
              <span className="font-serif-display text-xl sm:text-2xl font-bold tracking-tight text-[#FAFAF8]">
                Smart Resume
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#D8B9C2] px-1.5 py-0.5 rounded border border-[#D8B9C2]/30 bg-[#D8B9C2]/10">
                AI
              </span>
            </Link>

            {/* Center Navigation Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-medium tracking-wide text-white/80">
              <a
                href="#overview"
                className="hover:text-white transition-colors"
              >
                Product
              </a>
              <Link
                href="/builder"
                className="hover:text-white transition-colors"
              >
                Resume Builder
              </Link>
              <Link
                href="/jobs"
                className="hover:text-white transition-colors"
              >
                Job Search
              </Link>
              <a
                href="#features"
                className="hover:text-white transition-colors"
              >
                Features
              </a>
              <Link
                href="/faq"
                className="hover:text-white transition-colors"
              >
                FAQ
              </Link>
            </nav>

            {/* Right CTAs (Desktop) */}
            <div className="hidden sm:flex items-center gap-4">
              <Link
                href="/login"
                className="text-xs font-medium text-white/85 hover:text-white transition-colors px-2 py-1"
              >
                Sign In
              </Link>
              <Link
                href="/builder"
                className="bg-[#FAFAF8] hover:bg-white text-[#123F43] text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-xs active:scale-98"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg text-white/85 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-[#0F2226]/98 border-b border-white/15 px-5 py-4 space-y-3 animate-fade-in text-sm">
              <a
                href="#overview"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-white/90 hover:text-white"
              >
                Product
              </a>
              <Link
                href="/builder"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-white/90 hover:text-white"
              >
                Resume Builder
              </Link>
              <Link
                href="/jobs"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-white/90 hover:text-white"
              >
                Job Search
              </Link>
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-white/90 hover:text-white"
              >
                Features
              </a>
              <Link
                href="/faq"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-white/90 hover:text-white"
              >
                FAQ
              </Link>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-xs font-medium text-white border border-white/20 rounded-lg hover:bg-white/10"
                >
                  Sign In
                </Link>
                <Link
                  href="/builder"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 py-2 text-center text-xs font-semibold bg-[#FAFAF8] text-[#123F43] rounded-lg hover:bg-white"
                >
                  Get Started
                </Link>
              </div>
            </div>
          )}
        </header>

        {/* ─── Hero Centered Content ──────────────────────────────────── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-4xl mx-auto">
          {/* Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/20 bg-white/10 backdrop-blur-xs text-[11px] font-semibold text-white/90 tracking-widest uppercase mb-6 sm:mb-8 shadow-xs">
            <span>YOUR NEXT CAREER MOVE STARTS HERE</span>
          </div>

          {/* Main Headline — Elegant Serif Display Typography */}
          <h1 className="font-serif-display text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-normal tracking-tight text-white leading-[1.08] max-w-3xl mx-auto">
            Build a resume that opens doors.
          </h1>

          {/* Supporting Text */}
          <p className="mt-5 sm:mt-6 text-sm sm:text-base md:text-lg text-white/85 max-w-2xl mx-auto font-normal leading-relaxed">
            Create a compelling resume, discover relevant opportunities, and showcase the skills that move your career forward.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 sm:mt-10 w-full sm:w-auto">
            <Link
              href="/builder"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#FAFAF8] hover:bg-white text-[#123F43] text-sm font-semibold px-7 py-3.5 rounded-lg transition-colors shadow-sm active:scale-98"
            >
              <span>Build My Resume</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#features"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/25 hover:border-white/45 bg-white/5 hover:bg-white/10 text-white text-sm font-medium px-6 py-3.5 rounded-lg transition-colors"
            >
              <span>Explore Features</span>
            </a>
          </div>
        </div>

        {/* ─── Trust & Capability Strip (Halcyon Client Strip Equivalent) ── */}
        <div className="relative z-10 w-full border-t border-white/12 bg-black/20 backdrop-blur-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 text-xs sm:text-sm font-medium tracking-wide text-white/75">
              <span className="flex items-center gap-2 hover:text-white transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D8B9C2]" />
                <span>AI Resume Assistance</span>
              </span>
              <span className="flex items-center gap-2 hover:text-white transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D8B9C2]" />
                <span>ATS-Oriented Resume Guidance</span>
              </span>
              <span className="flex items-center gap-2 hover:text-white transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D8B9C2]" />
                <span>Job Matching</span>
              </span>
              <span className="flex items-center gap-2 hover:text-white transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D8B9C2]" />
                <span>Skill Assessment</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. PRODUCT OVERVIEW & DOCUMENT ARCHITECTURE                               */}
      {/* ========================================================================= */}
      <section id="overview" className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
            Precision Career Platform
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-[var(--text-primary)]">
            Designed for genuine career momentum
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
            Every document formatted to international A4 dimensions. Every ATS analysis tested against standard recruitment software parser benchmarks.
          </p>
        </div>

        {/* Layered Document Preview Container */}
        <div className="relative glass-workbench p-4 sm:p-7 shadow-xl border border-[var(--glass-border)] max-w-5xl mx-auto">
          {/* Toolbar */}
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-[var(--glass-border)] text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
              <span className="ml-2 font-mono text-[11px] text-[var(--text-muted)]">
                workspace/alex_chen_resume.v3.pdf
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium">
                <CheckCircle2 className="w-3 h-3" />
                ATS Compliant
              </span>
              <span className="hidden sm:inline font-mono text-[11px] text-[var(--text-muted)]">
                A4 Standard (210×297mm)
              </span>
            </div>
          </div>

          {/* Two-Column Document & Intelligence Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Document View */}
            <div className="lg:col-span-7 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] p-5 sm:p-6 shadow-inner space-y-4 font-sans text-left">
              <div className="border-b border-[var(--border-color)] pb-3.5">
                <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
                  Alex Chen
                </h3>
                <p className="text-xs font-semibold text-[var(--accent)]">
                  Senior Full Stack & Cloud Systems Engineer
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  San Francisco, CA · alex.chen@example.com · github.com/alexchen
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-primary)]">
                  Professional Summary
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Full stack engineer with 6+ years specializing in distributed systems, Next.js, Node.js, and PostgreSQL. Architected microservices supporting 2.4M monthly active users while maintaining 99.98% uptime.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[var(--text-primary)]">Lead Systems Engineer</span>
                  <span className="text-[10px] text-[var(--text-muted)]">2021 — Present</span>
                </div>
                <p className="text-[11px] text-[var(--accent)] font-medium">Nexus Cloud Infrastructure</p>
                <ul className="text-[11px] text-[var(--text-secondary)] space-y-1 list-disc pl-4 leading-relaxed">
                  <li>Architected event-driven ingestion pipeline handling 18,000 events/sec with Apache Kafka and Go.</li>
                  <li>Reduced database query latency by 42% through targeted PostgreSQL indexing and Redis caching.</li>
                  <li>Mentored 5 junior and mid-level engineers in distributed system design and testing.</li>
                </ul>
              </div>

              <div className="pt-1">
                <h4 className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-primary)] mb-1.5">
                  Verified Competencies
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {['TypeScript', 'Next.js', 'Node.js', 'PostgreSQL', 'Docker', 'AWS', 'GraphQL'].map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-[var(--glass-bg)] border border-[var(--border-color)] text-[var(--text-primary)]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: ATS & Intelligence Cards */}
            <div className="lg:col-span-5 flex flex-col justify-between gap-4">
              {/* ATS Dial */}
              <div className="rounded-xl p-4 bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] shadow-md">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-[var(--accent)]" />
                    ATS Compatibility
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Tier 1 · Recruiter Ready
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 shrink-0 flex items-center justify-center rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--accent)] shadow-[0_0_16px_rgba(79,131,241,0.25)]">
                    <div className="text-center">
                      <span className="text-xl font-extrabold text-[var(--text-primary)]">89</span>
                      <span className="text-[9px] text-[var(--text-muted)] block -mt-1">/100</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 text-xs">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--text-secondary)]">Keyword Match</span>
                      <span className="font-semibold text-emerald-400">92%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[var(--border-color)] overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full w-[92%]" />
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--text-secondary)]">Structure Check</span>
                      <span className="font-semibold text-[var(--highlight-blue)]">Passed</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Phrasing Suggestion */}
              <div className="rounded-xl p-4 bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] shadow-md space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                    <Wand2 className="w-3.5 h-3.5" />
                    Fact-Preserving Phrasing
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium">100% Fact Intact</span>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-1">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                    Original Draft
                  </span>
                  <p className="text-[11px] text-[var(--text-secondary)] line-through opacity-70">
                    &ldquo;I made a website with Python and fixed some database issues.&rdquo;
                  </p>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--accent-subtle)] border border-[var(--accent)]/30 space-y-1">
                  <span className="text-[9px] font-bold text-[var(--accent)] uppercase tracking-wider block">
                    Elevated Phrasing
                  </span>
                  <p className="text-[11px] font-medium text-[var(--text-primary)]">
                    &ldquo;Developed a web application using Python and Django, implementing authentication and resolving critical database bottlenecks.&rdquo;
                  </p>
                </div>
              </div>

              {/* Target Role Match */}
              <div className="rounded-xl p-3.5 bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] shadow-md flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)] block">
                    Target Role Match
                  </span>
                  <p className="text-xs font-bold text-[var(--text-primary)]">
                    Staff Software Engineer
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-[var(--accent)]">94%</span>
                  <span className="text-[10px] text-emerald-400 block font-medium">High Match</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. CORE PLATFORM PILLARS (Bento Grid)                                     */}
      {/* ========================================================================= */}
      <section id="features" className="px-4 sm:px-6 lg:px-8 py-20 sm:py-28 border-t border-[var(--border-color)] relative">
        <div className="max-w-7xl mx-auto space-y-14">
          <ScrollReveal className="max-w-3xl mx-auto text-center space-y-3">
            <span className="text-xs font-bold tracking-widest text-[var(--accent)] uppercase">
              Comprehensive Career Ecosystem
            </span>
            <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Eight Specialized Tools. <br />
              One Integrated Workspace.
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Every phase of your career advancement—from drafting an A4 resume to passing applicant tracking systems and discovering verified openings.
            </p>
          </ScrollReveal>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* 1. Resume Builder */}
            <div className="lg:col-span-2 bento-card p-6 sm:p-8 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--accent-subtle)] border border-[var(--accent)]/30 text-[var(--accent)] flex items-center justify-center shadow-xs">
                  <FileEdit className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider">
                    Core Studio
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] mt-1">
                    Standard A4 Resume Builder
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed max-w-xl">
                    Create professional resumes formatted to international A4 standards (210×297mm). Features 12 production templates, real-time zoom preview, differential fresher/experienced flows, and one-click PDF printing.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {['ATS Classic', 'Software Engineer', 'Modern Two-Column', 'Executive', 'Data Analyst'].map((template) => (
                    <span
                      key={template}
                      className="px-3 py-1 rounded-lg text-xs font-medium bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-primary)]"
                    >
                      {template}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-[var(--glass-border)] mt-6 flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)] font-medium">
                  Auto-formatting · Version snapshots · Zero blur leaks
                </span>
                <Link
                  href="/builder"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] group-hover:text-[var(--highlight-blue)] transition-colors"
                >
                  <span>Open Builder</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* 2. Resume Analyzer */}
            <div className="bento-card p-6 sm:p-8 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-400 flex items-center justify-center shadow-xs">
                  <FileSearch className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">
                    Deep Diagnostic
                  </span>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                    Resume Analyzer
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Rigorous parsing across format compliance, quantified impact, structural completeness, and skill relevance. Provides actionable suggestions to eliminate parser drop-offs.
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-[var(--glass-border)] mt-6 flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">PDF & DOCX support</span>
                <Link
                  href="/analyzer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] group-hover:text-[var(--highlight-blue)] transition-colors"
                >
                  <span>Analyze Resume</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* 3. ATS Score Calculator */}
            <div className="bento-card p-6 sm:p-8 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shadow-xs">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                    Instant Compatibility
                  </span>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                    Dedicated ATS Score
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Test your resume against modern ATS algorithms. Understand exactly how enterprise screening systems read your experience, education, and dates.
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-[var(--glass-border)] mt-6 flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Zero sign-up required</span>
                <Link
                  href="/ats-score"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] group-hover:text-[var(--highlight-blue)] transition-colors"
                >
                  <span>Check ATS Score</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* 4. AI Phrasing Improver */}
            <div className="bento-card p-6 sm:p-8 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center shadow-xs">
                  <Wand2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Precision Writing
                  </span>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                    AI Resume Improver
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Elevates bullet points with active verbs, impact framing, and quantified metrics without introducing fake technologies or unsupported claims.
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-[var(--glass-border)] mt-6 flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Preserves facts strictly</span>
                <Link
                  href="/improver"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] group-hover:text-[var(--highlight-blue)] transition-colors"
                >
                  <span>Open Improver</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* 5. Job Search & Application Tracker */}
            <div className="bento-card p-6 sm:p-8 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 flex items-center justify-center shadow-xs">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                    Unified Pipeline
                  </span>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                    Job Search & Tracker
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Aggregates real openings across LinkedIn, Adzuna, and Jooble with intelligent duplicate merging and a full recruitment status tracker.
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-[var(--glass-border)] mt-6 flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Real normalized listings</span>
                <Link
                  href="/jobs"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] group-hover:text-[var(--highlight-blue)] transition-colors"
                >
                  <span>Search Jobs</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* 6. Skill Assessments */}
            <div className="bento-card p-6 sm:p-8 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center shadow-xs">
                  <BadgeCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
                    Credibility
                  </span>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                    Skill Assessments
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                    Take technical examinations across JavaScript, React, Python, SQL, and DevOps. Earn verified badges to substantiate your resume claims.
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-[var(--glass-border)] mt-6 flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Earn verified credentials</span>
                <Link
                  href="/skills"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent)] group-hover:text-[var(--highlight-blue)] transition-colors"
                >
                  <span>Explore Skills</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FOOTER                                                                 */}
      {/* ========================================================================= */}
      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 py-12 px-4 sm:px-6 lg:px-8 text-xs text-[var(--text-secondary)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-serif-display font-bold text-sm text-[var(--text-primary)]">
              Smart Resume AI
            </span>
            <span>· Enterprise Career Intelligence</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/builder" className="hover:text-[var(--text-primary)] transition-colors">
              Resume Builder
            </Link>
            <Link href="/analyzer" className="hover:text-[var(--text-primary)] transition-colors">
              Analyzer
            </Link>
            <Link href="/ats-score" className="hover:text-[var(--text-primary)] transition-colors">
              ATS Score
            </Link>
            <Link href="/jobs" className="hover:text-[var(--text-primary)] transition-colors">
              Job Search
            </Link>
            <Link href="/faq" className="hover:text-[var(--text-primary)] transition-colors">
              FAQ
            </Link>
            <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
