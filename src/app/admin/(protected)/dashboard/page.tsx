'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  FileSearch,
  Award,
  BadgeCheck,
  Briefcase,
  Target,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Clock,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface RealStatsData {
  totalVisitors: number;
  totalResumesAnalyzed: number;
  averageAtsScore: number;
  verifiedSkillsCount: number;
  completedAssessmentsCount: number;
  totalJobSearches: number;
  totalJobMatches: number;
  totalFeedback: number;
  atsHistory: Array<{ date: string; avgScore: number; avgFormatting: number; avgKeywords: number }>;
  skillMastery: Array<{ skill: string; count: number; avgScore: number }>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    userName?: string;
    timestamp: string;
  }>;
  questionBankStats: {
    totalQuestions: number;
    activeQuestions: number;
    inactiveQuestions: number;
    skillsCovered: number;
  };
}

interface DetailedData {
  studentFunnel?: {
    totalRegisteredUsers: number;
    withProfileCount: number;
    withResumeCount: number;
    withVerifiedSkillCount: number;
    withInterviewSessionCount: number;
    withJobApplicationCount: number;
  };
  readinessDistribution?: {
    novice: number;
    developing: number;
    competitive: number;
    careerReady: number;
    totalSnapshots: number;
  };
  projectStats?: {
    totalGuidedProjects: number;
    completedProjects: number;
    inProgressProjects: number;
  };
  aiServiceHealth?: {
    geminiConfigured: boolean;
    geminiStatus: string;
    deterministicAtsStatus: string;
    jobSearchProviders: string[];
  };
  resumeAnalytics: {
    totalResumes: number;
    pdfCount: number;
    docxCount: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    avgAtsScore: number;
    avgKeywordScore: number;
    avgFormattingScore: number;
    avgSectionScore: number;
  };
  jobAnalytics: {
    totalSearches: number;
    searchesToday: number;
    searchesThisWeek: number;
    topJobTitles: Array<{ title: string; count: number }>;
    topLocations: Array<{ location: string; count: number }>;
    providerCounts: Array<{ provider: string; count: number; totalResults: number }>;
    avgJobsReturned: number;
  };
  assessmentAnalytics: {
    totalAssessments: number;
    completedAssessments: number;
    passedAssessments: number;
    failedAssessments: number;
    passRate: number;
    avgScore: number;
    avgDurationSeconds: number;
    topVerifiedSkills: Array<{ skill: string; count: number }>;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<RealStatsData | null>(null);
  const [details, setDetails] = useState<DetailedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchStats = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setDetails(data.details);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          Querying database telemetry...
        </p>
      </div>
    );
  }

  const s = stats || {
    totalVisitors: 0,
    totalResumesAnalyzed: 0,
    averageAtsScore: 0,
    verifiedSkillsCount: 0,
    completedAssessmentsCount: 0,
    totalJobSearches: 0,
    totalJobMatches: 0,
    totalFeedback: 0,
    atsHistory: [],
    skillMastery: [],
    recentActivities: [],
    questionBankStats: {
      totalQuestions: 0,
      activeQuestions: 0,
      inactiveQuestions: 0,
      skillsCovered: 0,
    },
  };

  const d = details || {
    studentFunnel: {
      totalRegisteredUsers: 0,
      withProfileCount: 0,
      withResumeCount: 0,
      withVerifiedSkillCount: 0,
      withInterviewSessionCount: 0,
      withJobApplicationCount: 0,
    },
    readinessDistribution: {
      novice: 0,
      developing: 0,
      competitive: 0,
      careerReady: 0,
      totalSnapshots: 0,
    },
    projectStats: {
      totalGuidedProjects: 0,
      completedProjects: 0,
      inProgressProjects: 0,
    },
    aiServiceHealth: {
      geminiConfigured: false,
      geminiStatus: 'deterministic_fallback',
      deterministicAtsStatus: 'healthy',
      jobSearchProviders: ['Adzuna', 'Jooble', 'LinkedIn', 'Naukri'],
    },
    resumeAnalytics: {
      totalResumes: 0,
      pdfCount: 0,
      docxCount: 0,
      successfulAnalyses: 0,
      failedAnalyses: 0,
      avgAtsScore: 0,
      avgKeywordScore: 0,
      avgFormattingScore: 0,
      avgSectionScore: 0,
    },
    jobAnalytics: {
      totalSearches: 0,
      searchesToday: 0,
      searchesThisWeek: 0,
      topJobTitles: [],
      topLocations: [],
      providerCounts: [],
      avgJobsReturned: 0,
    },
    assessmentAnalytics: {
      totalAssessments: 0,
      completedAssessments: 0,
      passedAssessments: 0,
      failedAssessments: 0,
      passRate: 0,
      avgScore: 0,
      avgDurationSeconds: 0,
      topVerifiedSkills: [],
    },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 text-left">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            System overview and platform telemetry.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] text-[var(--text-secondary)] hidden md:inline font-mono">
            Updated {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview (All 8 Core Counters from DB) */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          System Overview
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 sm:gap-4">
          {/* Total Visitors */}
          <Link href="/admin/users" className="block group">
            <GlassCard className="p-4 flex flex-col justify-between h-full group-hover:border-[var(--accent)]/50 transition-all">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Visitors</span>
                <Users className="w-3.5 h-3.5 text-[var(--accent)]" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] my-2">
                {s.totalVisitors}
              </div>
              <span className="text-[9px] text-[var(--text-secondary)] font-medium">Distinct Sessions</span>
            </GlassCard>
          </Link>

          {/* Resume Analyses */}
          <Link href="/admin/analyses" className="block group">
            <GlassCard className="p-4 flex flex-col justify-between h-full group-hover:border-[var(--accent)]/50 transition-all">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Resume Analyses</span>
                <FileSearch className="w-3.5 h-3.5 text-[var(--accent)]" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] my-2">
                {s.totalResumesAnalyzed}
              </div>
              <span className="text-[9px] text-[var(--text-secondary)] font-medium">ATS Scans Run</span>
            </GlassCard>
          </Link>

          {/* Average ATS Score */}
          <Link href="/admin/resumes" className="block group">
            <GlassCard className="p-4 flex flex-col justify-between h-full group-hover:border-[var(--accent)]/50 transition-all">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Average ATS</span>
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] my-2">
                {s.averageAtsScore > 0 ? `${s.averageAtsScore}` : '0'}
              </div>
              <span className="text-[9px] text-[var(--text-secondary)] font-medium">Overall Average</span>
            </GlassCard>
          </Link>

          {/* Verified Skills */}
          <Link href="/admin/skills" className="block group">
            <GlassCard className="p-4 flex flex-col justify-between h-full group-hover:border-[var(--accent)]/50 transition-all">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Verified Skills</span>
                <BadgeCheck className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] my-2">
                {s.verifiedSkillsCount}
              </div>
              <span className="text-[9px] text-[var(--text-secondary)] font-medium">Skills Verified</span>
            </GlassCard>
          </Link>

          {/* Assessments */}
          <Link href="/admin/assessments" className="block group">
            <GlassCard className="p-4 flex flex-col justify-between h-full group-hover:border-[var(--accent)]/50 transition-all">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Assessments</span>
                <Award className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] my-2">
                {s.completedAssessmentsCount}
              </div>
              <span className="text-[9px] text-[var(--text-secondary)] font-medium">Completed Tests</span>
            </GlassCard>
          </Link>

          {/* Job Searches */}
          <Link href="/admin/jobs" className="block group">
            <GlassCard className="p-4 flex flex-col justify-between h-full group-hover:border-[var(--accent)]/50 transition-all">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Job Searches</span>
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] my-2">
                {s.totalJobSearches}
              </div>
              <span className="text-[9px] text-[var(--text-secondary)] font-medium">Live Queries</span>
            </GlassCard>
          </Link>

          {/* Job Matches */}
          <Link href="/admin/job-matches" className="block group">
            <GlassCard className="p-4 flex flex-col justify-between h-full group-hover:border-[var(--accent)]/50 transition-all">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Job Matches</span>
                <Target className="w-3.5 h-3.5 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] my-2">
                {s.totalJobMatches}
              </div>
              <span className="text-[9px] text-[var(--text-secondary)] font-medium">JD Evaluations</span>
            </GlassCard>
          </Link>

          {/* Feedback */}
          <Link href="/admin/feedback" className="block group">
            <GlassCard className="p-4 flex flex-col justify-between h-full group-hover:border-[var(--accent)]/50 transition-all">
              <div className="flex items-center justify-between text-[var(--text-secondary)]">
                <span className="text-[10px] font-bold uppercase tracking-wider">Feedback</span>
                <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
              </div>
              <div className="text-2xl font-black text-[var(--text-primary)] my-2">
                {s.totalFeedback}
              </div>
              <span className="text-[9px] text-[var(--text-secondary)] font-medium">User Reviews</span>
            </GlassCard>
          </Link>
        </div>
      </div>

      {/* Student Career Funnel & Platform Intelligence Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Student Progression Funnel (7 cols) */}
        <GlassCard className="lg:col-span-7 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Student Career Funnel
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  End-to-end student progression from account registration to job application.
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                Candidate Pipeline
              </span>
            </div>

            {/* Funnel Steps */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Registered', count: d.studentFunnel?.totalRegisteredUsers || 0, sub: 'Total students' },
                { label: 'Profile Setup', count: d.studentFunnel?.withProfileCount || 0, sub: 'Target role set' },
                { label: 'Resume on File', count: d.studentFunnel?.withResumeCount || 0, sub: 'Parsed documents' },
                { label: 'Skill Verified', count: d.studentFunnel?.withVerifiedSkillCount || 0, sub: 'Proctored passes' },
                { label: 'Interviewed', count: d.studentFunnel?.withInterviewSessionCount || 0, sub: 'AI mock sessions' },
                { label: 'Applied', count: d.studentFunnel?.withJobApplicationCount || 0, sub: 'Tracked pipeline' },
              ].map((step, idx) => (
                <div key={step.label} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                    <span>STEP {idx + 1}</span>
                  </div>
                  <div className="text-xl font-black text-[var(--text-primary)] mt-1">
                    {step.count}
                  </div>
                  <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                    {step.label}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    {step.sub}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guided Projects & Milestones Summary */}
          <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>
              Guided Capstones: <strong className="text-[var(--text-primary)]">{d.projectStats?.totalGuidedProjects || 0}</strong> total ({d.projectStats?.inProgressProjects || 0} active, {d.projectStats?.completedProjects || 0} completed)
            </span>
            <Link href="/admin/users" className="text-[var(--accent)] font-semibold hover:underline flex items-center gap-1">
              <span>View Candidates</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </GlassCard>

        {/* AI Reliability & Readiness Distribution (5 cols) */}
        <GlassCard className="lg:col-span-5 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  AI Service Reliability
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  LLM providers, deterministic fallbacks, and readiness distribution.
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Operational</span>
              </span>
            </div>

            {/* AI Providers & Status */}
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Gemini 2.5 Flash</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Core career LLM provider</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  d.aiServiceHealth?.geminiConfigured
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                }`}>
                  {d.aiServiceHealth?.geminiConfigured ? 'Configured (Live)' : 'Deterministic Fallback'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-between">
                <div>
                  <p className="font-bold text-[var(--text-primary)]">Deterministic ATS Engine</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Advanced resume intelligence & scoring</p>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  Active (0ms SLA)
                </span>
              </div>
            </div>

            {/* Readiness Distribution */}
            <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                Career Readiness Distribution
              </span>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <span className="text-sm font-extrabold text-[var(--text-primary)] block">
                    {d.readinessDistribution?.novice || 0}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] block">Novice</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <span className="text-sm font-extrabold text-blue-400 block">
                    {d.readinessDistribution?.developing || 0}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] block">Developing</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <span className="text-sm font-extrabold text-amber-400 block">
                    {d.readinessDistribution?.competitive || 0}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] block">Competitive</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-secondary)]">
                  <span className="text-sm font-extrabold text-emerald-400 block">
                    {d.readinessDistribution?.careerReady || 0}
                  </span>
                  <span className="text-[9px] text-[var(--text-muted)] block">Job Ready</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Two Column Section: Real ATS History Chart + Real Skill Assessment Performance Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ATS Score Trajectory Chart */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  ATS History
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Chronological progression of average candidate ATS scores.
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                Database Records
              </span>
            </div>

            {s.atsHistory.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center p-6 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-elevated)]/30 text-center">
                <FileSearch className="w-8 h-8 text-[var(--text-secondary)]/50 mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No ATS history available yet.
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Upload and analyze a resume using the Resume Analyzer to record data points.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={s.atsHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      contentStyle={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="avgScore"
                      stroke="var(--accent)"
                      strokeWidth={3}
                      dot={{ r: 4, fill: 'var(--accent)' }}
                      activeDot={{ r: 6 }}
                      name="Average ATS"
                    />
                    <Line
                      type="monotone"
                      dataKey="avgFormatting"
                      stroke="#34d399"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Formatting Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </GlassCard>

        {/* Skill Verification Performance Chart */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Skill & Assessment Analytics
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Actual pass scores achieved during technical skill assessments.
                </p>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-violet-500/15 text-violet-400 border border-violet-500/30">
                Verified Skills
              </span>
            </div>

            {s.skillMastery.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center p-6 border border-dashed border-[var(--border-color)] rounded-xl bg-[var(--bg-elevated)]/30 text-center">
                <Award className="w-8 h-8 text-[var(--text-secondary)]/50 mb-2" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No verified skill assessment data yet.
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Complete technical assessments under Skill Verification to record results.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.skillMastery} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis
                      dataKey="skill"
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
                      contentStyle={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <Bar
                      dataKey="avgScore"
                      fill="var(--accent)"
                      radius={[6, 6, 0, 0]}
                      name="Average Score (%)"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Tri-Column Deep Analytics: Resume, Job, & Assessment */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Resume Analytics */}
        <GlassCard className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--border-color)]">
                <FileSearch className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Resume Analytics
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Total Resumes Uploaded</span>
                <span className="font-bold text-[var(--text-primary)]">{d.resumeAnalytics.totalResumes}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Format Breakdown</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {d.resumeAnalytics.pdfCount} PDF · {d.resumeAnalytics.docxCount} DOCX
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Successful Analyses</span>
                <span className="font-semibold text-emerald-400">{d.resumeAnalytics.successfulAnalyses}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Average Keyword Score</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {d.resumeAnalytics.avgKeywordScore > 0 ? `${d.resumeAnalytics.avgKeywordScore}/100` : '0'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-secondary)]">Average Formatting Score</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {d.resumeAnalytics.avgFormattingScore > 0 ? `${d.resumeAnalytics.avgFormattingScore}/100` : '0'}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/resumes"
            className="inline-flex items-center justify-between text-xs font-semibold text-[var(--accent)] hover:underline pt-2 border-t border-[var(--border-color)]"
          >
            <span>View all resume uploads</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </GlassCard>

        {/* Job Analytics */}
        <GlassCard className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Job Analytics
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Total Searches</span>
                <span className="font-bold text-[var(--text-primary)]">{d.jobAnalytics.totalSearches}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Searches Today</span>
                <span className="font-bold text-[var(--text-primary)]">{d.jobAnalytics.searchesToday}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Searches This Week</span>
                <span className="font-semibold text-[var(--text-primary)]">{d.jobAnalytics.searchesThisWeek}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Top Job Query</span>
                <span className="font-semibold text-[var(--text-primary)] truncate max-w-[120px]">
                  {d.jobAnalytics.topJobTitles[0]?.title || 'None'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-secondary)]">Top Location</span>
                <span className="font-semibold text-[var(--text-primary)] truncate max-w-[120px]">
                  {d.jobAnalytics.topLocations[0]?.location || 'None'}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/jobs"
            className="inline-flex items-center justify-between text-xs font-semibold text-[var(--accent)] hover:underline pt-2 border-t border-[var(--border-color)]"
          >
            <span>View job search logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </GlassCard>

        {/* Skill & Assessment Analytics */}
        <GlassCard className="p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                <Award className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Skill & Assessment Analytics
              </h3>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Total Assessments</span>
                <span className="font-bold text-[var(--text-primary)]">{d.assessmentAnalytics.totalAssessments}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Overall Pass Rate</span>
                <span className="font-semibold text-emerald-400">{d.assessmentAnalytics.passRate}%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Passed vs Failed</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {d.assessmentAnalytics.passedAssessments} Passed · {d.assessmentAnalytics.failedAssessments} Failed
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border-color)]">
                <span className="text-[var(--text-secondary)]">Average Score</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {d.assessmentAnalytics.avgScore > 0 ? `${d.assessmentAnalytics.avgScore}%` : '0%'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-secondary)]">Top Verified Skill</span>
                <span className="font-semibold text-[var(--text-primary)] truncate max-w-[120px]">
                  {d.assessmentAnalytics.topVerifiedSkills[0]?.skill || 'None'}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/admin/assessments"
            className="inline-flex items-center justify-between text-xs font-semibold text-[var(--accent)] hover:underline pt-2 border-t border-[var(--border-color)]"
          >
            <span>View assessment attempts</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </GlassCard>
      </div>

      {/* Assessment Question Bank Telemetry Card (Requirements #24 & #27) */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Assessment Question Bank
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Persistent repository of verified technical questions consumed by candidate assessments.
            </p>
          </div>

          <Link
            href="/admin/assessments?tab=questions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold shadow-md transition-all self-start sm:self-auto"
          >
            <Layers className="w-3.5 h-3.5" />
            Manage Question Bank
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Total Questions
            </span>
            <div className="text-2xl font-black text-[var(--text-primary)] mt-1">
              {s.questionBankStats.totalQuestions}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Active Questions
            </span>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {s.questionBankStats.activeQuestions}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Inactive Questions
            </span>
            <div className="text-2xl font-black text-slate-400 mt-1">
              {s.questionBankStats.inactiveQuestions}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              Skills Covered
            </span>
            <div className="text-2xl font-black text-violet-400 mt-1">
              {s.questionBankStats.skillsCovered}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Recent Activity: ONLY IF REAL DATABASE AUDIT EVENTS EXIST (Requirements #1, #25, #27) */}
      {s.recentActivities && s.recentActivities.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Recent Activity
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Audit events recorded in database.
              </p>
            </div>
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {s.recentActivities.map((act) => (
              <div key={act.id} className="py-3 flex items-start justify-between gap-3 text-left">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent)] mt-0.5 shrink-0">
                    {act.type.includes('resume') ? (
                      <FileSearch className="w-4 h-4 text-[var(--accent)]" />
                    ) : act.type.includes('skill') || act.type.includes('assessment') ? (
                      <Award className="w-4 h-4 text-amber-400" />
                    ) : act.type.includes('job') ? (
                      <Briefcase className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                        {act.userName || 'Name not provided'}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-wider px-2 py-0.5 rounded-md bg-[var(--accent)]/10">
                        {act.title}
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {act.description}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] shrink-0 font-mono">
                  {act.timestamp}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
