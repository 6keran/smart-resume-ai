'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCounter } from '@/components/ui/MotionPrimitives';
import {
  ShieldCheck,
  Award,
  FolderGit2,
  FileText,
  Bot,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import type { ExplainableReadinessResult } from '@/types/career';
import type { DashboardMetrics, ResumeProgressItem } from './DashboardContent';

interface CareerReadinessHUDProps {
  readiness?: ExplainableReadinessResult | null;
  overallScore: number;
  overallLevel: string;
  targetRole: string;
  metrics: DashboardMetrics;
  primaryResume: ResumeProgressItem | null;
}

export default function CareerReadinessHUD({
  readiness,
  overallScore,
  overallLevel,
  targetRole,
  metrics,
  primaryResume,
}: CareerReadinessHUDProps) {
  const [activeQuadrantKey, setActiveQuadrantKey] = useState<
    'technical' | 'project' | 'resume' | 'interview'
  >('technical');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const technicalScore =
    readiness?.quadrants?.technicalCompetency?.score ??
    Math.min(100, metrics.verifiedSkills * 25);
  const projectScore =
    readiness?.quadrants?.projectEvidence?.score ?? 40;
  const resumeScore =
    primaryResume?.latestScore ?? Math.round(metrics.avgAtsScore);
  const interviewScore =
    readiness?.quadrants?.interviewFluency?.score ?? 35;

  const quadrants = [
    {
      key: 'technical' as const,
      name: 'Technical Competency',
      shortName: 'Technical Skills',
      score: technicalScore,
      icon: Award,
      badge: `${metrics.verifiedSkills} verified certificates`,
      description:
        readiness?.quadrants?.technicalCompetency?.summary ||
        'Standardized technical assessments evaluating core role competencies.',
      strengths: readiness?.quadrants?.technicalCompetency?.strengths || [
        `${metrics.verifiedSkills} verified skills recorded`,
      ],
      recommendations: readiness?.quadrants?.technicalCompetency?.recommendations || [
        'Complete role-specific skill assessments to verify competencies.',
      ],
      ctaText: 'Take Skill Assessments',
      ctaHref: '/skills',
    },
    {
      key: 'project' as const,
      name: 'Project Evidence',
      shortName: 'Project Evidence',
      score: projectScore,
      icon: FolderGit2,
      badge: 'Capstone & Architecture',
      description:
        readiness?.quadrants?.projectEvidence?.summary ||
        'Hands-on technical implementation evidence, Git repositories, and architecture documentation.',
      strengths: readiness?.quadrants?.projectEvidence?.strengths || [
        'Documented projects mapped to target job requirements',
      ],
      recommendations: readiness?.quadrants?.projectEvidence?.recommendations || [
        'Add quantified project impact metrics and architecture milestones.',
      ],
      ctaText: 'Explore Guided Projects',
      ctaHref: '/projects',
    },
    {
      key: 'resume' as const,
      name: 'Resume ATS Alignment',
      shortName: 'Resume ATS',
      score: resumeScore,
      icon: FileText,
      badge: primaryResume ? primaryResume.filename : 'Active Resume',
      description:
        readiness?.quadrants?.resumeAts?.summary ||
        'Deterministic parsing score across keyword semantics, measurable outcomes, and standard A4 sections.',
      strengths: readiness?.quadrants?.resumeAts?.strengths || [
        `Active resume parsed with ${resumeScore}/100 ATS baseline`,
      ],
      recommendations: readiness?.quadrants?.resumeAts?.recommendations || [
        'Audit resume phrasing against target role keywords.',
      ],
      ctaText: 'Run ATS Scan',
      ctaHref: '/analyzer',
    },
    {
      key: 'interview' as const,
      name: 'Interview Fluency',
      shortName: 'Interview Practice',
      score: interviewScore,
      icon: Bot,
      badge: 'STAR Method Practice',
      description:
        readiness?.quadrants?.interviewFluency?.summary ||
        'Rubric-based evaluation of behavioral and technical explanations using the STAR method.',
      strengths: readiness?.quadrants?.interviewFluency?.strengths || [
        'Simulated mock interview rehearsal modules available',
      ],
      recommendations: readiness?.quadrants?.interviewFluency?.recommendations || [
        'Practice STAR answers for common architectural and behavioral scenarios.',
      ],
      ctaText: 'Practice Mock Interview',
      ctaHref: '/interview-prep',
    },
  ];

  const activeQuadrant =
    quadrants.find((q) => q.key === activeQuadrantKey) || quadrants[0];

  return (
    <div className="reference-dashboard-stage rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs overflow-hidden transition-colors">
      {/* ── Top HUD Status Strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/40">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
            <span className="font-bold text-[var(--text-primary)]">CAREER READINESS ENGINE</span>
            <span>{'//'}</span>
            <span className="text-[var(--accent)] font-semibold truncate max-w-[200px] sm:max-w-none">
              TARGET: {targetRole}
            </span>
          </div>
          <div className="flex flex-wrap items-baseline gap-3 pt-0.5">
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Overall Preparedness: <AnimatedCounter value={overallScore} />/100
            </h2>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                overallScore >= 75
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60'
                  : overallScore >= 50
                  ? 'bg-blue-50 text-[var(--accent)] border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60'
              }`}
            >
              {overallLevel}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-mono text-[var(--text-secondary)]">
          <span className="text-[var(--text-muted)]">ACTIVE QUADRANT:</span>
          <span className="font-bold text-[var(--accent)] uppercase">
            {activeQuadrant.shortName}
          </span>
        </div>
      </div>

      {/* ── 4 Quadrant Interactive Cards Grid ── */}
      <div className="p-5 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {quadrants.map((q) => {
            const Icon = q.icon;
            const isActive = activeQuadrantKey === q.key;

            return (
              <button
                key={q.key}
                type="button"
                onClick={() => setActiveQuadrantKey(q.key)}
                className={`p-4 rounded-xl border text-left transition-colors duration-150 cursor-pointer space-y-3 relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] z-0 ${
                  isActive
                    ? 'border-[var(--accent)] shadow-sm'
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)]/40 hover:bg-[var(--bg-secondary)]/60'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="hud-quadrant-indicator"
                    className="absolute inset-0 rounded-xl bg-[var(--bg-elevated)] ring-2 ring-[var(--accent)]/20 -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="flex items-center justify-between">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] group-hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-base font-extrabold text-[var(--text-primary)] font-mono">
                    <AnimatedCounter value={q.score} suffix="%" />
                  </span>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {q.shortName}
                  </h3>
                  <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                    {q.badge}
                  </p>
                </div>

                {/* Micro Progress Bar */}
                <div className="w-full bg-[var(--border-color)]/60 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      prefersReducedMotion ? '' : 'ease-out'
                    } ${
                      q.score >= 70
                        ? 'bg-emerald-600'
                        : q.score >= 45
                        ? 'bg-[var(--accent)]'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.max(6, q.score)}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Active Quadrant Inspection & Action Drawer ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeQuadrantKey}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {activeQuadrant.name}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-semibold border border-[var(--accent)]/20">
                  Weight: 25%
                </span>
              </div>

              <Link
                href={activeQuadrant.ctaHref}
                className="btn-primary text-xs py-1.5 px-3.5 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-auto shadow-xs"
              >
                <span>{activeQuadrant.ctaText}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {activeQuadrant.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Strengths */}
              <div className="p-3.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Demonstrated Capability</span>
                </span>
                <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  {activeQuadrant.strengths.slice(0, 2).map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[var(--accent)] font-bold">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Next Recommended Milestones */}
              <div className="p-3.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Recommended Next Step</span>
                </span>
                <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  {activeQuadrant.recommendations.slice(0, 2).map((r, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-[var(--accent)] font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
