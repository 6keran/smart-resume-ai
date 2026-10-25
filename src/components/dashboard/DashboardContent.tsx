'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  FileText,
  FileSearch,
  Sparkles,
  TrendingUp,
  Briefcase,
  Send,
  BadgeCheck,
  FileCheck2,
  Award,
  BookOpen,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Compass,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Search,
  Target,
  Activity,
} from 'lucide-react';
import {
  PageTransition,
  ScrollReveal,
  StaggerGroup,
  StaggerChild,
  AnimatedCounter,
} from '@/components/ui/MotionPrimitives';
import { fadeUp } from '@/lib/motion';

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
}

export interface DashboardContentProps {
  user: {
    id: string;
    name: string;
    email?: string | null;
  };
  data: DashboardData;
}

export function DashboardContent({ user, data }: DashboardContentProps) {
  const router = useRouter();
  const { metrics, resumeProgress, recentApplications, recentAssessments, recentImprovements } = data;

  const scoreValue = metrics.avgAtsScore > 0 ? metrics.avgAtsScore : 0;
  const isScorePassing = scoreValue >= 75;

  return (
    <PageTransition className="space-y-8">
      {/* ─── Hero Intelligence Hub ───────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-3xl border border-[var(--glass-border-hover)] bg-[var(--glass-bg-elevated)] backdrop-blur-2xl p-6 sm:p-8 shadow-[var(--shadow-glass)]"
      >
        {/* Specular Top Edge */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent pointer-events-none" />

        {/* Floating Search & Action Dock matching Reference Image 2 & 3 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-6 border-b border-[var(--glass-border)]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search resumes, target roles, or keywords..."
              readOnly
              onClick={() => {
                router.push('/dashboard/resumes');
              }}
              className="w-full h-9 pl-9 pr-4 rounded-full bg-[var(--glass-bg)] border border-[var(--glass-border)] text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/builder"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Resume</span>
            </Link>
            <Link
              href="/analyzer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] text-xs font-semibold text-[var(--text-primary)] shadow-xs transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>AI Scan</span>
            </Link>
          </div>
        </div>

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Greeting & Context (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_16px_rgba(79,143,247,0.3)]">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">
                  Career Intelligence Center
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                  {user.email || 'Verified Candidate Profile'}
                </span>
              </div>
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-[var(--text-primary)] leading-tight">
                Welcome back, {user.name}
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1.5 max-w-2xl leading-relaxed">
                Track ATS score evolution, target job applications, verified technical skills, and factually optimized resume bullets.
              </p>
            </div>

            {/* Quick Actions Dock */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/analyzer"
                className="btn-primary text-xs h-10 px-5 shadow-[0_4px_16px_rgba(79,143,247,0.3)]"
              >
                <FileSearch className="w-4 h-4 text-white" />
                <span>Analyze Resume</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/builder"
                className="btn-secondary text-xs h-10 px-4"
              >
                <FileText className="w-4 h-4 text-[var(--accent)]" />
                <span>Build A4 Resume</span>
              </Link>
              <Link
                href="/skills"
                className="btn-secondary text-xs h-10 px-4"
              >
                <BadgeCheck className="w-4 h-4 text-emerald-400" />
                <span>Take Skill Quiz</span>
              </Link>
              <Link
                href="/jobs"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors flex items-center gap-1.5"
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Find Jobs</span>
              </Link>
            </div>
          </div>

          {/* Right Highlight Scorecard Widget (4 cols) */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-5 text-center flex flex-col items-center shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
                Overall ATS Score
              </span>

              <div className="relative w-24 h-24 rounded-full border-4 border-[var(--glass-border)] border-t-[var(--accent)] flex flex-col items-center justify-center mb-3 shadow-[0_0_24px_rgba(79,143,247,0.15)]">
                <span className="text-3xl font-black text-[var(--text-primary)] leading-none">
                  <AnimatedCounter value={scoreValue} />
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] mt-0.5">
                  / 100
                </span>
              </div>

              <div className="w-full pt-3 border-t border-[var(--glass-border)] flex items-center justify-between text-xs font-semibold">
                <span className="text-[var(--text-secondary)]">ATS Health</span>
                <span className={scoreValue >= 75 ? 'text-emerald-400' : scoreValue > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]'}>
                  {scoreValue >= 75 ? 'Recruiter Ready' : scoreValue > 0 ? 'Needs Optimization' : 'No Scans Yet'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Structured Metric Hubs ──────────────────────────────────── */}
      <div className="space-y-6">
        {/* Section 1: Resume & ATS Quality Hub with VerdantFlow Sparklines */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <FileSearch className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>Resume & ATS Intelligence</span>
            </h2>
            <Link href="/dashboard/resumes" className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1">
              <span>View Resumes</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <StaggerGroup className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                title: 'Uploaded Resumes',
                value: metrics.totalResumes,
                label: 'Active Documents',
                icon: FileText,
                color: 'text-[var(--accent)]',
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/20',
                href: '/dashboard/resumes',
              },
              {
                title: 'ATS Analyses',
                value: metrics.totalAnalyses,
                label: 'Completed Scans',
                icon: FileSearch,
                color: 'text-[var(--accent)]',
                bg: 'bg-indigo-500/10',
                border: 'border-indigo-500/20',
                href: '/dashboard/analyses',
              },
              {
                title: 'Average ATS Score',
                value: metrics.avgAtsScore > 0 ? metrics.avgAtsScore : 0,
                suffix: metrics.avgAtsScore > 0 ? '/100' : '',
                label: 'Quality Index',
                icon: TrendingUp,
                color: scoreValue >= 75 ? 'text-emerald-400' : 'text-amber-400',
                bg: scoreValue >= 75 ? 'bg-emerald-500/10' : 'bg-amber-500/10',
                border: scoreValue >= 75 ? 'border-emerald-500/20' : 'border-amber-500/20',
                href: '/dashboard/analyses',
              },
              {
                title: 'Improvements Made',
                value: metrics.improvementsMade,
                label: 'Phrasing Updates',
                icon: Sparkles,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
                href: '/dashboard/improvements',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <StaggerChild key={card.title}>
                  <Link
                    href={card.href}
                    className="group relative rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] p-5 transition-all duration-200 shadow-xs hover:shadow-[var(--shadow-glass-hover)] hover:border-[var(--glass-border-hover)] hover:-translate-y-0.5 block backdrop-blur-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-xl ${card.bg} ${card.color} ${card.border} border flex items-center justify-center shrink-0`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                        <AnimatedCounter value={typeof card.value === 'number' ? card.value : parseInt(String(card.value), 10) || 0} />
                      </span>
                      {card.suffix && (
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                          {card.suffix}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[var(--text-primary)] mt-1 truncate">
                      {card.title}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                      {card.label}
                    </p>
                  </Link>
                </StaggerChild>
              );
            })}
          </StaggerGroup>
        </div>

        {/* Section 1.5: 2 Actionable Modules (Career Guidance Coming Soon + Target Role Gap Analysis) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Module 1: Career Guidance (Coming Soon) */}
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center">
                    <Compass className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Career Guidance</span>
                </div>
                <span className="text-[10px] text-amber-500 dark:text-amber-400 font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                  Coming Soon
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] mb-3">
                Personalized role roadmaps, verified promotion milestones, and tech competency benchmarks are under development.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--glass-bg-elevated)] text-[var(--text-secondary)] border border-[var(--glass-border)]">
                  Role Roadmaps
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--glass-bg-elevated)] text-[var(--text-secondary)] border border-[var(--glass-border)]">
                  Promotion Tracks
                </span>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--glass-bg-elevated)] text-[var(--text-secondary)] border border-[var(--glass-border)]">
                  Interview Stages
                </span>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-[var(--glass-border)] flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-muted)]">Feature In Development</span>
              <Link
                href="/guidance"
                className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-hover)] inline-flex items-center gap-1 group"
              >
                <span>View Details</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Module 2: Target Role Alignment */}
          <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-5 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Target className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-[var(--text-primary)]">Target Role Alignment</span>
                </div>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
                  Tool
                </span>
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)] mt-1">Role Keyword & Qualification Audit</h4>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1 leading-snug">
                Compare your current resume against target job descriptions to identify missing keywords and qualification gaps.
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-[var(--glass-border)] flex items-center justify-between">
              <span className="text-[11px] text-[var(--text-secondary)]">ATS Keyword Checker</span>
              <Link
                href="/job-match"
                className="btn-primary text-xs h-8 px-3.5 shadow-xs"
              >
                <span>Check Alignment</span>
                <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Section 2: Career Pipeline & Skills Hub */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              <span>Job Search & Verified Qualifications</span>
            </h2>
            <Link href="/dashboard/applications" className="text-xs font-semibold text-[var(--accent)] hover:underline flex items-center gap-1">
              <span>View Applications</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <StaggerGroup className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            {[
              {
                title: 'Jobs Applied',
                value: metrics.jobsApplied,
                label: 'Direct Submissions',
                icon: Send,
                color: 'text-cyan-400',
                bg: 'bg-cyan-500/10',
                border: 'border-cyan-500/20',
                href: '/dashboard/applications',
              },
              {
                title: 'Job Matches',
                value: metrics.jobMatches,
                label: 'Matched Roles',
                icon: Briefcase,
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
                border: 'border-blue-500/20',
                href: '/dashboard/jobs',
              },
              {
                title: 'Verified Skills',
                value: metrics.verifiedSkills,
                label: 'Badges Earned',
                icon: BadgeCheck,
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
                border: 'border-emerald-500/20',
                href: '/dashboard/skills',
              },
              {
                title: 'Assessments Done',
                value: metrics.assessmentsCompleted,
                label: 'Technical Quizzes',
                icon: FileCheck2,
                color: 'text-purple-400',
                bg: 'bg-purple-500/10',
                border: 'border-purple-500/20',
                href: '/dashboard/assessments',
              },
              {
                title: 'Certificates',
                value: metrics.certificatesEarned,
                label: 'Verified Awards',
                icon: Award,
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20',
                href: '/dashboard/certificates',
              },
              {
                title: 'Courses Done',
                value: metrics.coursesCompleted,
                label: 'Learning Targets',
                icon: BookOpen,
                color: 'text-rose-400',
                bg: 'bg-rose-500/10',
                border: 'border-rose-500/20',
                href: '/dashboard/courses',
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <StaggerChild key={card.title}>
                  <Link
                    href={card.href}
                    className="group relative rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] p-4 transition-all duration-200 shadow-xs hover:shadow-[var(--shadow-glass-hover)] hover:border-[var(--glass-border-hover)] hover:-translate-y-0.5 block backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`w-8 h-8 rounded-xl ${card.bg} ${card.color} ${card.border} border flex items-center justify-center shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)]">
                      <AnimatedCounter value={typeof card.value === 'number' ? card.value : parseInt(String(card.value), 10) || 0} />
                    </span>
                    <p className="text-xs font-bold text-[var(--text-primary)] mt-1 truncate">
                      {card.title}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
                      {card.label}
                    </p>
                  </Link>
                </StaggerChild>
              );
            })}
          </StaggerGroup>
        </div>
      </div>

      {/* ─── Resume Progress Section ─────────────────────────────────── */}
      <ScrollReveal>
        <div className="rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-2xl p-6 sm:p-7 shadow-[var(--shadow-glass)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[var(--glass-border)] gap-3">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--accent)]" />
                <span>Resume Progress & Evolution</span>
              </h2>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Score trends and before/after improvements across your documents.
              </p>
            </div>
            <Link
              href="/dashboard/resumes"
              className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              <span>View All Resumes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {resumeProgress.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
              <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] border border-[var(--accent)]/20 flex items-center justify-center mx-auto mb-3 text-[var(--accent)]">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                No resumes uploaded yet
              </h3>
              <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1 mb-5">
                Upload your first resume to unlock comprehensive ATS scoring, keyword gap detection, and automated wording improvements.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/analyzer"
                  className="btn-primary text-xs h-9 px-4"
                >
                  <FileSearch className="w-3.5 h-3.5 text-white" />
                  <span>Scan Resume</span>
                </Link>
                <Link
                  href="/builder"
                  className="btn-secondary text-xs h-9 px-4"
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span>Create Resume</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {resumeProgress.map((r, i) => {
                const hasImprovement = r.improvement !== null;
                const isPositive = r.improvement && r.improvement > 0;
                const isNeutral = r.improvement === 0;

                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-[var(--glass-border-hover)] transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {r.filename}
                        </h4>
                        <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2 mt-0.5">
                          <span>Uploaded {new Date(r.uploadedAt).toLocaleDateString()}</span>
                          {r.fileType && (
                            <span className="uppercase px-1.5 py-0.2 rounded-md bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[9px] font-bold">
                              {r.fileType}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Benchmark Scores */}
                    <div className="flex items-center gap-5 shrink-0">
                      <div className="flex items-center gap-3.5 text-center">
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] block">
                            Initial
                          </span>
                          <span className="text-sm font-bold text-[var(--text-secondary)]">
                            {r.previousScore !== null ? `${r.previousScore}` : '-'}
                          </span>
                        </div>
                        <div className="text-sm font-bold text-[var(--text-secondary)]">→</div>
                        <div>
                          <span className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] block">
                            Latest ATS
                          </span>
                          <span className="text-base font-extrabold text-[var(--text-primary)]">
                            {r.latestScore !== null ? `${r.latestScore}` : 'Not Scored'}
                          </span>
                        </div>
                      </div>

                      {/* Improvement Delta Badge */}
                      {hasImprovement && (
                        <div
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
                            isPositive
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25'
                              : isNeutral
                              ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-color)]'
                              : 'bg-red-500/10 text-red-400 border border-red-500/25'
                          }`}
                        >
                          <span>{isPositive ? `+${r.improvement}` : `${r.improvement}`}</span>
                          <span className="text-[10px] font-medium">pts</span>
                        </div>
                      )}

                      {r.latestAnalysisId ? (
                        <Link
                          href={`/dashboard/analyses`}
                          className="px-3.5 py-1.5 rounded-xl border border-[var(--glass-border)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] hover:bg-[var(--glass-bg)] transition-all shrink-0"
                        >
                          View Analysis
                        </Link>
                      ) : (
                        <Link
                          href="/analyzer"
                          className="btn-primary text-xs h-8 px-3.5 shrink-0"
                        >
                          Analyze
                        </Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* ─── Two Column Grid: Applications & Skill Assessments ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Applications */}
        <ScrollReveal direction="left">
          <div className="rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-2xl p-6 flex flex-col justify-between shadow-[var(--shadow-glass)] h-full">
            <div>
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Active Job Applications
                  </h3>
                </div>
                <Link
                  href="/dashboard/applications"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Tracker</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {recentApplications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    No job applications recorded yet.
                  </p>
                  <Link
                    href="/dashboard/applications"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-primary)] shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Track Application</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentApplications.map((app, i) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="p-3.5 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] flex items-center justify-between gap-3 text-xs shadow-xs hover:border-[var(--glass-border-hover)] transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">
                          {app.job_title}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          {app.company} {app.location ? `· ${app.location}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] font-semibold text-[10px] text-[var(--text-primary)]">
                          {app.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* Recent Skill Assessments */}
        <ScrollReveal direction="right">
          <div className="rounded-3xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-2xl p-6 flex flex-col justify-between shadow-[var(--shadow-glass)] h-full">
            <div>
              <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[var(--glass-border)]">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    Skill Assessments
                  </h3>
                </div>
                <Link
                  href="/dashboard/assessments"
                  className="text-xs font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>All Quizzes</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {recentAssessments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[var(--text-secondary)] mb-3">
                    No skill assessments attempted yet.
                  </p>
                  <Link
                    href="/skills"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] shadow-sm"
                  >
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>Take Technical Assessment</span>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentAssessments.map((a, i) => (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      className="p-3.5 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] flex items-center justify-between gap-3 text-xs shadow-xs hover:border-[var(--glass-border-hover)] transition-all"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">
                          {a.skill} Assessment
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] truncate">
                          Score: {a.score}/{a.total_questions} ({Math.round((a.score / a.total_questions) * 100)}%)
                        </p>
                      </div>
                      <div>
                        {a.passed ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold text-[10px]">
                            PASSED
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/25 font-bold text-[10px]">
                            FAILED
                          </span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>
      </div>

    </PageTransition>
  );
}
