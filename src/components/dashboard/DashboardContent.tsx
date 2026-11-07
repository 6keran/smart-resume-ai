'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Briefcase,
  Send,
  BadgeCheck,
  ArrowRight,
  ArrowUpRight,
  Plus,
  CheckCircle2,
  Clock,
  Target,
  Award,
  Wand2,
  BarChart3,
  Calendar,
  AlertCircle,
  FileEdit,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Play,
  GraduationCap,
  Activity,
  FolderGit2,
  Milestone,
  History,
  Check,
  ChevronDown,
  ChevronUp,
  Info,
  ExternalLink,
  ShieldCheck,
  MessageSquare,
  Bot,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  PageTransition,
  AnimatedCounter,
} from '@/components/ui/MotionPrimitives';
import type {
  UnifiedStudentContext,
  CareerActionPlan,
  CareerActionItem,
  ReadinessSnapshotRecord,
  CareerTimelineItem,
  CareerAchievementItem,
} from '@/types/career';

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

export interface RecentAssessmentItem {
  id: string;
  skill: string;
  score: number;
  total_questions: number;
  passed: boolean;
}

export interface RecentImprovementItem {
  id: string;
  title: string;
  category: string;
  before_text: string;
  after_text: string;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  resumeProgress: ResumeProgressItem[];
  recentApplications: RecentApplicationItem[];
  recentAssessments: RecentAssessmentItem[];
  recentImprovements: RecentImprovementItem[];
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
  achievements?: CareerAchievementItem[];
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

function formatDate(dateStr?: string | Date | null): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr).slice(0, 10);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'Recently';
  }
}

function formatSnapshotTrigger(trigger: string): string {
  switch (trigger) {
    case 'assessment_completed':
      return 'Skill Assessment';
    case 'resume_analyzed':
      return 'Resume ATS Scan';
    case 'project_milestone_completed':
      return 'Project Milestone';
    case 'project_completed':
      return 'Project Completed';
    case 'interview_completed':
      return 'Mock Interview';
    case 'initial_baseline':
      return 'Baseline Snapshot';
    default:
      return trigger.replace(/_/g, ' ');
  }
}

export function DashboardContent({ user, data, actionPlan, unifiedContext }: DashboardContentProps) {
  const { metrics, resumeProgress = [], recentApplications = [] } = data;
  const [showExplainability, setShowExplainability] = useState(false);
  const [selectedTimelineFilter, setSelectedTimelineFilter] = useState<'all' | 'assessment' | 'project' | 'resume' | 'application'>('all');

  const primaryResume = resumeProgress.length > 0 ? resumeProgress[0] : null;

  // Real career readiness score from unified context or baseline ATS score
  const readiness = unifiedContext?.readiness;
  const overallScore = readiness ? readiness.overallScore : (primaryResume?.latestScore ?? Math.round(metrics.avgAtsScore));
  const overallLevel = readiness?.overallLevel || (overallScore >= 75 ? 'Competitive' : overallScore >= 50 ? 'Developing' : 'Novice');

  // Real target role
  const targetRole = unifiedContext?.careerGoal.targetRole || data.studentProfile?.targetRole || 'Software Professional';

  // Real top 3 critical skill gaps
  const missingCritical = unifiedContext?.skills.missingCritical || [];
  const topSkillGaps = missingCritical.slice(0, 3);

  // Guided projects
  const guidedProjects = unifiedContext?.projects.projects || [];

  // Readiness snapshots & formatted chart data
  const snapshots: ReadinessSnapshotRecord[] = unifiedContext?.readinessHistory || [];
  const chartData = [...snapshots]
    .reverse()
    .map((s, idx) => ({
      index: idx + 1,
      date: formatDate(s.createdAt),
      score: s.overallScore,
      level: s.overallLevel,
      trigger: formatSnapshotTrigger(s.triggerActivity),
      detail: s.activityDetail || formatSnapshotTrigger(s.triggerActivity),
      technical: s.technicalScore,
      project: s.projectScore,
      resume: s.resumeScore,
      interview: s.interviewScore,
    }));

  // Timeline events from genuine DB records
  const timelineEvents: CareerTimelineItem[] = data.timeline || [];
  const filteredTimeline = timelineEvents.filter((ev) => {
    if (selectedTimelineFilter === 'all') return true;
    if (selectedTimelineFilter === 'assessment') return ev.type === 'assessment_completed' || ev.type === 'certificate_earned';
    if (selectedTimelineFilter === 'project') return ev.type === 'project_milestone' || ev.type === 'project_completed';
    if (selectedTimelineFilter === 'resume') return ev.type === 'resume_analyzed';
    if (selectedTimelineFilter === 'application') return ev.type === 'job_applied' || ev.type === 'interview_completed';
    return true;
  });

  // Genuine achievements
  const achievements: CareerAchievementItem[] = data.achievements || [];

  // Helper to trigger contextual AI Assistant query
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
    <PageTransition className="space-y-8 text-left pb-16">
      {/* ─── 1. CAREER COMMAND CENTER HEADER ───────────────────────────── */}
      <section className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 pb-6 border-b border-[var(--border-color)]">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold tracking-widest text-[var(--accent)] uppercase">
              CAREER COMMAND CENTER 3.0
            </span>
            <span className="text-[var(--text-muted)] text-xs">•</span>
            <span className="text-xs text-[var(--text-muted)] font-mono">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <span className="text-[var(--text-muted)] text-xs">•</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
              Role: {targetRole}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
            Welcome back, {user.name}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Personalized student career workspace. Track explainable job readiness, chronological progress timeline, verified achievements, and proactive next actions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => triggerAiAssistant(`Explain my overall career readiness score (${overallScore}/100) and what I should prioritize for ${targetRole}.`)}
            className="btn-secondary text-xs py-2 px-3.5 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Ask AI Assistant about your readiness"
          >
            <Bot className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Ask AI Assistant</span>
          </button>
          <Link
            href="/builder"
            className="btn-primary text-xs py-2 px-4 shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Resume</span>
          </Link>
          <Link
            href="/projects"
            className="btn-secondary text-xs py-2 px-4 shadow-xs transition-all flex items-center gap-1.5"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Project Mentor</span>
          </Link>
        </div>
      </section>

      {/* ─── 2. CRITICAL SKILL GAPS & TARGET ROLE BANNER ────────────────── */}
      <section className="p-4 sm:p-5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--accent)] text-white shadow-xs flex items-center gap-1">
              <Target className="w-3.5 h-3.5" />
              <span>Target Role: {targetRole}</span>
            </span>
            {data.studentProfile ? (
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {data.studentProfile.degree} • {data.studentProfile.institution} (Class of {data.studentProfile.graduationYear})
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            <span className="text-xs font-bold text-[var(--text-primary)]">Top Skill Gaps:</span>
            {topSkillGaps.length > 0 ? (
              topSkillGaps.map((skill) => (
                <Link
                  key={skill}
                  href={`/skills#skills-directory`}
                  className="px-2.5 py-0.5 rounded-lg text-[11px] font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                  title={`Assess or learn ${skill}`}
                >
                  <AlertCircle className="w-3 h-3" />
                  <span>{skill}</span>
                </Link>
              ))
            ) : (
              <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All core role requirements demonstrated or claimed</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start xl:self-auto flex-wrap">
          <Link
            href="/skills?tab=roadmap"
            className="btn-secondary btn-sm flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Learning Roadmap</span>
          </Link>
          <Link
            href="/dashboard/profile"
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors border border-[var(--border-color)]"
            title="Edit Career Goals & Profile"
          >
            <FileEdit className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* ─── 3. 4-DIMENSION EXPLAINABLE CAREER READINESS CENTER ─────────── */}
      <section className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-sm relative">
        <div className="p-6 border-b border-[var(--border-color)] flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[var(--bg-secondary)]/30">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Multidimensional Readiness Index
              </span>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                  overallScore >= 75
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : overallScore >= 50
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                }`}
              >
                {overallLevel}
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] mt-1">
              Career Readiness Score: {overallScore}/100
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Balanced weighted index combining 4 equal dimensions (25% each) evaluated from genuine database activity.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowExplainability(!showExplainability)}
              className="btn-secondary btn-sm text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{showExplainability ? 'Hide Breakdown' : 'Why this score?'}</span>
              {showExplainability ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[var(--text-primary)]">
                <AnimatedCounter value={overallScore} />
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)] font-semibold">/ 100 PTS</span>
            </div>
          </div>
        </div>

        {/* Educational Readiness Disclaimer Banner */}
        <div className="px-6 py-2.5 bg-[var(--accent)]/5 border-b border-[var(--border-color)] flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
          <ShieldCheck className="w-4 h-4 text-[var(--accent)] shrink-0" />
          <span>
            <strong>Educational Readiness Index:</strong> This score benchmarks technical alignment, portfolio evidence, ATS compliance, and interview practice against entry-level requirements. It does not guarantee employment or hiring outcomes.
          </span>
        </div>

        {/* Explainability Drawer */}
        {showExplainability && (
          <div className="p-6 bg-[var(--bg-secondary)]/50 border-b border-[var(--border-color)] space-y-4 text-xs animate-in fade-in duration-200">
            <h3 className="font-bold text-[var(--text-primary)] uppercase tracking-wide text-xs">
              Algorithmic Evaluation Methodology
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
                <p className="font-bold text-[var(--text-primary)]">1. Data Evaluated</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Calculated from your {metrics.verifiedSkills} verified skill certificates, {guidedProjects.length} guided capstones, latest ATS scan ({primaryResume?.latestScore || 0}/100), and {unifiedContext?.interviews.totalSessions || 0} mock technical sessions.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
                <p className="font-bold text-[var(--text-primary)]">2. Weighting Strategy</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Equal 25% allocation prevents artificial inflation: 25% Technical Competency + 25% Project Evidence + 25% Resume ATS Alignment + 25% Interview Fluency.
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
                <p className="font-bold text-[var(--text-primary)]">3. What Is Missing</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {missingCritical.length > 0
                    ? `Missing critical requirements for ${targetRole}: ${missingCritical.join(', ')}.`
                    : 'All core role requirements demonstrated or claimed.'}
                </p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-1.5">
                <p className="font-bold text-[var(--text-primary)]">4. Concrete Next Step</p>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  {actionPlan?.actions?.[0]?.concreteNextAction || 'Complete a proctored assessment or start a guided capstone to advance your readiness baseline.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 4 Quadrants Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border-color)]">
          {/* Quadrant 1: Technical Competency (25%) */}
          {(() => {
            const quad = readiness?.quadrants.technicalCompetency;
            const score = quad ? quad.score : Math.min(100, metrics.verifiedSkills * 25);
            const level = quad ? quad.level : score >= 75 ? 'Job-Ready' : score >= 50 ? 'Proficient' : 'Developing';

            return (
              <div className="p-5 flex flex-col justify-between space-y-3 hover:bg-[var(--bg-secondary)]/30 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Technical (25%)
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {level}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">{score}%</span>
                    <span className="text-[11px] text-[var(--text-muted)]">competency</span>
                  </div>
                  <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden mt-2 border border-[var(--border-color)]">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.max(4, score)}%` }} />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-2 line-clamp-2">
                    {quad?.summary || `${metrics.verifiedSkills} verified skills proven through proctored evaluations.`}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Verified Skills:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{metrics.verifiedSkills}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Link
                      href="/skills#skills-directory"
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <span>Assess Skills</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => triggerAiAssistant(`How can I improve my Technical Competency score (${score}%) for ${targetRole}?`)}
                      className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer flex items-center gap-0.5"
                      title="Ask AI Assistant about technical score"
                    >
                      <Bot className="w-2.5 h-2.5" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quadrant 2: Project Evidence (25%) */}
          {(() => {
            const quad = readiness?.quadrants.projectEvidence;
            const score = quad ? quad.score : (guidedProjects.length > 0 ? 60 : 20);
            const level = quad ? quad.level : score >= 75 ? 'Job-Ready' : score >= 50 ? 'Proficient' : 'Developing';

            return (
              <div className="p-5 flex flex-col justify-between space-y-3 hover:bg-[var(--bg-secondary)]/30 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Projects (25%)
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                      {level}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">{score}%</span>
                    <span className="text-[11px] text-[var(--text-muted)]">evidence</span>
                  </div>
                  <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden mt-2 border border-[var(--border-color)]">
                    <div className="h-full bg-[var(--accent)] rounded-full" style={{ width: `${Math.max(4, score)}%` }} />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-2 line-clamp-2">
                    {quad?.summary || `${guidedProjects.length} guided capstones underway with milestone tracking.`}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Capstones Active:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{guidedProjects.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Link
                      href="/projects"
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <span>Guided Projects</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => triggerAiAssistant(`What capstone project should I build next to demonstrate evidence for ${targetRole}?`)}
                      className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer flex items-center gap-0.5"
                      title="Ask AI Assistant about projects"
                    >
                      <Bot className="w-2.5 h-2.5" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quadrant 3: Resume ATS Alignment (25%) */}
          {(() => {
            const quad = readiness?.quadrants.resumeAts;
            const score = quad ? quad.score : (primaryResume?.latestScore ?? Math.round(metrics.avgAtsScore));
            const level = quad ? quad.level : score >= 75 ? 'Job-Ready' : score >= 50 ? 'Proficient' : 'Developing';

            return (
              <div className="p-5 flex flex-col justify-between space-y-3 hover:bg-[var(--bg-secondary)]/30 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Resume ATS (25%)
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {level}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">{score}%</span>
                    <span className="text-[11px] text-[var(--text-muted)]">alignment</span>
                  </div>
                  <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden mt-2 border border-[var(--border-color)]">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.max(4, score)}%` }} />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-2 line-clamp-2">
                    {quad?.summary || (primaryResume ? `Based on ${primaryResume.filename} scan.` : 'Upload resume to audit ATS parser.')}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">ATS Score:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{score > 0 ? `${score}/100` : 'Pending'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Link
                      href="/builder"
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <span>Open Builder</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => triggerAiAssistant(`Review my resume ATS score (${score}/100) and identify weak bullet phrasing.`)}
                      className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer flex items-center gap-0.5"
                      title="Ask AI Assistant about resume"
                    >
                      <Bot className="w-2.5 h-2.5" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quadrant 4: Interview Fluency (25%) */}
          {(() => {
            const quad = readiness?.quadrants.interviewFluency;
            const score = quad ? quad.score : (unifiedContext?.interviews.averageScore ?? 30);
            const level = quad ? quad.level : score >= 75 ? 'Job-Ready' : score >= 50 ? 'Proficient' : 'Developing';

            return (
              <div className="p-5 flex flex-col justify-between space-y-3 hover:bg-[var(--bg-secondary)]/30 transition-colors">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Interview (25%)
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      {level}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-extrabold text-[var(--text-primary)]">{score}%</span>
                    <span className="text-[11px] text-[var(--text-muted)]">fluency</span>
                  </div>
                  <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden mt-2 border border-[var(--border-color)]">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.max(4, score)}%` }} />
                  </div>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-2 line-clamp-2">
                    {quad?.summary || `${unifiedContext?.interviews.totalSessions || 0} mock technical sessions completed.`}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-[var(--border-color)]/60">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--text-muted)]">Mock Sessions:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{unifiedContext?.interviews.totalSessions || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Link
                      href="/interview-prep"
                      className="text-[11px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
                    >
                      <span>Practice AI Mock</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => triggerAiAssistant(`Simulate a 5-question technical interview for ${targetRole}.`)}
                      className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer flex items-center gap-0.5"
                      title="Ask AI Assistant to practice interview"
                    >
                      <Bot className="w-2.5 h-2.5" />
                      <span>Ask AI</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* ─── 4. READINESS HISTORY CHART (INTERACTIVE VISUAL PROGRESSION) ── */}
      {chartData.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--accent)]" />
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                  Career Readiness Progression Chart
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Dated snapshots logged when genuine activities occur. Zero artificial backfill.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-[var(--text-muted)]">
              {chartData.length} recorded snapshots
            </span>
          </div>

          <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs space-y-4 overflow-hidden">
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--text-secondary)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="var(--text-secondary)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-xl text-xs space-y-1">
                          <p className="font-bold text-[var(--text-primary)]">{item.trigger}</p>
                          <p className="text-[11px] text-[var(--text-muted)]">{item.date}</p>
                          <p className="text-sm font-black text-[var(--accent)] pt-1">
                            Overall Readiness: {item.score}/100 ({item.level})
                          </p>
                          <div className="pt-1 border-t border-[var(--border-color)] grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-[var(--text-secondary)]">
                            <span>Technical: {item.technical}%</span>
                            <span>Projects: {item.project}%</span>
                            <span>Resume ATS: {item.resume}%</span>
                            <span>Interview: {item.interview}%</span>
                          </div>
                          {item.detail && (
                            <p className="text-[10px] text-[var(--text-muted)] pt-1 italic">{item.detail}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--accent)"
                    strokeWidth={3}
                    dot={{ r: 5, fill: 'var(--accent)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                    name="Overall Readiness"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Snapshot Milestones List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-2 border-t border-[var(--border-color)]">
              {snapshots.slice(0, 6).map((snap, idx) => (
                <div
                  key={snap.id || idx}
                  className="p-3 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--text-primary)] truncate">
                      {formatSnapshotTrigger(snap.triggerActivity)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">
                      {formatDate(snap.createdAt)} {snap.activityDetail ? `• ${snap.activityDetail}` : ''}
                    </p>
                  </div>
                  <span className="font-extrabold text-[var(--text-primary)] shrink-0">
                    {snap.overallScore}/100
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── 5. GENUINE ACHIEVEMENTS & VERIFIED CREDENTIALS ─────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[var(--accent)]" />
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                Verified Achievements & Milestones
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Authentic credentials and milestone successes backed by database records.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {achievements.length} verified
          </span>
        </div>

        {achievements.length === 0 ? (
          <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 text-center text-xs space-y-2">
            <Award className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="font-bold text-[var(--text-primary)]">No verified achievements recorded yet</p>
            <p className="text-[11px] text-[var(--text-secondary)] max-w-md mx-auto">
              Pass a proctored technical evaluation under Skill Assessments, complete a guided capstone, or score 75+ on an ATS resume audit to unlock verified credentials.
            </p>
            <div className="pt-2 flex justify-center gap-2">
              <Link href="/skills#skills-directory" className="btn-primary text-xs py-1.5 px-4">
                Take Skill Assessment
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {achievements.map((ach) => (
              <div
                key={ach.id}
                className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] shadow-xs flex flex-col justify-between space-y-2 hover:border-[var(--accent)]/40 transition-colors text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent)]">
                      {ach.badge}
                    </span>
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <p className="font-bold text-[var(--text-primary)] mt-1.5 leading-snug">
                    {ach.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                    {ach.subtitle}
                  </p>
                </div>
                <div className="pt-2 border-t border-[var(--border-color)]/60 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>{formatDate(ach.date)}</span>
                  {ach.href ? (
                    <Link href={ach.href} className="text-[var(--accent)] font-semibold hover:underline flex items-center gap-0.5">
                      <span>View</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ─── 6. WORKSPACE MAIN GRID: TIMELINE & ACTION EXECUTION ─────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Career Progress Timeline & Capstones (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          {/* BLOCK A: Chronological Career Progress Timeline */}
          <section className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                  Career Progress Timeline
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Chronological progression derived from real profiles, scans, assessments, capstones, and applications.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {(['all', 'assessment', 'project', 'resume', 'application'] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setSelectedTimelineFilter(filter)}
                    className={`text-[10px] px-2.5 py-1 rounded-md capitalize font-semibold transition-all cursor-pointer ${
                      selectedTimelineFilter === filter
                        ? 'bg-[var(--accent)] text-white shadow-xs'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {filteredTimeline.length === 0 ? (
              <div className="p-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 text-center space-y-2">
                <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
                <p className="text-xs font-bold text-[var(--text-primary)]">No activity logged in this category yet</p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Your timeline records real milestones automatically as you build resumes, complete projects, and track applications.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-xs divide-y divide-[var(--border-color)]">
                {filteredTimeline.slice(0, 8).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 flex items-start justify-between gap-3 hover:bg-[var(--bg-secondary)]/40 transition-colors text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20 mt-0.5 shadow-xs">
                        {ev.type === 'profile_completed' ? (
                          <GraduationCap className="w-4 h-4" />
                        ) : ev.type === 'resume_analyzed' ? (
                          <FileText className="w-4 h-4" />
                        ) : ev.type === 'assessment_completed' || ev.type === 'certificate_earned' ? (
                          <Award className="w-4 h-4" />
                        ) : ev.type === 'project_milestone' || ev.type === 'project_completed' ? (
                          <FolderGit2 className="w-4 h-4" />
                        ) : ev.type === 'interview_completed' ? (
                          <Play className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-[var(--text-primary)] truncate">{ev.title}</p>
                          {ev.badge ? (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] font-semibold">
                              {ev.badge}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                          {ev.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        {formatDate(ev.timestamp)}
                      </span>
                      {ev.href ? (
                        <Link
                          href={ev.href}
                          className="btn-icon btn-icon-sm rounded-full hover:border-[var(--accent)]/40 transition-colors"
                          title="View activity"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* BLOCK B: Active Guided Capstone Projects */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                  Guided Capstone Projects
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Milestone-driven projects tailored to target role requirements.
                </p>
              </div>
              <Link
                href="/projects"
                className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>Project Mentor ({guidedProjects.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {guidedProjects.length === 0 ? (
              <div className="p-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
                  <FolderGit2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[var(--text-primary)]">No capstones started yet</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Launch a guided software project to demonstrate verified technical evidence on your resume.
                  </p>
                </div>
                <Link href="/projects" className="btn-primary text-xs py-2 px-5 inline-flex">
                  Start Guided Project
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {guidedProjects.slice(0, 3).map((proj) => (
                  <div
                    key={proj.id}
                    className="p-4.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent)]/40 transition-colors shadow-xs space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--text-primary)] text-sm">{proj.title}</span>
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                            proj.difficulty === 'Advanced'
                              ? 'bg-red-500/10 text-red-400 border-red-500/25'
                              : proj.difficulty === 'Intermediate'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          }`}
                        >
                          {proj.difficulty}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-[var(--text-muted)]">
                        {proj.milestoneProgress}% complete
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-[var(--bg-primary)] h-2 rounded-full overflow-hidden border border-[var(--border-color)]">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(4, proj.milestoneProgress)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {proj.techStack.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            className="px-2 py-0.5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-mono text-[var(--text-secondary)]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => triggerAiAssistant(`How do I advance milestone ${proj.milestoneProgress}% on my project "${proj.title}"?`)}
                          className="btn-secondary btn-sm text-[11px] py-1 px-2.5 cursor-pointer flex items-center gap-1"
                          title="Ask AI Mentor about this project"
                        >
                          <Bot className="w-3 h-3 text-[var(--accent)]" />
                          <span>Ask Mentor</span>
                        </button>
                        <Link
                          href={`/projects?id=${proj.id}`}
                          className="btn-primary btn-sm text-[11px] py-1 px-3 shadow-xs inline-flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>Open Project</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* BLOCK C: Active Job Pipeline */}
          <section className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                  Active Applications Pipeline
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Confirmed submissions, stage tracking, and interview rounds.
                </p>
              </div>
              <Link
                href="/dashboard/applications"
                className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1"
              >
                <span>Manage ({recentApplications.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentApplications.length === 0 ? (
              <div className="p-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 text-center space-y-2">
                <p className="text-xs font-semibold text-[var(--text-primary)]">No applications tracked yet</p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Search live openings on LinkedIn, Adzuna, and Jooble to populate your tracker.
                </p>
                <Link href="/jobs" className="btn-secondary text-xs py-1.5 px-4 inline-flex mt-2">
                  Find Jobs
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-xs">
                {recentApplications.slice(0, 4).map((app) => (
                  <div key={app.id} className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--bg-secondary)]/50 transition-colors text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--text-primary)] truncate">
                        {app.job_title}
                      </p>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">
                        {app.company} {app.location ? `• ${app.location}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                          app.status === 'Applied'
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                            : app.status === 'Interview'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                            : app.status === 'Offer'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 font-semibold'
                            : 'bg-slate-500/10 text-[var(--text-muted)] border-slate-500/20'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Proactive Actions & Studio Rail (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          {/* BLOCK D: Proactive Career Actions */}
          <section className="space-y-3">
            <div className="pb-2 border-b border-[var(--border-color)] flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                  Recommended Next Actions
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Evidence-backed next actions grounded in your actual profile data.
                </p>
              </div>
              {actionPlan && actionPlan.highPriorityCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/25">
                  {actionPlan.highPriorityCount} High Priority
                </span>
              ) : null}
            </div>

            {actionPlan && actionPlan.actions.length > 0 ? (
              <div className="space-y-3">
                {actionPlan.actions.slice(0, 4).map((action) => (
                  <div
                    key={action.id}
                    className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent)]/40 transition-colors shadow-xs space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`uppercase text-[9px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                            action.category === 'skills'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                              : action.category === 'projects'
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20'
                              : action.category === 'resume'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                              : action.category === 'interview'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                              : 'bg-slate-500/10 text-[var(--text-muted)] border-slate-500/20'
                          }`}
                        >
                          {action.category}
                        </span>
                        {action.priority === 'high' ? (
                          <span className="text-[10px] text-amber-400 font-semibold">• High Impact</span>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => triggerAiAssistant(`Help me execute this recommended action: "${action.title}". Why: ${action.why}`)}
                        className="text-[10px] font-mono text-[var(--text-muted)] hover:text-[var(--accent)] cursor-pointer flex items-center gap-0.5"
                        title="Discuss action with AI Assistant"
                      >
                        <Bot className="w-2.5 h-2.5" />
                        <span>Ask AI</span>
                      </button>
                    </div>

                    <p className="font-bold text-[var(--text-primary)] text-xs leading-snug">
                      {action.title}
                    </p>

                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {action.why}
                    </p>

                    <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[11px] space-y-1">
                      <p className="text-[var(--text-muted)] font-mono text-[10px]">
                        EVIDENCE: <span className="text-[var(--text-secondary)] font-sans">{action.evidence}</span>
                      </p>
                      <p className="text-emerald-400 font-mono text-[10px]">
                        BENEFIT: <span className="text-emerald-400/90 font-sans">{action.expectedBenefit}</span>
                      </p>
                    </div>

                    <div className="pt-1 flex justify-end">
                      <Link
                        href={action.href}
                        className="btn-primary btn-sm text-[11px] py-1 px-3.5 shadow-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{action.actionText}</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-4 text-xs shadow-xs">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center text-[10px] font-mono font-bold text-[var(--text-primary)] shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Review ATS suggestions</p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                      Check your ATS score and keyword gaps in the builder.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* BLOCK E: Career Tools Launchers */}
          <section className="space-y-3">
            <div className="pb-2 border-b border-[var(--border-color)]">
              <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wide">
                Career Tools
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Tools to track, prepare, and optimize your career progression.
              </p>
            </div>

            <div className="divide-y divide-[var(--border-color)] rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden shadow-xs">
              {[
                {
                  title: 'Project Mentor',
                  desc: 'Build role-tailored software capstones with milestone tracking.',
                  href: '/projects',
                  icon: FolderGit2,
                  badge: 'Mentor',
                },
                {
                  title: 'Job Application Assistant',
                  desc: 'Custom cover letters, fit audits, and application tracking.',
                  href: '/jobs',
                  icon: Briefcase,
                  badge: 'Apply',
                },
                {
                  title: 'Interview Coach',
                  desc: 'Practice technical & behavioral questions with instant scoring.',
                  href: '/interview-prep',
                  icon: Play,
                  badge: 'Interview',
                },
                {
                  title: 'Learning Roadmap',
                  desc: 'Curriculum with verified masterclasses & proctored assessments.',
                  href: '/skills?tab=roadmap',
                  icon: BookOpen,
                  badge: 'Roadmap',
                },
                {
                  title: 'ATS Score Checker',
                  desc: 'Audit keyword coverage and parser extractability.',
                  href: '/ats-score',
                  icon: BarChart3,
                  badge: 'Auditor',
                },
                {
                  title: 'Phrasing Improver',
                  desc: 'Refine bullets with facts strictly preserved.',
                  href: '/improver',
                  icon: Wand2,
                  badge: 'Rewriter',
                },
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.title}
                    href={tool.href}
                    className="p-4 flex items-center justify-between gap-3 hover:bg-[var(--bg-secondary)]/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--accent)] flex items-center justify-center shrink-0 group-hover:border-[var(--accent)]/40 transition-colors shadow-xs">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">
                          {tool.title}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {tool.desc}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
