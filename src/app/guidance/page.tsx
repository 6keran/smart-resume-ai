'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Sparkles,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Code2,
  FileText,
  Play,
  Briefcase,
  ShieldCheck,
  Award,
  Loader2,
  Layers,
  ChevronRight,
  Check,
  Target,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageTransition } from '@/components/ui/MotionPrimitives';

interface ReadinessQuadrant {
  name: string;
  score: number;
  weight: number;
  level: 'Novice' | 'Developing' | 'Proficient' | 'Job-Ready';
  summary: string;
  strengths: string[];
  recommendations: string[];
}

interface ReadinessData {
  overallScore: number;
  overallLevel: 'Novice' | 'Developing' | 'Competitive' | 'Career Ready';
  summary: string;
  quadrants: {
    technicalCompetency: ReadinessQuadrant;
    projectEvidence: ReadinessQuadrant;
    resumeAts: ReadinessQuadrant;
    interviewFluency: ReadinessQuadrant;
  };
  keyStrengths: string[];
  priorityActions: Array<{
    title: string;
    description: string;
    href: string;
    impact: 'high' | 'medium';
    actionText: string;
  }>;
}

export default function CareerGuidancePage() {
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [targetRole, setTargetRole] = useState('Graduate Software Engineer');
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReadiness() {
      try {
        const res = await fetch('/api/student/readiness');
        if (res.ok) {
          const data = await res.json();
          if (data.readiness) {
            setReadiness(data.readiness);
            setTargetRole(data.targetRole || 'Graduate Software Engineer');
            setStudentProfile(data.studentProfile || null);
            setMetrics(data.metrics || null);
          }
        } else if (res.status === 401) {
          setError('Please sign in to access your Career Intelligence Studio.');
        } else {
          setError('Could not calculate career readiness at this time.');
        }
      } catch (err: any) {
        console.error('Career guidance fetch error:', err);
        setError('Connection error while loading career intelligence.');
      } finally {
        setIsLoading(false);
      }
    }
    loadReadiness();
  }, []);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Career Ready':
      case 'Job-Ready':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'Competitive':
      case 'Proficient':
        return 'text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/20';
      case 'Developing':
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <PageTransition className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 text-left pb-20">
      {/* ─── 1. STUDIO HEADER ────────────────────────────────────────── */}
      <header className="bento-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-md shadow-[var(--accent)]/20">
            <Compass className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Career Intelligence Studio</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
              {targetRole} Readiness Studio
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              Transparent, explainable qualification scoring across technical competencies, academic projects, resume ATS extraction, and mock interview performance.
            </p>
          </div>
        </div>

        {studentProfile ? (
          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs space-y-1 self-start md:self-auto shrink-0">
            <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
              <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
              <span>Class of {studentProfile.graduationYear}</span>
            </div>
            <p className="text-[var(--text-secondary)]">
              {studentProfile.degree} • {studentProfile.fieldOfStudy}
            </p>
            <p className="text-[11px] text-[var(--text-muted)] truncate max-w-[220px]">
              {studentProfile.institution}
            </p>
          </div>
        ) : (
          <Link
            href="/dashboard/profile"
            className="btn-secondary btn-sm flex items-center gap-1.5 text-xs font-semibold shrink-0"
          >
            <GraduationCap className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>Connect College Profile</span>
          </Link>
        )}
      </header>

      {isLoading ? (
        <div className="p-16 text-center bento-card space-y-3">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
          <p className="text-xs text-[var(--text-secondary)]">
            Analyzing student profile, verified skills, and project evidence...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bento-card space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-xs text-[var(--text-secondary)]">{error}</p>
          <Link href="/login" className="btn-primary btn-sm inline-flex items-center gap-1.5 text-xs">
            <span>Sign In</span>
          </Link>
        </div>
      ) : readiness ? (
        <>
          {/* ─── 2. OVERALL READINESS SCORE GAUGE ─────────────────────── */}
          <section className="bento-card p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--text-muted)]">
                  Consolidated Career Standing
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                  Overall Career Launch Readiness
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)]">
                  {readiness.overallScore}
                  <span className="text-base text-[var(--text-muted)] font-normal"> / 100</span>
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getLevelColor(readiness.overallLevel)}`}>
                  {readiness.overallLevel}
                </span>
              </div>
            </div>

            {/* Progress Bar with Quadrant Segments */}
            <div className="space-y-2">
              <div className="w-full h-3 rounded-full bg-[var(--bg-secondary)] overflow-hidden flex">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${readiness.quadrants.technicalCompetency.score * 0.25}%` }}
                  title="Technical Competency (25%)"
                />
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${readiness.quadrants.projectEvidence.score * 0.25}%` }}
                  title="Project Evidence (25%)"
                />
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${readiness.quadrants.resumeAts.score * 0.25}%` }}
                  title="Resume ATS (25%)"
                />
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{ width: `${readiness.quadrants.interviewFluency.score * 0.25}%` }}
                  title="Interview Fluency (25%)"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Technical ({readiness.quadrants.technicalCompetency.score})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>Projects ({readiness.quadrants.projectEvidence.score})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Resume ATS ({readiness.quadrants.resumeAts.score})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Interview Fluency ({readiness.quadrants.interviewFluency.score})</span>
                </span>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {readiness.summary}
            </p>
          </section>

          {/* ─── 3. THE 4 EXPLAINABLE QUADRANTS ───────────────────────── */}
          <section className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              4-Quadrant Readiness Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Quadrant 1: Technical Competency */}
              <GlassCard className="p-6 space-y-4 border border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-blue-500" />
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      {readiness.quadrants.technicalCompetency.name}
                    </h3>
                  </div>
                  <span className="font-extrabold text-base text-[var(--text-primary)]">
                    {readiness.quadrants.technicalCompetency.score}/100
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {readiness.quadrants.technicalCompetency.summary}
                </p>
                <div className="space-y-1.5 text-[11px] pt-2 border-t border-[var(--border-color)]">
                  <span className="font-semibold text-[var(--text-primary)] block">Demonstrated Strengths:</span>
                  {readiness.quadrants.technicalCompetency.strengths.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[var(--text-secondary)]">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <Link
                    href="/skills"
                    className="w-full btn-secondary btn-sm flex items-center justify-between text-xs font-semibold cursor-pointer"
                  >
                    <span>Verify Skills in Assessments</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </GlassCard>

              {/* Quadrant 2: Project Evidence */}
              <GlassCard className="p-6 space-y-4 border border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-500" />
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      {readiness.quadrants.projectEvidence.name}
                    </h3>
                  </div>
                  <span className="font-extrabold text-base text-[var(--text-primary)]">
                    {readiness.quadrants.projectEvidence.score}/100
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {readiness.quadrants.projectEvidence.summary}
                </p>
                <div className="space-y-1.5 text-[11px] pt-2 border-t border-[var(--border-color)]">
                  <span className="font-semibold text-[var(--text-primary)] block">Practical Highlights:</span>
                  {readiness.quadrants.projectEvidence.strengths.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[var(--text-secondary)]">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <Link
                    href="/dashboard/profile"
                    className="w-full btn-secondary btn-sm flex items-center justify-between text-xs font-semibold cursor-pointer"
                  >
                    <span>Manage Portfolio Projects</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </GlassCard>

              {/* Quadrant 3: Resume ATS */}
              <GlassCard className="p-6 space-y-4 border border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-500" />
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      {readiness.quadrants.resumeAts.name}
                    </h3>
                  </div>
                  <span className="font-extrabold text-base text-[var(--text-primary)]">
                    {readiness.quadrants.resumeAts.score}/100
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {readiness.quadrants.resumeAts.summary}
                </p>
                <div className="space-y-1.5 text-[11px] pt-2 border-t border-[var(--border-color)]">
                  <span className="font-semibold text-[var(--text-primary)] block">ATS Evaluation:</span>
                  {readiness.quadrants.resumeAts.strengths.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[var(--text-secondary)]">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <Link
                    href="/builder"
                    className="flex-1 btn-secondary btn-sm flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <span>Builder</span>
                  </Link>
                  <Link
                    href="/improver"
                    className="flex-1 btn-primary btn-sm flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <span>Tailor Draft</span>
                  </Link>
                </div>
              </GlassCard>

              {/* Quadrant 4: Interview Fluency */}
              <GlassCard className="p-6 space-y-4 border border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-amber-500" />
                    <h3 className="font-bold text-sm text-[var(--text-primary)]">
                      {readiness.quadrants.interviewFluency.name}
                    </h3>
                  </div>
                  <span className="font-extrabold text-base text-[var(--text-primary)]">
                    {readiness.quadrants.interviewFluency.score}/100
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  {readiness.quadrants.interviewFluency.summary}
                </p>
                <div className="space-y-1.5 text-[11px] pt-2 border-t border-[var(--border-color)]">
                  <span className="font-semibold text-[var(--text-primary)] block">Interview Observations:</span>
                  {readiness.quadrants.interviewFluency.strengths.map((s, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-[var(--text-secondary)]">
                      <Check className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
                <div className="pt-2">
                  <Link
                    href="/interview-prep"
                    className="w-full btn-primary btn-sm flex items-center justify-between text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <span>Launch AI Mock Interview</span>
                    <Play className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </GlassCard>
            </div>
          </section>

          {/* ─── 4. HIGH-IMPACT PRIORITY ACTIONS ──────────────────────── */}
          {readiness.priorityActions.length > 0 && (
            <section className="bento-card p-6 sm:p-7 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-color)]">
                <Target className="w-4 h-4 text-[var(--accent)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">
                  Recommended High-Impact Actions
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {readiness.priorityActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[var(--bg-secondary)]/70 border border-[var(--border-color)] flex flex-col justify-between space-y-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-[var(--text-primary)]">
                          {action.title}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            action.impact === 'high'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {action.impact} impact
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] text-[11px] leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                    <Link
                      href={action.href}
                      className="btn-primary btn-sm inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs"
                    >
                      <span>{action.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : null}
    </PageTransition>
  );
}
