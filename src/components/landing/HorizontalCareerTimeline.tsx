'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Briefcase,
  BookmarkCheck,
  Send,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Target,
  Bot,
} from 'lucide-react';

interface StageItem {
  id: string;
  step: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  ctaText: string;
  icon: React.ElementType;
  highlights: string[];
  badge: string;
}

const STAGES: StageItem[] = [
  {
    id: 'discovery',
    step: '01',
    title: 'Role Discovery',
    subtitle: 'Verified fresher & tech listings',
    description: 'Explore live curated openings with explainable match breakdowns and tech stack alignment before applying.',
    href: '/jobs',
    ctaText: 'Search Roles',
    icon: Briefcase,
    highlights: ['Skill match indicators', 'Direct verified sources', 'Salary & location filters'],
    badge: 'STAGE 01 // DISCOVERY',
  },
  {
    id: 'pipeline',
    step: '02',
    title: 'Pipeline Organization',
    subtitle: 'Save & prioritize target companies',
    description: 'Bookmark high-probability positions to revisit, compare requirements, and prepare your application package.',
    href: '/dashboard/jobs',
    ctaText: 'View Saved Jobs',
    icon: BookmarkCheck,
    highlights: ['Deadline tracking', 'Requirement comparison', 'Direct apply links'],
    badge: 'STAGE 02 // SHORTLIST',
  },
  {
    id: 'tracking',
    step: '03',
    title: 'Application Tracking',
    subtitle: 'End-to-end recruitment lifecycle',
    description: 'Log every submission with notes, interview dates, and status transitions from Applied to Offer.',
    href: '/dashboard/applications',
    ctaText: 'Open Tracker',
    icon: Send,
    highlights: ['Custom notes & links', 'Status progression', 'Zero data lock-in'],
    badge: 'STAGE 03 // PIPELINE',
  },
  {
    id: 'interview',
    step: '04',
    title: 'Interview Preparation',
    subtitle: 'Simulated technical & behavioral practice',
    description: 'Rehearse role-specific questions with AI-assisted STAR method feedback and rubric-based scoring.',
    href: '/interview-prep',
    ctaText: 'Start Mock Interview',
    icon: Bot,
    highlights: ['STAR technique critique', 'Instant feedback scoring', 'Role-specific questions'],
    badge: 'STAGE 04 // REHEARSAL',
  },
];

export default function HorizontalCareerTimeline() {
  const [activeStage, setActiveStage] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* ── Top HUD Progress & Stage Navigator ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
          <span className="text-xs font-mono font-bold text-[var(--text-primary)]">
            WORKFLOW PROGRESSION
          </span>
          <span className="text-xs font-mono text-[var(--accent)] font-semibold">
            [{STAGES[activeStage].badge}]
          </span>
        </div>

        {/* Stage Pill Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {STAGES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveStage(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeStage === idx
                  ? 'bg-[var(--accent)] text-white shadow-xs'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              Step {s.step}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stage Cards Canvas (Horizontal Track with Connecting Flow) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((stage, idx) => {
          const Icon = stage.icon;
          const isActive = activeStage === idx;

          return (
            <div
              key={stage.id}
              onClick={() => setActiveStage(idx)}
              className={`p-6 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-5 ${
                isActive
                  ? 'bg-[var(--bg-card)] border-[var(--accent)] shadow-md ring-2 ring-[var(--accent)]/15'
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] shadow-xs hover:border-[var(--accent)]/40 hover:shadow-sm'
              }`}
            >
              <div className="space-y-4">
                {/* Card Top: Step Number & Icon */}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-bold text-[var(--text-muted)]">
                    {`// 0${idx + 1}`}
                  </span>
                </div>

                {/* Title & Subtitle */}
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    {stage.title}
                  </h3>
                  <p className="text-xs font-medium text-[var(--accent)] mt-0.5">
                    {stage.subtitle}
                  </p>
                </div>

                {/* Description */}
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {stage.description}
                </p>

                {/* Micro Highlights */}
                <ul className="space-y-1.5 pt-2 border-t border-[var(--border-color)] text-[11px] text-[var(--text-secondary)]">
                  {stage.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Link */}
              <div className="pt-3 border-t border-[var(--border-color)]">
                <Link
                  href={stage.href}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full btn-secondary text-xs py-2 px-3 rounded-lg inline-flex items-center justify-between group hover:border-[var(--accent)]"
                >
                  <span className="font-semibold">{stage.ctaText}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[var(--accent)] group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
