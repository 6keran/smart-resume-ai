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
  BookOpen,
  FolderGit2,
  Wrench,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PageTransition } from '@/components/ui/MotionPrimitives';
import { findCuratedRoleProfile, type CuratedRoleProfile } from '@/lib/career/roleProfiles';

interface UserCareerSkillItem {
  id: string;
  name: string;
  category: string;
  status: string;
  source?: string;
  confirmedAt?: string;
}

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

function matchUserSkillStatus(
  targetSkill: string,
  userSkills: UserCareerSkillItem[]
): 'verified' | 'confirmed' | 'claimed' | 'missing' {
  const normalizedTarget = targetSkill.toLowerCase().trim();
  const baseTarget = normalizedTarget.replace(/\(.*?\)/g, '').trim();
  const targetTokens = normalizedTarget
    .split(/[^a-z0-9+#.]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  let best: 'verified' | 'confirmed' | 'claimed' | 'missing' = 'missing';
  const rank = { missing: 0, claimed: 1, confirmed: 2, verified: 3 } as const;

  for (const sk of userSkills) {
    const skLower = sk.name.toLowerCase().trim();
    if (!skLower) continue;

    const isMatch =
      skLower === normalizedTarget ||
      skLower === baseTarget ||
      (skLower.length >= 2 && targetTokens.includes(skLower)) ||
      (baseTarget.length >= 4 && skLower.includes(baseTarget));

    if (!isMatch) continue;

    const skState: 'verified' | 'confirmed' | 'claimed' =
      sk.status === 'verified'
        ? 'verified'
        : sk.confirmedAt || sk.status === 'confirmed'
          ? 'confirmed'
          : 'claimed';

    if (rank[skState] > rank[best]) {
      best = skState;
    }
  }
  return best;
}

export default function CareerGuidancePage() {
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [targetRole, setTargetRole] = useState('');
  const [goalSet, setGoalSet] = useState(false);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [userSkills, setUserSkills] = useState<UserCareerSkillItem[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, 'pending' | 'in_progress' | 'completed'>>({});
  const [updatingProgressKey, setUpdatingProgressKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReadiness() {
      try {
        const [readinessRes, myDataRes] = await Promise.all([
          fetch('/api/student/readiness'),
          fetch('/api/user/my-data'),
        ]);

        let resolvedRole = '';
        let resolvedGoalSet = false;

        if (myDataRes.ok) {
          const myData = await myDataRes.json();
          setUserSkills(Array.isArray(myData.skills) ? myData.skills : []);
          resolvedGoalSet = Boolean(myData.goalSet && myData.targetRole);
          resolvedRole = resolvedGoalSet ? String(myData.targetRole || '').trim() : '';
        }

        if (readinessRes.ok) {
          const data = await readinessRes.json();
          if (data.readiness) {
            setReadiness(data.readiness);
            const fallbackRole =
              data.targetRole && data.targetRole !== 'Goal not set'
                ? String(data.targetRole).trim()
                : '';
            const finalRole = resolvedRole || fallbackRole;
            setTargetRole(finalRole);
            setGoalSet(Boolean(finalRole));
            setStudentProfile(data.studentProfile || null);
            setMetrics(data.metrics || null);

            const matchedCurated = findCuratedRoleProfile(finalRole);
            if (matchedCurated) {
              const progRes = await fetch(
                `/api/career/roadmap/progress?roleSlug=${encodeURIComponent(matchedCurated.slug)}`
              );
              if (progRes.ok) {
                const progData = await progRes.json();
                const map: Record<string, 'pending' | 'in_progress' | 'completed'> = {};
                for (const item of progData.progress || []) {
                  map[`${item.itemType}:${item.itemKey}`] = item.status;
                }
                setProgressMap(map);
              }
            }
          }
        } else if (readinessRes.status === 401) {
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

  const curatedProfile: CuratedRoleProfile | null = goalSet ? findCuratedRoleProfile(targetRole) : null;

  const handleToggleRoadmapItem = async (
    itemType: 'skill' | 'project' | 'certification' | 'resource',
    itemKey: string
  ) => {
    if (!curatedProfile) return;
    const compositeKey = `${itemType}:${itemKey}`;
    const currentStatus = progressMap[compositeKey] || 'pending';
    const nextStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    setProgressMap((prev) => ({ ...prev, [compositeKey]: nextStatus }));
    setUpdatingProgressKey(compositeKey);
    try {
      const res = await fetch('/api/career/roadmap/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleSlug: curatedProfile.slug,
          itemType,
          itemKey,
          status: nextStatus,
        }),
      });
      if (!res.ok) {
        setProgressMap((prev) => ({ ...prev, [compositeKey]: currentStatus }));
      }
    } catch {
      setProgressMap((prev) => ({ ...prev, [compositeKey]: currentStatus }));
    } finally {
      setUpdatingProgressKey(null);
    }
  };

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
      <header className="bg-white rounded-2xl border border-[#E5E8ED] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Compass className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Career Intelligence Studio</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#20242B]">
              {goalSet && targetRole ? `${targetRole} Readiness Studio` : 'Career Guidance & Roadmap Studio'}
            </h1>
            <p className="text-sm text-[#626B78] leading-relaxed max-w-2xl">
              {goalSet && targetRole
                ? 'Transparent readiness breakdown and a curated career roadmap aligned to your chosen target role.'
                : 'Set your target career role to unlock a tailored roadmap, role-specific skill comparison, and goal-aligned readiness insights.'}
            </p>
          </div>
        </div>

        {studentProfile &&
        (studentProfile.graduationYear > 0 ||
          studentProfile.degree ||
          studentProfile.fieldOfStudy ||
          studentProfile.institution) ? (
          <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs space-y-1 self-start md:self-auto shrink-0">
            {studentProfile.graduationYear > 0 && (
              <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                <GraduationCap className="w-4 h-4 text-[var(--accent)]" />
                <span>Class of {studentProfile.graduationYear}</span>
              </div>
            )}
            {(studentProfile.degree || studentProfile.fieldOfStudy) && (
              <p className="text-[var(--text-secondary)]">
                {[studentProfile.degree, studentProfile.fieldOfStudy].filter(Boolean).join(' • ')}
              </p>
            )}
            {studentProfile.institution && (
              <p className="text-xs text-[var(--text-muted)] truncate max-w-[220px]">
                {studentProfile.institution}
              </p>
            )}
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
        <div className="p-16 text-center bg-white rounded-2xl border border-[#E5E8ED] shadow-sm space-y-3">
          <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin mx-auto" />
          <p className="text-sm text-[var(--text-secondary)]">
            Analyzing student profile, verified skills, and project evidence...
          </p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-[#E5E8ED] shadow-sm space-y-3">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          <Link href="/login" className="btn-primary btn-sm inline-flex items-center gap-1.5 text-xs">
            <span>Sign In</span>
          </Link>
        </div>
      ) : readiness ? (
        <>
          {!goalSet && (
            <section className="rounded-2xl border border-[#E5E8ED] bg-[#F6F7F9] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#3157C8]">
                  Goal Not Set
                </span>
                <h2 className="text-base font-bold text-[#20242B]">
                  Choose your target role to generate your career roadmap
                </h2>
                <p className="text-xs text-[#626B78] max-w-xl leading-relaxed">
                  We never assume your career field automatically. Set a target role across engineering, data, business, marketing, finance, HR, or design to compare your verified skills and track milestones.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  href="/onboarding"
                  className="px-4 py-2 rounded-xl bg-[#3157C8] text-white text-xs font-semibold hover:opacity-95 transition-opacity inline-flex items-center gap-1.5"
                >
                  <span>Set Career Goal</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/dashboard/my-data"
                  className="px-4 py-2 rounded-xl bg-white border border-[#E5E8ED] text-[#20242B] text-xs font-semibold hover:border-[#3157C8]/40 transition-colors"
                >
                  My Career Data
                </Link>
              </div>
            </section>
          )}

          {/* ─── 2. OVERALL READINESS SCORE GAUGE ─────────────────────── */}
          <section className="bg-white rounded-2xl border border-[#E5E8ED] p-6 sm:p-8 space-y-6 shadow-sm">
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

          {/* ─── 2B. GOAL-BASED CURATED ROADMAP ───────────────────────── */}
          {goalSet && curatedProfile && (
            <section className="bg-white rounded-2xl border border-[#E5E8ED] p-6 sm:p-8 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E8ED]">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#F6F7F9] border border-[#E5E8ED] text-[#3157C8] text-[11px] font-bold">
                      Suggested for {curatedProfile.title}
                    </span>
                    <span className="text-[11px] font-medium text-[#626B78]">
                      Domain: {curatedProfile.domain}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-[#20242B]">
                    Goal-Aligned Career Roadmap
                  </h2>
                  <p className="text-xs text-[#626B78] max-w-2xl leading-relaxed">
                    {curatedProfile.summary} Role suggestions are curated benchmarks matched against your confirmed and verified skills.
                  </p>
                </div>
                <Link
                  href="/dashboard/my-data"
                  className="px-3.5 py-2 rounded-xl border border-[#E5E8ED] bg-[#F6F7F9] text-xs font-semibold text-[#20242B] hover:border-[#3157C8]/40 transition-colors shrink-0 self-start sm:self-auto"
                >
                  Change Goal or Skills
                </Link>
              </div>

              {/* Core Skills & Recommended Tools Checklist */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#3157C8]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#20242B]">
                        Core Role Skills
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#626B78]">
                      Suggested for {curatedProfile.title}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {curatedProfile.coreSkills.map((skill) => {
                      const key = `skill:${skill}`;
                      const checked = progressMap[key] === 'completed';
                      const userStatus = matchUserSkillStatus(skill, userSkills);
                      return (
                        <div
                          key={skill}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-[#E5E8ED]"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleRoadmapItem('skill', skill)}
                            disabled={updatingProgressKey === key}
                            className="flex items-center gap-2.5 text-left text-xs text-[#20242B] font-medium cursor-pointer flex-1 min-w-0"
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                checked
                                  ? 'bg-[#3157C8] border-[#3157C8] text-white'
                                  : 'bg-white border-[#CBD2DD]'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" />}
                            </span>
                            <span className={checked ? 'line-through text-[#626B78]' : 'truncate'}>
                              {skill}
                            </span>
                          </button>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 border ${
                              userStatus === 'verified'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : userStatus === 'confirmed'
                                  ? 'bg-[#F6F7F9] text-[#3157C8] border-[#3157C8]/25'
                                  : userStatus === 'claimed'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-[#F6F7F9] text-[#626B78] border-[#E5E8ED]'
                            }`}
                          >
                            {userStatus === 'verified'
                              ? 'Verified'
                              : userStatus === 'confirmed'
                                ? 'Confirmed'
                                : userStatus === 'claimed'
                                  ? 'Claimed'
                                  : 'Gap'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recommended Tools */}
                <div className="p-5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-[#3157C8]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#20242B]">
                        Standard Tools &amp; Stack
                      </h3>
                    </div>
                    <span className="text-[11px] text-[#626B78]">
                      Suggested for {curatedProfile.title}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {curatedProfile.recommendedTools.map((tool) => {
                      const key = `skill:${tool}`;
                      const checked = progressMap[key] === 'completed';
                      const userStatus = matchUserSkillStatus(tool, userSkills);
                      return (
                        <div
                          key={tool}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-[#E5E8ED]"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleRoadmapItem('skill', tool)}
                            disabled={updatingProgressKey === key}
                            className="flex items-center gap-2.5 text-left text-xs text-[#20242B] font-medium cursor-pointer flex-1 min-w-0"
                          >
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                checked
                                  ? 'bg-[#3157C8] border-[#3157C8] text-white'
                                  : 'bg-white border-[#CBD2DD]'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" />}
                            </span>
                            <span className={checked ? 'line-through text-[#626B78]' : 'truncate'}>
                              {tool}
                            </span>
                          </button>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold shrink-0 border ${
                              userStatus === 'verified'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : userStatus === 'confirmed'
                                  ? 'bg-[#F6F7F9] text-[#3157C8] border-[#3157C8]/25'
                                  : userStatus === 'claimed'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-[#F6F7F9] text-[#626B78] border-[#E5E8ED]'
                            }`}
                          >
                            {userStatus === 'verified'
                              ? 'Verified'
                              : userStatus === 'confirmed'
                                ? 'Confirmed'
                                : userStatus === 'claimed'
                                  ? 'Claimed'
                                  : 'Not added'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Suggested Portfolio Projects */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-[#3157C8]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#20242B]">
                      Suggested Portfolio Projects
                    </h3>
                  </div>
                  <Link
                    href="/projects"
                    className="text-xs font-semibold text-[#3157C8] hover:underline inline-flex items-center gap-1"
                  >
                    <span>Open Project Mentor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {curatedProfile.projectIdeas.map((proj) => {
                    const key = `project:${proj.id}`;
                    const checked = progressMap[key] === 'completed';
                    return (
                      <div
                        key={proj.id}
                        className="p-4 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleRoadmapItem('project', proj.id)}
                              className="flex items-start gap-2 text-left cursor-pointer"
                            >
                              <span
                                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  checked
                                    ? 'bg-[#3157C8] border-[#3157C8] text-white'
                                    : 'bg-white border-[#CBD2DD]'
                                }`}
                              >
                                {checked && <Check className="w-3 h-3" />}
                              </span>
                              <span className="text-xs font-bold text-[#20242B] leading-snug">
                                {proj.title}
                              </span>
                            </button>
                            <span className="px-2 py-0.5 rounded bg-white border border-[#E5E8ED] text-[10px] font-semibold text-[#626B78] shrink-0">
                              {proj.difficulty}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#626B78] leading-relaxed pl-6">
                            {proj.summary}
                          </p>
                        </div>
                        <div className="pl-6 flex flex-wrap gap-1.5 pt-1">
                          {proj.skillsPracticed.map((sk) => (
                            <span
                              key={sk}
                              className="px-2 py-0.5 rounded bg-white border border-[#E5E8ED] text-[10px] text-[#20242B]"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recognized Certifications & Verified Learning Resources */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-3">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#3157C8]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#20242B]">
                      Recognized Industry Certifications
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {curatedProfile.certifications.map((cert) => {
                      const key = `certification:${cert.name}`;
                      const checked = progressMap[key] === 'completed';
                      return (
                        <div
                          key={cert.name}
                          className="p-3 rounded-lg bg-white border border-[#E5E8ED] space-y-1"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleRoadmapItem('certification', cert.name)}
                              className="flex items-start gap-2 text-left cursor-pointer"
                            >
                              <span
                                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  checked
                                    ? 'bg-[#3157C8] border-[#3157C8] text-white'
                                    : 'bg-white border-[#CBD2DD]'
                                }`}
                              >
                                {checked && <Check className="w-3 h-3" />}
                              </span>
                              <div>
                                <span className="text-xs font-bold text-[#20242B] block">
                                  {cert.name}
                                </span>
                                <span className="text-[11px] text-[#626B78] block">
                                  Provider: {cert.provider}
                                </span>
                              </div>
                            </button>
                            {cert.url && (
                              <a
                                href={cert.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-semibold text-[#3157C8] hover:underline inline-flex items-center gap-1 shrink-0"
                              >
                                <span>Official</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          {cert.notes && (
                            <p className="text-[11px] text-[#626B78] pl-6">{cert.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#3157C8]" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#20242B]">
                      Verified Learning References
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {curatedProfile.learningResources.map((res) => {
                      const itemKey = res.url || res.title;
                      const key = `resource:${itemKey}`;
                      const checked = progressMap[key] === 'completed';
                      return (
                        <div
                          key={res.title}
                          className="p-3 rounded-lg bg-white border border-[#E5E8ED] flex items-start justify-between gap-3"
                        >
                          <button
                            type="button"
                            onClick={() => handleToggleRoadmapItem('resource', itemKey)}
                            className="flex items-start gap-2 text-left cursor-pointer flex-1 min-w-0"
                          >
                            <span
                              className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                checked
                                  ? 'bg-[#3157C8] border-[#3157C8] text-white'
                                  : 'bg-white border-[#CBD2DD]'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" />}
                            </span>
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-[#20242B] block truncate">
                                {res.title}
                              </span>
                              <span className="text-[11px] text-[#626B78] block">
                                {res.provider} • Verified {res.lastVerified}
                              </span>
                            </div>
                          </button>
                          {res.url && (
                            <a
                              href={res.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-md bg-[#F6F7F9] border border-[#E5E8ED] text-[11px] font-semibold text-[#3157C8] hover:border-[#3157C8]/40 inline-flex items-center gap-1 shrink-0"
                            >
                              <span>Open</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}

          {goalSet && !curatedProfile && targetRole && (
            <section className="bg-white rounded-2xl border border-[#E5E8ED] p-6 space-y-3 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#3157C8]">
                    Custom Career Goal
                  </span>
                  <h2 className="text-base font-bold text-[#20242B]">
                    Target Role: {targetRole}
                  </h2>
                  <p className="text-xs text-[#626B78] mt-1">
                    No pre-built checklist is cataloged for this custom title yet. Your skills, resume ATS checks, and project mentor continue tracking your evidence honestly without substituting another field&apos;s roadmap.
                  </p>
                </div>
                <Link
                  href="/dashboard/my-data"
                  className="px-3.5 py-2 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-xs font-semibold text-[#20242B] shrink-0"
                >
                  Update Goal
                </Link>
              </div>
            </section>
          )}

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
            <section className="bg-white rounded-2xl border border-[#E5E8ED] p-6 sm:p-7 space-y-4 shadow-sm">
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
                              ? 'bg-red-500/10 text-[#C43D43]'
                              : 'bg-amber-500/10 text-[#A96812]'
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
