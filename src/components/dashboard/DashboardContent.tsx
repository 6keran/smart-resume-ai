'use client';

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Briefcase,
  Send,
  BadgeCheck,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
  Target,
  Award,
  Calendar,
  AlertCircle,
  FileEdit,
  ChevronRight,
  FolderGit2,
  Bot,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PageTransition } from '@/components/ui/MotionPrimitives';
import type {
  UnifiedStudentContext,
  CareerActionPlan,
  CareerTimelineItem,
  ReadinessSnapshotRecord,
} from '@/types/career';
import CareerReadinessHUD from '@/components/dashboard/CareerReadinessHUD';
import DashboardResumeDeck from '@/components/dashboard/DashboardResumeDeck';
import InteractiveCareerMilestones from '@/components/dashboard/InteractiveCareerMilestones';

export interface DashboardMetrics {
  totalResumes: number;
  totalAnalyses: number;
  avgAtsScore: number;
  improvementsMade: number;
  totalApplications: number;
  jobsApplied: number;
  jobMatches: number;
  verifiedSkills: number;
  assessmentsCompleted: number;
  certificatesEarned: number;
  coursesCompleted: number;
}

export interface ResumeProgressItem {
  id: string;
  filename: string;
  fileType?: string;
  uploadedAt: string | Date;
  previousScore: number | null;
  latestScore: number | null;
  improvement: number | null;
  latestAnalysisId?: string | null;
}

export interface RecentApplicationItem {
  id: string;
  job_title: string;
  company: string;
  location?: string | null;
  status: string;
  applied_at?: string;
  created_at?: string;
  job_url?: string | null;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  resumeProgress: ResumeProgressItem[];
  recentApplications: RecentApplicationItem[];
  recentAssessments: Array<{ id: string; skill: string; score: number; total_questions: number; passed: boolean }>;
  recentImprovements: Array<{ id: string; title: string; category: string; before_text: string; after_text: string }>;
  studentProfile?: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    graduationYear: number;
    graduationMonth?: string | null;
    currentSemester?: string | null;
    cgpa?: string | null;
    targetRole: string;
    targetWorkType: string;
    projects: Array<{ id: string; title: string; description: string; techStack: string[]; repoUrl?: string; liveUrl?: string }>;
    coursework: string[];
  } | null;
  timeline?: CareerTimelineItem[];
}

export interface DashboardContentProps {
  user: {
    id: string;
    name: string;
    email?: string | null;
  };
  data: DashboardData;
  actionPlan?: CareerActionPlan | null;
  unifiedContext?: UnifiedStudentContext | null;
}

export function DashboardContent({ user, data, actionPlan, unifiedContext }: DashboardContentProps) {
  const { metrics, resumeProgress = [], recentApplications = [] } = data;

  const primaryResume = resumeProgress.length > 0 ? resumeProgress[0] : null;

  // Real career readiness score from unified context or baseline ATS score
  const readiness = unifiedContext?.readiness;
  const overallScore = readiness ? readiness.overallScore : (primaryResume?.latestScore ?? Math.round(metrics.avgAtsScore));
  const overallLevel = readiness?.overallLevel || (overallScore >= 75 ? 'Competitive' : overallScore >= 50 ? 'Developing' : 'Novice');

  // Real target role
  const targetRole = (unifiedContext?.careerGoal.targetRole || data.studentProfile?.targetRole || '').trim() || 'Goal not set';

  // Real top 3 critical skill gaps
  const missingCritical = unifiedContext?.skills.missingCritical || [];
  const topSkillGaps = missingCritical.slice(0, 3);

  // Top recommended action
  const primaryAction = actionPlan?.actions && actionPlan.actions.length > 0 ? actionPlan.actions[0] : null;

  // Timeline events for recent activity
  const timelineEvents: CareerTimelineItem[] = data.timeline || [];

  const triggerAiAssistant = (promptText: string) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('sra:open-chat', {
          detail: { prompt: promptText },
        })
      );
    }
  };

  return (
    <PageTransition className="space-y-6 text-left pb-16 bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ─── 1. TOP HEADER & WELCOME MESSAGE ──────────────────────────── */}
        <div className="reference-dashboard-intro bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-xs p-6 sm:p-8 transition-colors">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] font-mono font-bold text-[var(--accent)] bg-[var(--accent-subtle)] px-2.5 py-0.5 rounded-md border border-[var(--accent)]/20 uppercase">
                  Candidate Workspace
                </span>
                <span className="text-[var(--text-muted)] text-xs">•</span>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  Target: <strong className="text-[var(--text-primary)]">{targetRole}</strong>
                </span>
                {data.studentProfile?.graduationYear && (
                  <>
                    <span className="text-[var(--text-muted)] text-xs">•</span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      Class of {data.studentProfile.graduationYear}
                    </span>
                  </>
                )}
              </div>

              <h1 className="heading-page">
                Welcome back, {user.name}
              </h1>

              <p className="text-body-secondary max-w-2xl text-xs sm:text-sm">
                Track your job readiness, resume strength, active skill gaps, and next career milestones.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3 shrink-0 flex-wrap">
              <Link
                href="/builder"
                className="btn-primary-action inline-flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Open Resume Editor</span>
              </Link>
              <button
                type="button"
                onClick={() => triggerAiAssistant(`Review my profile for ${targetRole} and suggest what I should improve next.`)}
                className="btn-secondary-action inline-flex items-center gap-2 py-2 px-4 text-xs font-semibold"
              >
                <Bot className="w-4 h-4 text-[var(--accent)]" />
                <span>Ask AI Assistant</span>
              </button>
            </div>
          </div>
        </div>

        {/* Personalized Onboarding Callout when goal is not set yet */}
        {targetRole === 'Goal not set' && (
          <div className="rounded-xl border border-[var(--border-color)] bg-[#FFFFFF] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                Target Role: Goal Not Set
              </div>
              <p className="text-sm text-[var(--text-primary)] font-medium">
                Set your target role or upload a resume to review and confirm your personalized career roadmap.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 max-w-full shrink-0">
              <Link
                href="/onboarding"
                className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-colors"
              >
                Start Guided Setup
              </Link>
              <Link
                href="/dashboard/my-data"
                className="px-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-xs font-semibold hover:border-[var(--accent)] transition-colors"
              >
                My Career Data
              </Link>
            </div>
          </div>
        )}

        {/* ─── 2. CAREER READINESS HUD MATRIX (ECHO-INSPIRED KINETIC HUD) ── */}
        <CareerReadinessHUD
          readiness={readiness}
          overallScore={overallScore}
          overallLevel={overallLevel}
          targetRole={targetRole}
          metrics={metrics}
          primaryResume={primaryResume}
        />

        {/* ─── 3. TWO-COLUMN MAIN WORKSPACE ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* LEFT COLUMN: MULTI-RESUME DECK & IMPORTANT SKILL GAPS */}
          <div className="space-y-6">

            {/* Multi-Resume Deck */}
            <DashboardResumeDeck
              resumeProgress={resumeProgress}
              avgAtsScore={metrics.avgAtsScore}
            />

            {/* Important Skill Gaps Card */}
            <div className="reference-panel bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-xs p-6 space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Important Skill Gaps</span>
                </h3>
                <Link
                  href="/skills"
                  className="text-xs text-[var(--accent)] font-semibold hover:underline"
                >
                  View All Skills
                </Link>
              </div>

              {topSkillGaps.length > 0 ? (
                <div className="space-y-2.5">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Top requirements recommended for your target role of <strong className="text-[var(--text-primary)]">{targetRole}</strong>:
                  </p>
                  <div className="space-y-2 pt-1">
                    {topSkillGaps.map((skill) => (
                      <div
                        key={skill}
                        className="p-3 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] flex items-center justify-between gap-3"
                      >
                        <span className="font-semibold text-xs sm:text-sm text-[var(--text-primary)]">{skill}</span>
                        <Link
                          href={`/skills/assess/${encodeURIComponent(skill.toLowerCase().replace(/\s+/g, '-'))}`}
                          className="px-2.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent)] text-xs font-semibold hover:border-[var(--accent)] transition-colors shadow-xs"
                        >
                          Assess Skill
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>All core role requirements demonstrated or claimed. Great work!</span>
                </div>
              )}
            </div>

          </div>

          {/* RIGHT COLUMN: RECOMMENDED NEXT ACTION & CAREER MILESTONES */}
          <div className="space-y-6">

            {/* Recommended Next Action Card */}
            <div className="reference-panel bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-xs p-6 space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[var(--accent)]" />
                  <span>Recommended Next Action</span>
                </h3>
                {primaryAction?.priority && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60 uppercase">
                    {primaryAction.priority} Priority
                  </span>
                )}
              </div>

              {primaryAction ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)]">
                      {primaryAction.title}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                      {primaryAction.why || primaryAction.expectedBenefit}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={primaryAction.href || '/builder'}
                      className="btn-primary-action inline-flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-xs"
                    >
                      <span>{primaryAction.concreteNextAction || 'Take Action Now'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Tailor your resume or run an ATS audit to unlock actionable guidance for {targetRole}.
                  </p>
                  <Link
                    href="/analyzer"
                    className="btn-primary-action inline-flex items-center gap-2 py-2 px-4 text-xs font-semibold shadow-xs"
                  >
                    <span>Run ATS Scan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}
            </div>

            {/* Interactive Career Milestones Tracker */}
            <InteractiveCareerMilestones
              timeline={timelineEvents}
              recentApplications={recentApplications}
            />

          </div>

        </div>

      </div>
    </PageTransition>
  );
}
