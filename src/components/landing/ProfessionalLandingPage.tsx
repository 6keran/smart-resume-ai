'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronRight,
  Cpu,
  FileCheck2,
  FileEdit,
  FileSearch,
  FileText,
  Layers,
  Menu,
  RotateCw,
  Search,
  ShieldCheck,
  Target,
  Wand2,
  X,
  Zap,
} from 'lucide-react';
import {
  ScrollReveal,
  StaggerGroup,
  StaggerChild,
  AnimatedTabPanel,
} from '@/components/ui/MotionPrimitives';

export default function ProfessionalLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSpecimenTab, setActiveSpecimenTab] = useState<'preview' | 'ats' | 'diff'>('preview');

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] relative selection:bg-[var(--accent)] selection:text-white">
      {/* ── 1. Navigation ── */}
      <header
        className={`sticky top-0 z-50 w-full transition-all duration-200 ${
          isScrolled
            ? 'bg-[var(--bg-primary)]/95 border-b border-[var(--border-color)] shadow-[var(--shadow-xs)] py-3'
            : 'bg-transparent border-b border-transparent py-4 sm:py-5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Brand Wordmark */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-1.5 leading-none">
              <span className="font-bold text-sm sm:text-base tracking-tight text-[var(--text-primary)]">
                Smart Resume
              </span>
              <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[var(--accent)] px-1.5 py-0.5 rounded bg-[var(--accent-subtle)] border border-[var(--accent)]/20">
                AI
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-[var(--text-secondary)]">
            <a href="#artifacts" className="hover:text-[var(--text-primary)] transition-colors">Workspace</a>
            <a href="#ats-engine" className="hover:text-[var(--text-primary)] transition-colors">ATS Intelligence</a>
            <a href="#preservation" className="hover:text-[var(--text-primary)] transition-colors">Resume Improver</a>
            <a href="#pipeline" className="hover:text-[var(--text-primary)] transition-colors">Job Pipeline</a>
            <Link href="/faq" className="hover:text-[var(--text-primary)] transition-colors">FAQ</Link>
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2.5">
            <Link
              href="/login"
              className="btn-secondary text-xs py-1.5 px-4 rounded-lg"
            >
              Sign In
            </Link>
            <Link
              href="/builder"
              className="btn-primary text-xs py-1.5 px-4 rounded-lg shadow-xs"
            >
              <span>Build Resume</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:!hidden btn-icon btn-icon-sm rounded-lg"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-navigation"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile Navigation Drawer */}
        {menuOpen && (
          <div id="landing-mobile-navigation" className="lg:hidden border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-5 py-4 space-y-3 animate-fade-in motion-reduce:animate-none text-xs font-medium">
            <a href="#artifacts" onClick={() => setMenuOpen(false)} className="block py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Workspace</a>
            <a href="#ats-engine" onClick={() => setMenuOpen(false)} className="block py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">ATS Intelligence</a>
            <a href="#preservation" onClick={() => setMenuOpen(false)} className="block py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Resume Improver</a>
            <a href="#pipeline" onClick={() => setMenuOpen(false)} className="block py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Job Pipeline</a>
            <Link href="/faq" onClick={() => setMenuOpen(false)} className="block py-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]">FAQ</Link>
            <div className="pt-3 border-t border-[var(--border-color)] flex items-center gap-2">
              <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 btn-secondary text-xs rounded-lg">Sign In</Link>
              <Link href="/builder" onClick={() => setMenuOpen(false)} className="flex-1 text-center py-2 btn-primary text-xs rounded-lg">Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* ── 2. Hero Section: Direct & Professional ── */}
      <section className="relative z-10 pt-14 sm:pt-20 lg:pt-24 pb-12 sm:pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <StaggerGroup hero className="flex flex-col items-center">
          {/* Section Kicker */}
          <StaggerChild>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md border border-[var(--border-color)] bg-[var(--bg-card)] text-[11px] font-mono font-semibold text-[var(--accent)] tracking-wider uppercase mb-6 sm:mb-8 shadow-xs">
              <span>CAREER WORKSPACE PLATFORM</span>
            </div>
          </StaggerChild>

          {/* Master Headline */}
          <StaggerChild>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-[-0.035em] text-[var(--text-primary)] leading-[1.08] max-w-4xl mx-auto">
              The intelligent workspace for your entire career.
            </h1>
          </StaggerChild>

          {/* Supporting Copy */}
          <StaggerChild>
            <p className="mt-6 text-base sm:text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto font-normal leading-relaxed">
              Build and review your resume, explore roles, and organize your next career steps in one place.
            </p>
          </StaggerChild>

          {/* Dual Actions */}
          <StaggerChild>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 sm:mt-10">
              <Link
                href="/builder"
                className="btn-primary w-full sm:w-auto text-sm py-2.5 px-6 shadow-xs"
              >
                <span>Create Your Resume</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/ats-score"
                className="btn-secondary w-full sm:w-auto text-sm py-2.5 px-6"
              >
                <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
                <span>Check ATS Score</span>
              </Link>
            </div>
          </StaggerChild>
        </StaggerGroup>

        {/* ── 3. Artifact Viewport: Interactive Live Product Specimen ── */}
        <ScrollReveal delay={0.1} className="mt-14 sm:mt-16 max-w-6xl mx-auto text-left">
          <div id="artifacts" className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-md overflow-hidden relative">
            {/* Viewport Top Window Controls */}
            <div className="h-12 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 sm:px-6 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-700 inline-block" />
                <span className="ml-3 font-mono text-[11px] text-[var(--text-muted)] truncate max-w-[200px] sm:max-w-none">
                  Smart Resume AI · workspace preview
                </span>
              </div>

              {/* Viewport Mode Switcher */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)]">
                <button
                  type="button"
                  onClick={() => setActiveSpecimenTab('preview')}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    activeSpecimenTab === 'preview'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  A4 Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSpecimenTab('ats')}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    activeSpecimenTab === 'ats'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  ATS Audit
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSpecimenTab('diff')}
                  className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                    activeSpecimenTab === 'diff'
                      ? 'bg-[var(--accent)] text-white shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  Phrasing Diff
                </button>
              </div>
            </div>

            {/* Specimen Content Render with Crossfade Animation */}
            <div className="p-5 sm:p-8">
              <AnimatedTabPanel tabKey={activeSpecimenTab}>
              {activeSpecimenTab === 'preview' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Left: Standard A4 Resume Preview Box */}
                  <div className="lg:col-span-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-6 sm:p-8 font-sans space-y-5 shadow-inner">
                    <div className="border-b border-[var(--border-color)] pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
                          Resume preview
                        </h2>
                        <p className="text-xs font-semibold text-[var(--accent)] mt-0.5">
                          Your name and target role
                        </p>
                      </div>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        Contact details you provide
                      </span>
                    </div>

                    {/* Summary */}
                    <div className="space-y-1.5">
                      <p className="font-mono text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
                        Executive Summary
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        A concise summary based on the experience, skills, and goals you add to your profile.
                      </p>
                    </div>

                    {/* Experience Entry */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-primary)]">Experience or project entry</span>
                        <span className="font-mono text-[11px] text-[var(--text-muted)]">Dates you provide</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] list-disc pl-4">
                        <li>Describe your responsibilities and work using details you can verify.</li>
                        <li>Keep outcomes and metrics grounded in your own experience.</li>
                        <li>Review every suggested edit before adding it to your resume.</li>
                      </ul>
                    </div>

                    {/* Skills Grid */}
                    <div className="pt-2 border-t border-[var(--border-color)] flex flex-wrap gap-1.5">
                      {['Skills', 'Tools', 'Coursework', 'Projects'].map((s) => (
                        <span key={s} className="px-2 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-medium text-[var(--text-secondary)]">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Right: Live Diagnostics Rail */}
                  <div className="lg:col-span-4 space-y-4">
                    <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
                        <span className="text-xs font-bold text-[var(--text-primary)]">Resume analysis</span>
                        <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Based on your resume
                        </span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <p className="text-[var(--text-secondary)]">Skills and keywords · Review findings</p>
                        <p className="text-[var(--text-secondary)]">Experience details · Review suggestions</p>
                        <p className="text-[var(--text-secondary)]">Formatting · Check your export</p>
                      </div>

                      <div className="pt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed border-t border-[var(--border-color)]">
                        Preview your PDF and check its page breaks before submitting.
                      </div>
                    </div>

                    <Link
                      href="/builder"
                      className="w-full py-2.5 btn-ink-pill flex items-center justify-center text-xs"
                    >
                      <span>Open in Interactive Builder</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}

              {activeSpecimenTab === 'ats' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Parser Match</span>
                      <p className="text-base font-bold text-[var(--text-primary)]">Resume structure</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">Review the sections detected in your document.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Keyword Coverage</span>
                      <p className="text-base font-bold text-[var(--text-primary)]">Skills and keywords</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">Compare your resume with a job description.</p>
                    </div>
                    <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">Format Reliability</span>
                      <p className="text-base font-bold text-[var(--text-primary)]">Document formatting</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">Preview the exported document before use.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] flex items-center justify-between gap-4 text-xs">
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">Ready to audit your current document?</p>
                      <p className="text-[11px] text-[var(--text-secondary)]">Upload a supported resume file to review its structure and keywords.</p>
                    </div>
                    <Link href="/ats-score" className="btn-ink-pill py-2 px-4 shrink-0 text-xs">
                      Analyze Resume Now
                    </Link>
                  </div>
                </div>
              )}

              {activeSpecimenTab === 'diff' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span><strong>Review before using:</strong> Check suggested edits against your original resume to confirm your dates, metrics, and technologies remain accurate.</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-rose-400 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Original Draft (Vague)
                      </span>
                      <p className="text-xs text-[var(--text-secondary)] font-mono leading-relaxed bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--border-color)]">
                        &quot;I helped maintain the postgres database server and fixed some bugs when users reported queries were slow.&quot;
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        Missing impact metrics, weak passive verbs, informal terminology.
                      </p>
                    </div>

                    <div className="p-5 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent-subtle)] space-y-2">
                      <span className="text-[10px] font-mono uppercase font-bold text-[var(--accent)] flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                        Engineered Rewrite (High-Impact)
                      </span>
                      <p className="text-xs text-[var(--text-primary)] font-mono leading-relaxed bg-[var(--bg-primary)] p-3 rounded-lg border border-[var(--accent)]/30">
                        &quot;Maintained the PostgreSQL database and resolved slow queries reported by users.&quot;
                      </p>
                      <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Rephrased with the same facts and no added performance claims.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              </AnimatedTabPanel>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* ── 4. Architectural Sections: Varied Layouts, Not Repetitive Cards ── */}

      {/* SECTION A: A4 Document Engine */}
      <section className="py-20 border-t border-[var(--border-color)] px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">
                01 // DOCUMENT ARCHITECTURE
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
                A4 resume layouts you can review and refine.
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Choose a resume layout, review it at A4 size, and export a PDF. Check the generated file before sending it to an employer.
              </p>
              <div className="pt-2 space-y-2.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>A4 page size for the exported document</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Preview page breaks before you download</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Candidate mode toggle: Experienced vs. Fresher / Graduate</span>
                </div>
              </div>
              <div className="pt-3">
                <Link href="/builder" className="btn-primary text-xs py-2 px-5 shadow-xs">
                  <span>Explore Templates in Builder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 sm:p-8 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] text-xs font-mono text-[var(--text-muted)]">
                <span>TEMPLATE REGISTRY</span>
                <span>RESUME LAYOUTS</span>
              </div>
              <StaggerGroup className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { name: 'ATS Classic', desc: 'Single-column text focus' },
                  { name: 'Software Engineer', desc: 'Technical skills & stack' },
                  { name: 'Graduate / Fresher', desc: 'Projects & education priority' },
                  { name: 'Executive', desc: 'Leadership & impact highlights' },
                  { name: 'Data Analyst', desc: 'Metrics & statistical tools' },
                  { name: 'Full Stack', desc: 'End-to-end architecture' },
                ].map((t) => (
                  <StaggerChild key={t.name}>
                    <div className="p-3.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1 shadow-xs hover:border-[var(--accent)]/40 transition-colors cursor-pointer">
                      <span className="text-xs font-bold text-[var(--text-primary)] block truncate">{t.name}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] block truncate">{t.desc}</span>
                    </div>
                  </StaggerChild>
                ))}
              </StaggerGroup>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* SECTION B: ATS Intelligence & Parser Diagnostics */}
      <section id="ats-engine" className="py-20 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="max-w-7xl mx-auto space-y-10">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">
              02 // AUDIT ENGINE
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Algorithm-driven ATS evaluation.
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              Review document structure and compare skills and keywords with a job description. An automated score is an aid to review, not a hiring decision.
            </p>
          </div>

          {/* Horizontal Diagnostic Strip */}
          <StaggerGroup className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StaggerChild>
              <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5 shadow-xs hover:border-[var(--accent)]/40 transition-colors">
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)]">Dimension 01</span>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Section Semantics</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Checks for common resume sections such as experience, education, and skills.
                </p>
              </div>
            </StaggerChild>
            <StaggerChild>
              <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5 shadow-xs hover:border-[var(--accent)]/40 transition-colors">
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)]">Dimension 02</span>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Keyword Density</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Cross-references technical and domain requirements extracted from job descriptions.
                </p>
              </div>
            </StaggerChild>
            <StaggerChild>
              <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5 shadow-xs hover:border-[var(--accent)]/40 transition-colors">
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)]">Dimension 03</span>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Quantifiable Metrics</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Review experience wording and confirm details against your source document.
                </p>
              </div>
            </StaggerChild>
            <StaggerChild>
              <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5 shadow-xs hover:border-[var(--accent)]/40 transition-colors">
                <span className="text-[10px] font-mono uppercase font-bold text-[var(--text-muted)]">Dimension 04</span>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">Action Verb Index</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Identifies passive voice (&quot;helped with&quot;) and suggests executive action verbs.
                </p>
              </div>
            </StaggerChild>
          </StaggerGroup>
        </ScrollReveal>
      </section>

      {/* SECTION C: Resume Improver & Fact Preservation */}
      <section id="preservation" className="py-20 border-t border-[var(--border-color)] px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <ScrollReveal>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">
                03 // PRECISION REWRITING
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Improve phrasing while keeping your details in view.
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Review suggested wording against your original details before you use it. Keep dates, tools, and outcomes accurate to your experience.
              </p>
              <div className="pt-2 flex flex-col gap-2 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Review each suggestion before adding it to your resume</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Preserves original dates, tenures, and verified company roles</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Edit suggestions to match your own experience</span>
                </div>
              </div>
              <div className="pt-3">
                <Link href="/improver" className="btn-primary text-xs py-2 px-5 shadow-xs">
                  <span>Launch Resume Improver</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-6 sm:p-7 space-y-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)] text-xs">
                <span className="font-bold text-[var(--text-primary)]">Direct Bullet Polisher</span>
                <span className="text-[10px] font-mono text-[var(--accent)]">ILLUSTRATIVE EXAMPLE</span>
              </div>
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] space-y-1 shadow-xs hover:border-[var(--border-hover)] transition-all">
                  <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase">Input Draft</span>
                  <p className="text-xs text-[var(--text-secondary)] font-mono">
                    &quot;Handled python code for user logins and fixed database problems.&quot;
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-[var(--accent)]/30 bg-[var(--accent-subtle)] space-y-1 shadow-xs hover:border-[var(--accent)]/50 transition-all">
                  <span className="text-[10px] font-mono text-[var(--accent)] uppercase font-bold">Refined Phrasing</span>
                  <p className="text-xs text-[var(--text-primary)] font-mono">
                    &quot;Maintained Python login code and resolved database issues.&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* SECTION D: Job Pipeline & Alignment Studio */}
      <section id="pipeline" className="py-20 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/50 px-4 sm:px-6 lg:px-8">
        <ScrollReveal className="max-w-7xl mx-auto space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">
                04 // DISCOVERY & TRACKING
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
                Unified application tracking & role matcher.
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Search openings across aggregated providers, evaluate qualification matches, and transition applications through each interview stage.
              </p>
            </div>
            <Link href="/jobs" className="btn-primary text-xs py-2 px-5 self-start md:self-auto shrink-0 shadow-xs">
              <span>Open Job Finder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { stage: 'Find roles', desc: 'Search opportunities and review their source details.', href: '/jobs' },
              { stage: 'Save opportunities', desc: 'Keep roles you want to revisit in saved jobs.', href: '/dashboard/jobs' },
              { stage: 'Track applications', desc: 'Record application status and follow-up details.', href: '/dashboard/applications' },
              { stage: 'Prepare materials', desc: 'Draft job-specific application materials for review.', href: '/apply-assistant' },
            ].map((p) => (
              <StaggerChild key={p.stage}>
                <Link href={p.href} className="block p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2.5 shadow-xs hover:border-[var(--accent)]/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]">
                  <h3 className="text-base font-bold text-[var(--text-primary)]">{p.stage}</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{p.desc}</p>
                </Link>
              </StaggerChild>
            ))}
          </StaggerGroup>
        </ScrollReveal>
      </section>

      {/* ── 5. Call to Action ── */}
      <section className="py-20 border-t border-[var(--border-color)] px-4 sm:px-6 lg:px-8 text-center max-w-4xl mx-auto">
        <ScrollReveal>
          <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">
            GET STARTED
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[var(--text-primary)] mt-3">
            Build a resume that represents your true capability.
          </h2>
          <p className="mt-4 text-sm sm:text-base text-[var(--text-secondary)] max-w-xl mx-auto leading-relaxed">
            Create an account to explore A4 resume layouts, review your document, and organize your job search.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link href="/builder" className="btn-primary text-sm py-2.5 px-6 shadow-xs">
              <span>Get Started for Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/login" className="btn-secondary text-sm py-2.5 px-6">
              <span>Sign In to Account</span>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ── 6. Minimalist Footer ── */}
      <footer className="border-t border-[var(--border-color)] py-10 px-4 sm:px-6 lg:px-8 text-xs text-[var(--text-muted)]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--text-primary)]">Smart Resume AI</span>
            <span>•</span>
            <span>Career Tools & Resume Verification</span>
          </div>

          <div className="flex items-center gap-6 text-[var(--text-secondary)]">
            <Link href="/faq" className="hover:text-[var(--text-primary)] transition-colors">FAQ</Link>
            <Link href="/guidance" className="hover:text-[var(--text-primary)] transition-colors">Career Guidance</Link>
            <Link href="/feedback" className="hover:text-[var(--text-primary)] transition-colors">Feedback</Link>
            <Link href="/privacy" className="hover:text-[var(--text-primary)] transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--text-primary)] transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
