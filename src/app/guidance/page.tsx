'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  ArrowRight,
  BadgeCheck,
  FileText,
  LayoutDashboard,
  Sparkles,
  Layers,
  Milestone,
  CheckCircle2,
} from 'lucide-react';

export default function CareerGuidancePage() {
  const upcomingFeatures = [
    {
      icon: Milestone,
      title: 'Company & Role Roadmaps',
      description:
        'Structured competency roadmaps and interview stages tailored to leading technology organizations and engineering tracks.',
    },
    {
      icon: Layers,
      title: 'Promotion Tracks & Milestones',
      description:
        'Clear progression pathways outlining expected technical milestones and leadership skills from entry-level to principal engineer.',
    },
    {
      icon: Sparkles,
      title: 'AI Career Trajectory Insights',
      description:
        'Smart recommendations linking verified assessments, resume revisions, and market demand into a structured career plan.',
    },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col justify-center space-y-8 animate-fade-in">
      {/* Hero Coming Soon Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-8 sm:p-12 shadow-[var(--shadow-sm)]">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-64 h-64 rounded-full bg-[var(--accent)]/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto space-y-4">
          {/* Icon and Coming Soon Status Badge */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/20 shadow-xs">
              <Compass className="w-8 h-8" />
            </div>
            <span className="absolute -top-1.5 -right-3 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30 shadow-xs">
              Coming Soon
            </span>
          </div>

          {/* Exact Label Heading */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Career Guidance
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              We are building a structured career intelligence module to help you map role transitions, understand technical interview criteria, and plan long-term career growth.
            </p>
          </div>

          {/* Development Status Indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] text-xs text-[var(--text-muted)]">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Currently under active development</span>
          </div>
        </div>
      </div>

      {/* Planned Capabilities Preview (Honest Feature Roadmap, No Fake Metrics) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
            What to Expect in Career Guidance
          </h2>
          <span className="text-[11px] font-medium text-[var(--text-muted)]">Module Roadmap</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingFeatures.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-5 flex flex-col justify-between shadow-xs hover:border-[var(--glass-border-hover)] transition-all duration-200"
              >
                <div className="space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] text-[var(--accent)] flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--glass-border)] flex items-center gap-1.5 text-[11px] font-semibold text-amber-500/90 dark:text-amber-400/90">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Planned Release</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Verified Application Workflows (Active, Working Alternatives) */}
      <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-6 sm:p-7 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Explore Available Platform Features
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              While Career Guidance is being finalized, you can leverage our fully working resume and assessment tools.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <Link
            href="/dashboard"
            className="group flex items-center justify-between p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] hover:border-[var(--accent)]/40 hover:bg-[var(--glass-bg)] transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  My Dashboard
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">Track applications & stats</p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/analyzer"
            className="group flex items-center justify-between p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] hover:border-[var(--accent)]/40 hover:bg-[var(--glass-bg)] transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  Resume Analyzer
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">ATS score & keyword audit</p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
          </Link>

          <Link
            href="/skills"
            className="group flex items-center justify-between p-3.5 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] hover:border-[var(--accent)]/40 hover:bg-[var(--glass-bg)] transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0">
                <BadgeCheck className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  Skill Assessments
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">Verified credentials</p>
              </div>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
}
