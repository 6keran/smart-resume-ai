'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Plus,
  Trash2,
  ArrowRight,
  ShieldCheck,
  Award,
  Clock,
  HelpCircle,
  FileCheck,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  ListTodo,
  FolderGit2,
} from 'lucide-react';
import { useCareer } from '@/context/CareerContext';
import { SupportedSkill, UserSkill } from '@/types/skills';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { GlassCard } from '@/components/ui/GlassCard';

export default function SkillVerificationPage() {
  const { skills, addSkill, removeSkill, claimSkill } = useCareer();

  const [activeTab, setActiveTab] = useState<'skills' | 'roadmap'>('skills');
  const [roadmapData, setRoadmapData] = useState<any>(null);
  const [isLoadingRoadmap, setIsLoadingRoadmap] = useState(false);
  const [targetRoadmapRole, setTargetRoadmapRole] = useState('Full Stack Developer');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [skillToRemove, setSkillToRemove] = useState<UserSkill | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle URL query or hash params on mount (e.g., ?tab=roadmap or #roadmap)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      const hashParam = window.location.hash;
      if (tabParam === 'roadmap' || hashParam === '#roadmap') {
        setActiveTab('roadmap');
        loadRoadmap();
      }
    }
  }, []);

  // Load roadmap when switching to roadmap tab
  const loadRoadmap = async (role?: string) => {
    setIsLoadingRoadmap(true);
    try {
      const url = role
        ? `/api/career/roadmap?targetRole=${encodeURIComponent(role)}`
        : '/api/career/roadmap';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.roadmap) {
          setRoadmapData(data.roadmap);
          if (data.roadmap.target_role) {
            setTargetRoadmapRole(data.roadmap.target_role);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load roadmap', err);
    } finally {
      setIsLoadingRoadmap(false);
    }
  };

  const handleToggleStep = async (milestoneIdx: number, stepIdx: number, currentCompleted: boolean) => {
    if (!roadmapData) return;
    const newCompleted = !currentCompleted;

    // Optimistic UI update
    const updated = JSON.parse(JSON.stringify(roadmapData));
    if (updated.roadmap_data?.milestones?.[milestoneIdx]?.steps?.[stepIdx]) {
      updated.roadmap_data.milestones[milestoneIdx].steps[stepIdx].completed = newCompleted;
      setRoadmapData(updated);
    }

    try {
      await fetch('/api/career/roadmap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmapId: roadmapData.id,
          milestoneIndex: milestoneIdx,
          stepIndex: stepIdx,
          completed: newCompleted,
        }),
      });
    } catch (err) {
      console.error('Failed to update step', err);
    }
  };

  // Form states for Add Skill
  const [selectedSkill, setSelectedSkill] = useState<SupportedSkill>('React');
  const [selectedCategory, setSelectedCategory] = useState<UserSkill['category']>('Frontend');
  const [claimDirectly, setClaimDirectly] = useState(true);

  const allSupportedSkills: { name: SupportedSkill; category: UserSkill['category'] }[] = [
    { name: 'Python', category: 'Programming' },
    { name: 'JavaScript', category: 'Programming' },
    { name: 'Java', category: 'Programming' },
    { name: 'C++', category: 'Programming' },
    { name: 'C#', category: 'Programming' },
    { name: 'React', category: 'Frontend' },
    { name: 'SQL', category: 'Database' },
    { name: 'Machine Learning', category: 'AI / Data' },
    { name: 'Data Analysis', category: 'AI / Data' },
    { name: 'Git', category: 'Cloud & DevOps' },
    { name: 'AWS', category: 'Cloud & DevOps' },
  ];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addSkill(selectedSkill, selectedCategory, claimDirectly);
    setIsAddModalOpen(false);
    setToast({
      type: 'success',
      message: `${selectedSkill} was added to your skills.`,
    });
  };

  const handleConfirmRemove = async () => {
    if (!skillToRemove || isDeleting) return;

    setIsDeleting(true);
    const targetSkill = skillToRemove;

    try {
      const res = await removeSkill(targetSkill.id);
      setIsDeleting(false);

      if (res && res.success) {
        setSkillToRemove(null);
        setToast({
          type: 'success',
          message: `${targetSkill.name} was successfully removed.`,
        });
      } else {
        setToast({
          type: 'error',
          message: res?.error || `Failed to remove ${targetSkill.name}. Please try again.`,
        });
      }
    } catch {
      setIsDeleting(false);
      setToast({
        type: 'error',
        message: `An unexpected error occurred while removing ${targetSkill.name}.`,
      });
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="bento-card p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/15 border border-[var(--accent)]/30 text-xs font-semibold text-[var(--accent)]">
            <Award className="w-3.5 h-3.5" />
            <span>Technical Proficiency Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Skill Assessments
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            Test your proficiency across key technical topics and track your assessment results.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="btn-ink-pill h-[42px] px-5 shadow-sm active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard variant="bento" className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div className="text-left space-y-1">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Timed Questions</h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              10 curated questions spanning code output, debugging, and practical concepts.
            </p>
          </div>
        </GlassCard>

        <GlassCard variant="bento" className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div className="text-left space-y-1">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Passing Benchmark</h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Score 7/10 (70%) or higher to demonstrate subject proficiency.
            </p>
          </div>
        </GlassCard>

        <GlassCard variant="bento" className="p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-left space-y-1">
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Profile Records</h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Assessment scores and completion dates are saved to your profile dashboard.
            </p>
          </div>
        </GlassCard>
      </div>

      {/* Dual Tab Mode Switcher */}
      <div className="flex items-center gap-2 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] self-start shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'skills'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          My Skills & Assessments
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('roadmap');
            if (!roadmapData) loadRoadmap();
          }}
          className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'roadmap'
              ? 'bg-[var(--accent)] text-white shadow-xs'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Learning Roadmap</span>
        </button>
      </div>

      {/* ─── TAB 1: MY SKILLS & DIRECTORY ─────────────────────────── */}
      {activeTab === 'skills' && (
        <div className="space-y-8">
          {/* MY SKILLS SECTION */}
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">My Skills</h2>
                <p className="text-xs text-[var(--text-secondary)]">
                  Manage your skills and launch technical assessments.
                </p>
              </div>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Total: {skills.length} skills
              </span>
            </div>

            {skills.length === 0 ? (
              <GlassCard className="p-8 text-center space-y-3">
                <Award className="w-8 h-8 text-[var(--text-secondary)] mx-auto opacity-50" />
                <p className="text-sm font-semibold text-[var(--text-primary)]">No skills added yet</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Add skills from the directory below to take assessments.
                </p>
              </GlassCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skills.map((userSkill) => {
                  const isVerified = userSkill.status === 'verified';

                  return (
                    <GlassCard key={userSkill.id} variant="bento" className="p-5 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <SkillBadge
                            skill={userSkill.name}
                            status={userSkill.status}
                            score={userSkill.score}
                          />
                          <button
                            type="button"
                            onClick={() => setSkillToRemove(userSkill)}
                            className="p-1 rounded text-[var(--text-secondary)] hover:text-rose-500 transition-colors cursor-pointer"
                            title="Remove skill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-[11px] text-[var(--text-secondary)]">Category</span>
                          <span className="text-[11px] font-medium text-[var(--text-primary)]">
                            {userSkill.category}
                          </span>
                        </div>

                        {userSkill.verifiedDate && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-[var(--text-secondary)]">Verified On</span>
                            <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                              {userSkill.verifiedDate}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between gap-2">
                        {isVerified && userSkill.certificateId ? (
                          <Link
                            href={`/skills/certificate/${userSkill.certificateId}`}
                            className="btn-secondary btn-sm w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                            View Certificate
                          </Link>
                        ) : (
                          <Link
                            href={`/skills/assess/${encodeURIComponent(userSkill.name)}`}
                            className="btn-primary btn-sm w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
                          >
                            <span>Take Assessment</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* ALL SUPPORTED SKILLS DIRECTORY */}
          <div id="skills-directory" className="space-y-4 text-left pt-6 border-t border-[var(--border-color)]">
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Explore Supported Technical Skills
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Smart Resume AI currently provides full assessment banks for 11 core industry skills. Select any skill to take a proctored assessment.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {allSupportedSkills.map((sk) => {
                const isUserSkill = skills.some((s) => s.name === sk.name);
                return (
                  <div
                    key={sk.name}
                    className="p-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] backdrop-blur-xl shadow-xs flex flex-col justify-between gap-3.5 text-xs transition-all hover:-translate-y-0.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-[var(--text-primary)]">{sk.name}</h4>
                        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">{sk.category}</p>
                      </div>
                      {isUserSkill ? (
                        <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20 shrink-0">
                          Added
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            addSkill(sk.name, sk.category, true);
                            setToast({
                              type: 'success',
                              message: `${sk.name} added to your profile.`,
                            });
                          }}
                          className="p-1.5 rounded-xl bg-[var(--glass-bg-elevated)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-secondary)] border border-[var(--glass-border)] transition-colors cursor-pointer shrink-0"
                          title={`Add ${sk.name} to My Skills`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[var(--border-color)]">
                      <Link
                        href={`/skills/assess/${encodeURIComponent(sk.name)}`}
                        className="btn-primary btn-sm w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold shadow-sm cursor-pointer"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Take Assessment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 2: CAREER LEARNING ROADMAP ──────────────────────── */}
      {activeTab === 'roadmap' && (
        <div className="space-y-6 text-left">
          {/* Roadmap Controls Header */}
          <div className="p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
                PERSONALIZED CURRICULUM
              </span>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">
                10-Week Roadmap for {targetRoadmapRole}
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Weekly milestones mapped to verified YouTube masterclasses and proctored certification checkpoints.
              </p>
            </div>

            {/* Quick Switch Role Pills */}
            <div className="flex flex-wrap gap-1.5 shrink-0">
              {[
                'Full Stack Developer',
                'Frontend Developer',
                'Backend Developer',
                'Data Scientist',
                'DevOps Engineer',
              ].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    setTargetRoadmapRole(role);
                    loadRoadmap(role);
                  }}
                  className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-colors border cursor-pointer ${
                    targetRoadmapRole === role
                      ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent)]/30 font-bold'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {isLoadingRoadmap ? (
            <div className="p-12 text-center text-xs text-[var(--text-muted)]">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[var(--accent)]" />
              Loading your personalized learning roadmap...
            </div>
          ) : !roadmapData?.roadmap_data?.milestones ? (
            <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
              No roadmap loaded yet. Click any role above to generate.
            </div>
          ) : (
            <div className="space-y-6">
              {roadmapData.roadmap_data.milestones.map((milestone: any, mIdx: number) => {
                const totalSteps = milestone.steps?.length || 0;
                const completedSteps = (milestone.steps || []).filter((s: any) => s.completed).length;
                const percentDone = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

                return (
                  <GlassCard
                    key={milestone.id || mIdx}
                    className="p-6 sm:p-7 rounded-xl border border-[var(--border-color)] space-y-5"
                  >
                    {/* Milestone Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                            {milestone.phase || `Phase ${mIdx + 1}`}
                          </span>
                          <span className="text-xs font-mono text-[var(--text-muted)]">
                            ~{milestone.estimatedWeeks || 2} weeks
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-[var(--text-primary)] mt-1">
                          {milestone.title}
                        </h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                          {milestone.description}
                        </p>
                      </div>

                      {/* Progress Tag */}
                      <span className="text-xs font-mono font-bold px-3 py-1 rounded-full border bg-[var(--bg-secondary)] border-[var(--border-color)] shrink-0 self-start sm:self-center">
                        {completedSteps}/{totalSteps} Completed ({percentDone}%)
                      </span>
                    </div>

                    {/* Step Items */}
                    <div className="space-y-3.5">
                      {(milestone.steps || []).map((step: any, sIdx: number) => {
                        const isDone = Boolean(step.completed);

                        return (
                          <div
                            key={step.id || sIdx}
                            className={`p-4 rounded-2xl border transition-colors ${
                              isDone
                                ? 'bg-emerald-500/5 border-emerald-500/20'
                                : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--accent)]/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox */}
                              <button
                                type="button"
                                onClick={() => handleToggleStep(mIdx, sIdx, isDone)}
                                className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                                  isDone
                                    ? 'bg-emerald-500 border-emerald-500 text-white'
                                    : 'border-[var(--border-color)] hover:border-[var(--accent)] text-transparent'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </button>

                              <div className="space-y-1.5 flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <p
                                    className={`text-xs font-bold ${
                                      isDone
                                        ? 'text-[var(--text-muted)] line-through'
                                        : 'text-[var(--text-primary)]'
                                    }`}
                                  >
                                    {step.title}
                                  </p>
                                  <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                                    {step.estimatedHours || 10} study hrs
                                  </span>
                                </div>
                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                  {step.description}
                                </p>

                                {/* Assessment shortcut if applicable */}
                                {(step.assessmentSkill || step.id === 'step-cap-2' || (step.title && step.title.toLowerCase().includes('assessment'))) && (
                                  <div className="pt-1.5">
                                    <Link
                                      href={`/skills/assess/${encodeURIComponent(step.assessmentSkill || 'React')}`}
                                      className="btn-secondary btn-sm rounded-full text-[10px] py-1 px-3 inline-flex items-center gap-1.5 cursor-pointer"
                                    >
                                      <Award className="w-3 h-3 text-[var(--accent)]" />
                                      <span>Take {step.assessmentSkill || 'Technical'} Assessment</span>
                                    </Link>
                                  </div>
                                )}

                                {/* YouTube Masterclasses */}
                                {step.verifiedResources && step.verifiedResources.length > 0 && (
                                  <div className="pt-2 space-y-1.5">
                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                                      Curated Video Resources
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {step.verifiedResources.map((res: any, rIdx: number) => (
                                        <a
                                          key={rIdx}
                                          href={res.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 hover:bg-[var(--bg-secondary)] transition-colors flex items-center justify-between gap-2 group text-left"
                                        >
                                          <div className="min-w-0">
                                            <p className="text-[11px] font-bold text-[var(--text-primary)] group-hover:text-[var(--accent)] truncate transition-colors">
                                              {res.title}
                                            </p>
                                            <p className="text-[9px] font-mono text-[var(--text-muted)]">
                                              {res.channelName} • {res.duration}
                                            </p>
                                          </div>
                                          <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--accent)] shrink-0" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </GlassCard>
                );
              })}

              {/* Portfolio Project Blueprints for Students & Freshers */}
              {Array.isArray(roadmapData.roadmap_data?.portfolioProjects) && roadmapData.roadmap_data.portfolioProjects.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                        <FolderGit2 className="w-3.5 h-3.5" />
                        <span>Portfolio Project Blueprints</span>
                      </span>
                      <h3 className="text-base font-bold text-[var(--text-primary)] mt-1">
                        High-Impact Capstones for {roadmapData.target_role || 'Target Role'}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Build these recruiter-tested systems to prove production proficiency and earn bullet points for your resume.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {roadmapData.roadmap_data.portfolioProjects.map((bp: any, bpIdx: number) => (
                      <GlassCard
                        key={bp.id || bpIdx}
                        className="p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                              {bp.difficulty} Blueprint
                            </span>
                            <span className="text-[10px] font-mono text-[var(--text-muted)]">
                              Project #{bpIdx + 1}
                            </span>
                          </div>

                          <h4 className="text-sm font-bold text-[var(--text-primary)]">
                            {bp.title}
                          </h4>

                          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            {bp.problemStatement}
                          </p>

                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                              Core Architecture Highlights
                            </span>
                            <ul className="text-[11px] text-[var(--text-secondary)] space-y-1 list-disc list-inside">
                              {bp.architectureHighlights?.map((ah: string, i: number) => (
                                <li key={i}>{ah}</li>
                              ))}
                            </ul>
                          </div>

                          {bp.techStack && bp.techStack.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {bp.techStack.map((tech: string, i: number) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]"
                                >
                                  {tech}
                                </span>
                              ))}
                            </div>
                          )}

                          {bp.suggestedResumeBullets && bp.suggestedResumeBullets.length > 0 && (
                            <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] space-y-1">
                              <span className="text-[10px] font-mono font-bold text-[var(--accent)] block">
                                Suggested Resume Bullet:
                              </span>
                              <p className="text-[11px] text-[var(--text-secondary)] italic">
                                &ldquo;{bp.suggestedResumeBullets[0]}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                          <span className="text-[10px] text-[var(--text-muted)]">
                            Ready to document?
                          </span>
                          <Link
                            href="/dashboard/profile"
                            className="text-[11px] font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Add to Career Profile</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ADD SKILL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 sm:p-7 shadow-xl space-y-5 text-left relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Add Skill To Profile</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Skill Name
                </label>
                <select
                  value={selectedSkill}
                  onChange={(e) => {
                    const val = e.target.value as SupportedSkill;
                    setSelectedSkill(val);
                    const match = allSupportedSkills.find((s) => s.name === val);
                    if (match) setSelectedCategory(match.category);
                  }}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] shadow-xs"
                >
                  {allSupportedSkills.map((sk) => (
                    <option key={sk.name} value={sk.name}>
                      {sk.name} ({sk.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--text-primary)] mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as UserSkill['category'])}
                  className="w-full p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] shadow-xs"
                >
                  <option value="Programming">Programming</option>
                  <option value="Frontend">Frontend</option>
                  <option value="Backend">Backend</option>
                  <option value="Database">Database</option>
                  <option value="AI / Data">AI / Data</option>
                  <option value="Cloud & DevOps">Cloud & DevOps</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="claim-check"
                  checked={claimDirectly}
                  onChange={(e) => setClaimDirectly(e.target.checked)}
                  className="rounded text-[var(--accent)]"
                />
                <label htmlFor="claim-check" className="text-xs text-[var(--text-primary)] cursor-pointer">
                  Claim this skill immediately (Marks as Claimed, ready for assessment)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--glass-border)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn-secondary btn-sm text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm text-xs font-semibold shadow-sm cursor-pointer"
                >
                  Add Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REMOVE SKILL CONFIRMATION MODAL */}
      {skillToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 sm:p-7 shadow-xl space-y-4 text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center border border-rose-500/20 shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Remove {skillToRemove.name} from your skills?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Are you sure you want to remove this skill? Your assessments and earned certificates will remain safely preserved.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setSkillToRemove(null)}
                className="btn-secondary btn-sm text-xs cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmRemove}
                className="btn-destructive btn-sm text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50 min-w-[110px] cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Remove</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-medium backdrop-blur-2xl bg-[var(--glass-bg-elevated)] border-[var(--glass-border)] text-[var(--text-primary)]">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
