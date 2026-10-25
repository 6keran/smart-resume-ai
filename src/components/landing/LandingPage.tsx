'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileSearch,
  FileEdit,
  Wand2,
  BadgeCheck,
  Target,
  ArrowRight,
  CheckCircle2,
  FileText,
  Briefcase,
  ShieldCheck,
  Layers,
  Printer,
  Compass,
} from 'lucide-react';
import {
  ScrollReveal,
  StaggerGroup,
  StaggerChild,
} from '@/components/ui/MotionPrimitives';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600 selection:text-white">
      {/* ── 1. HERO SECTION ── */}
      <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Direct Heading, Value Proposition, Action CTAs */}
          <div className="lg:col-span-7 flex flex-col text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-xs font-semibold text-blue-700 dark:text-blue-300 w-fit">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>ATS Compliance &amp; Career Tools</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
                Build, Analyze, and Optimize Your Resume for Real ATS Systems
              </h1>
              <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal leading-relaxed max-w-2xl">
                Smart Resume AI provides automated applicant tracking system scoring, keyword gap analysis, fact-preserving bullet refinement, and print-ready A4 PDF generation.
              </p>
            </div>

            {/* Core Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/analyzer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <FileSearch className="w-4 h-4" />
                <span>Analyze Resume Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/builder"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-sm font-semibold transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                <FileEdit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Build A4 Resume</span>
              </Link>
            </div>

            {/* Key Standards Badges */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Standard A4 PDF Export</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Keyword Gap Audit</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>Fact-Preserving Phrasing</span>
              </div>
            </div>
          </div>

          {/* Right Column: Clean Structural Document Schematic (No Fake People, No Fake Scores) */}
          <div className="lg:col-span-5 relative">
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md p-6 text-left">
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    A4 Structural Specification
                  </span>
                </div>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                  210 × 297 mm
                </span>
              </div>

              {/* Schematic Sections */}
              <div className="space-y-3.5 text-xs">
                {/* Header Block */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Contact &amp; Header Structure</span>
                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Single Column</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Full name, target title, email, phone, location, and verified links parsed cleanly by ATS scanners.
                  </p>
                </div>

                {/* Professional Summary */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Professional Summary</span>
                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">Keywords Aligned</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Target competencies and experience overview matched against job description requirements.
                  </p>
                </div>

                {/* Experience & Achievements */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Work Experience Bullets</span>
                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Action Verbs</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Factual achievements structured with action verbs and specific tools, preserving original data truth.
                  </p>
                </div>

                {/* Technical Skills & Education */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">Skills &amp; Education Taxonomy</span>
                    <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">Standard Headers</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                    Categorized competencies, certifications, and educational credentials with standard machine-readable labels.
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">12 Verified Templates</span>
                <Link
                  href="/builder"
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Explore Templates</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. CORE FEATURES SECTION (Only Genuinely Operational Features) ── */}
      <section id="features" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800">
        <ScrollReveal className="text-center mb-12">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mb-1.5 block">
            Functional Architecture
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Comprehensive Resume &amp; Career Capabilities
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mt-2 leading-relaxed">
            Every feature is built directly into the application and ready for commercial use without mocked data or artificial claims.
          </p>
        </ScrollReveal>

        <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. Resume Builder */}
          <StaggerChild>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between h-full shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileEdit className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  A4 Resume Builder
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Design professional resumes with exact 210 × 297mm A4 dimensions across 12 templates. Includes live zoom controls, single and two-column layouts, and zero clipping in print and PDF downloads.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/builder"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Builder</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">12 Templates</span>
              </div>
            </div>
          </StaggerChild>

          {/* 2. Resume Analyzer */}
          <StaggerChild>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between h-full shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <FileSearch className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Resume Analyzer &amp; ATS Audit
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Audit your existing resume against established recruitment guidelines. Checks structural parseability, section completeness, contact discoverability, and keyword density from uploaded PDF, DOCX, or text files.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/analyzer"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Run Analysis</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Multi-Format</span>
              </div>
            </div>
          </StaggerChild>

          {/* 3. Resume Improver */}
          <StaggerChild>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between h-full shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Wand2 className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Fact-Preserving Bullet Improver
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Refine resume experience bullets using strong action verbs, professional grammar, and technical clarity while strictly preserving original metrics, dates, tools, and factual context without hallucination.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/improver"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Open Improver</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">100% Factual</span>
              </div>
            </div>
          </StaggerChild>

          {/* 4. Job Match & Tailoring */}
          <StaggerChild>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between h-full shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Job Match &amp; Keyword Alignment
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Compare your resume against any target job description. Identify missing technical keywords, skill gaps, and qualification requirements to tailor your resume accurately for specific postings.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/job-match"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Check Alignment</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Gap Analysis</span>
              </div>
            </div>
          </StaggerChild>

          {/* 5. Technical Skill Assessments */}
          <StaggerChild>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between h-full shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Skill Assessment Quizzes
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Take timed technical multiple-choice assessments across 11 programming languages and frameworks. Pass verified benchmarks to document validated proficiencies on your profile.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/skills"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>View Quizzes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">11 Domains</span>
              </div>
            </div>
          </StaggerChild>

          {/* 6. Job Search Integration */}
          <StaggerChild>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between h-full shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all text-left">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Job Search &amp; Application Tracking
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Search active software and engineering job openings, review compensation and role requirements, and log application statuses directly to your candidate dashboard.
                </p>
              </div>
              <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Link
                  href="/jobs"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Search Jobs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">Live Search</span>
              </div>
            </div>
          </StaggerChild>
        </StaggerGroup>
      </section>

      {/* ── 3. WORKFLOW TIMELINE SECTION ── */}
      <section id="workflow" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-800">
        <ScrollReveal className="text-center mb-12">
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mb-1.5 block">
            Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            How Smart Resume AI Works
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
            Three disciplined steps from raw career history to an ATS-ready executive resume.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {/* Step 1 */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
                01
              </span>
              <FileSearch className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Import or Build Resume
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Upload an existing resume in PDF or DOCX format, or input your work history directly into the structured 6-step builder.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
                02
              </span>
              <Wand2 className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Audit ATS &amp; Refine Phrasing
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Identify missing keywords, verify section parseability, and refine bullet phrasing using active action verbs and technical terminology.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900">
                03
              </span>
              <Printer className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Export Compliant A4 PDF
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Generate standard 210 × 297mm documents formatted to render cleanly across modern applicant tracking systems and print dialogs.
            </p>
          </div>
        </div>
      </section>

      {/* ── 4. PRODUCTION CTA BANNER ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center border-t border-slate-200 dark:border-slate-800">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 shadow-sm space-y-5">
          <div className="space-y-2 max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Ready to Optimize Your Resume?
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Scan your existing resume for ATS compliance or create an A4-standard document from scratch.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/analyzer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-xs hover:shadow-md transition-all active:scale-[0.99]"
            >
              <FileSearch className="w-4 h-4" />
              <span>Analyze Resume Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/builder"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-sm font-semibold transition-all active:scale-[0.99]"
            >
              <FileEdit className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Create A4 Resume</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── 5. MINIMAL PRODUCTION FOOTER ── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 text-xs text-slate-600 dark:text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              SR
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white tracking-tight">
              Smart Resume AI
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span> Smart Resume AI. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs">
            <Link href="/ats-score" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              ATS Score
            </Link>
            <Link href="/analyzer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Analyzer
            </Link>
            <Link href="/builder" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Builder
            </Link>
            <Link href="/improver" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Improver
            </Link>
            <Link href="/skills" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Skill Quizzes
            </Link>
            <Link href="/jobs" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Job Search
            </Link>
            <Link href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Terms &amp; Conditions
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
