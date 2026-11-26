'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [targetRoadmapRole, setTargetRoadmapRole] = useState('');
  const [savingStep, setSavingStep] = useState(false);
  const roadmapRequest = useRef<AbortController | null>(null);

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

  const loadRoadmap = useCallback(async (role?: string) => {
    roadmapRequest.current?.abort();
    const controller = new AbortController();
    roadmapRequest.current = controller;
    setIsLoadingRoadmap(true);
    try {
      const url = role
        ? `/api/career/roadmap?targetRole=${encodeURIComponent(role)}`
        : '/api/career/roadmap';
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error('Roadmap unavailable');
      const data = await res.json();
      if (controller.signal.aborted) return;
      setRoadmapData(data.roadmap);
      setTargetRoadmapRole(data.roadmap?.target_role || '');
    } catch {
      if (!controller.signal.aborted) setToast({ type: 'error', message: 'Couldn’t load that roadmap. Try selecting the role again.' });
    } finally {
      if (!controller.signal.aborted) setIsLoadingRoadmap(false);
    }
  }, []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'roadmap' || window.location.hash === '#roadmap') {
      setActiveTab('roadmap');
      void loadRoadmap();
    }
    return () => roadmapRequest.current?.abort();
  }, [loadRoadmap]);

  const handleToggleStep = async (milestoneIdx: number, stepIdx: number, currentCompleted: boolean) => {
    if (!roadmapData || savingStep) return;
    setSavingStep(true);
    try {
      const response = await fetch('/api/career/roadmap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roadmapId: roadmapData.id,
          milestoneIndex: milestoneIdx,
          stepIndex: stepIdx,
          completed: !currentCompleted,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success || data.roadmap?.id !== roadmapData.id) throw new Error('Step update failed');
      setRoadmapData((current: typeof roadmapData) => current?.id === data.roadmap.id ? data.roadmap : current);
    } catch {
      setToast({ type: 'error', message: 'Couldn’t save your progress. Try checking the step again.' });
    } finally {
      setSavingStep(false);
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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 text-[var(--text-primary)]">
      {/* Page Header */}
      <div className="reference-workspace-heading flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-xs font-semibold text-[var(--accent)]">
            <Award className="w-3.5 h-3.5" />
            <span>Technical Proficiency Verification</span>
          </div>
          <h1 className="text-[28px] sm:text-[30px] font-bold text-[var(--text-primary)] tracking-tight">
            Skill Assessments
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            Test your proficiency across key technical topics and track your assessment results.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold shadow-sm inline-flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Skill</span>
        </button>
      </div>

      {/* Expandable Assessment Instructions & Scoring Rules */}
      <details className="reference-panel group bg-white rounded-2xl border border-[var(--border-color)] p-5 shadow-sm text-left">
        <summary className="font-bold text-[16px] text-[var(--text-primary)] cursor-pointer list-none flex items-center justify-between">
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
            Assessment Instructions &amp; Scoring Rules
          </span>
          <span className="text-[13px] text-[var(--accent)] font-semibold group-open:hidden">View Rules</span>
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--border-color)]">
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1">
            <span className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[var(--accent)]" />
              Timed Questions
            </span>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              10 curated multiple-choice questions spanning syntax, debugging, and real-world architectures with 20 minutes limit.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1">
            <span className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#16845B]" />
              70% Passing Benchmark
            </span>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Score at least 7 of 10 to demonstrate verified competency and receive an official credential.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-1">
            <span className="text-[14px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[var(--accent)]" />
              Verified Profile Record
            </span>
            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Passed assessment scores and certificates automatically display on your public career profile.
            </p>
          </div>
        </div>
      </details>

      {/* Dual Tab Mode Switcher */}
      <div className="flex items-center gap-2 p-1 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] self-start shadow-xs relative">
        <button
          type="button"
          onClick={() => setActiveTab('skills')}
          className={`relative px-5 py-2 rounded-md text-[14px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'skills'
              ? 'text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {activeTab === 'skills' && (
            <motion.div
              layoutId="skills-tab-pill"
              className="absolute inset-0 bg-white rounded-md shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <span className="relative z-10">My Skills &amp; Assessments</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('roadmap');
            if (!roadmapData) loadRoadmap();
          }}
          className={`relative px-5 py-2 rounded-md text-[14px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'roadmap'
              ? 'text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          {activeTab === 'roadmap' && (
            <motion.div
              layoutId="skills-tab-pill"
              className="absolute inset-0 bg-white rounded-md shadow-sm"
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            />
          )}
          <BookOpen className="w-4 h-4 relative z-10" />
          <span className="relative z-10">Learning Roadmap</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* ─── TAB 1: MY SKILLS & DIRECTORY ─────────────────────────── */}
        {activeTab === 'skills' ? (
          <motion.div
            key="skills-tab"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-8"
          >
            {/* MY SKILLS SECTION */}
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[20px] font-bold text-[var(--text-primary)]">My Skills</h2>
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Manage your claimed skills and launch technical assessments.
                </p>
              </div>
              <span className="text-[13px] font-semibold text-[var(--text-secondary)]">
                Total: {skills.length} skills
              </span>
            </div>

            {skills.length === 0 ? (
              <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-8 text-center space-y-3 shadow-sm">
                <Award className="w-10 h-10 text-[var(--text-secondary)] mx-auto opacity-50" />
                <p className="text-[16px] font-semibold text-[var(--text-primary)]">No skills added yet</p>
                <p className="text-[14px] text-[var(--text-secondary)]">
                  Add skills from the directory below to take assessments.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {skills.map((userSkill) => {
                  const isVerified = userSkill.status === 'verified';

                  return (
                    <motion.div
                      layout
                      key={userSkill.id}
                      className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] hover:border-[var(--accent)] hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4 shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <SkillBadge
                            skill={userSkill.name}
                            status={userSkill.status}
                            score={userSkill.score}
                          />
                          <button
                            type="button"
                            onClick={() => setSkillToRemove(userSkill)}
                            className="p-1 rounded text-[var(--text-secondary)] hover:text-[#C43D43] transition-colors cursor-pointer"
                            title="Remove skill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <h3 className="text-[18px] font-bold text-[var(--text-primary)]">
                            {userSkill.name} Assessment
                          </h3>
                          <div className="flex items-center justify-between text-[13px] text-[var(--text-secondary)] mt-1">
                            <span>{userSkill.category}</span>
                            <span className="px-2 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)] font-medium">
                              20 Mins · 10 Questions
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar / Score Indicator */}
                        <div className="space-y-1 pt-1">
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="text-[var(--text-secondary)]">Proficiency</span>
                            <span className="font-semibold text-[var(--text-primary)]">
                              {userSkill.score ? `${userSkill.score}/10 (${userSkill.score * 10}%)` : 'Not assessed yet'}
                            </span>
                          </div>
                          <div className="w-full bg-[var(--border-color)] h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isVerified ? 'bg-[#16845B]' : 'bg-[var(--accent)]'
                              }`}
                              style={{ width: `${userSkill.score ? userSkill.score * 10 : 0}%` }}
                            />
                          </div>
                        </div>

                        {userSkill.verifiedDate && (
                          <div className="flex items-center justify-between text-[13px]">
                            <span className="text-[var(--text-secondary)]">Verified On</span>
                            <span className="font-mono text-[#16845B]">
                              {userSkill.verifiedDate}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Card Actions */}
                      <div className="pt-2 border-t border-[var(--border-color)]">
                        {isVerified && userSkill.certificateId ? (
                          <Link
                            href={`/skills/certificate/${userSkill.certificateId}`}
                            className="reference-panel px-4 py-2 rounded-lg border border-[var(--border-color)] bg-white hover:bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] font-semibold w-full inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <FileCheck className="w-4 h-4 text-[#16845B]" />
                            <span>View Certificate</span>
                          </Link>
                        ) : (
                          <Link
                            href={`/skills/assess/${encodeURIComponent(userSkill.name)}`}
                            className="px-4 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold w-full inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                          >
                            <span>Start Assessment</span>
                            <ArrowRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ALL SUPPORTED SKILLS DIRECTORY */}
          <div id="skills-directory" className="space-y-4 text-left pt-6 border-t border-[var(--border-color)]">
            <div>
              <h2 className="text-[20px] font-bold text-[var(--text-primary)]">
                Explore Supported Technical Assessments
              </h2>
              <p className="text-[14px] text-[var(--text-secondary)]">
                Smart Resume AI provides proctored assessments for 11 core industry skills. Select any skill to begin.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {allSupportedSkills.map((sk) => {
                const isUserSkill = skills.some((s) => s.name === sk.name);
                return (
                  <div
                    key={sk.name}
                    className="reference-panel p-5 rounded-2xl border border-[var(--border-color)] bg-white hover:border-[var(--accent)] hover:shadow-md shadow-sm flex flex-col justify-between gap-4 text-left transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-[18px] text-[var(--text-primary)]">{sk.name}</h4>
                          <p className="text-[13px] text-[var(--text-secondary)]">{sk.category}</p>
                        </div>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                          Intermediate
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[13px] text-[var(--text-secondary)] pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          20 Mins
                        </span>
                        <span>10 MCQ</span>
                        <span className="text-[#16845B] font-medium">70% to Pass</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--border-color)]">
                      <Link
                        href={`/skills/assess/${encodeURIComponent(sk.name)}`}
                        className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[13px] font-semibold w-full inline-flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Award className="w-4 h-4" />
                        <span>Start Assessment</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      ) : (
        /* ─── TAB 2: CAREER LEARNING ROADMAP ──────────────────────── */
        <motion.div
          key="roadmap-tab"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6 text-left"
        >
          {/* Roadmap Controls Header */}
          <div className="reference-panel p-6 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-[var(--accent)] uppercase tracking-wider">
                PERSONALIZED CURRICULUM
              </span>
              <h2 className="text-xl font-extrabold text-[var(--text-primary)]">
                {targetRoadmapRole ? `10-Week Roadmap for ${targetRoadmapRole}` : 'Learning Roadmap'}
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
                  onClick={() => loadRoadmap(role)}
                  className={`relative px-3 py-1 rounded-lg text-[10px] font-medium transition-colors border cursor-pointer ${
                    targetRoadmapRole === role
                      ? 'border-[var(--accent)]/30 font-bold text-[var(--accent)]'
                      : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  {targetRoadmapRole === role && (
                    <motion.div
                      layoutId="roadmap-role-pill"
                      className="absolute inset-0 bg-[var(--accent-subtle)] rounded-lg -z-0"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative z-10">{role}</span>
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
                                aria-label={step.title}
                                aria-pressed={isDone}
                                disabled={savingStep}
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
        </motion.div>
      )}
    </AnimatePresence>

      {/* ADD SKILL MODAL */}
      <AnimatePresence>
        {isAddModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="reference-panel w-full max-w-md rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 sm:p-7 shadow-xl space-y-5 text-left relative overflow-hidden"
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REMOVE SKILL CONFIRMATION MODAL */}
      <AnimatePresence>
        {skillToRemove && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="reference-panel w-full max-w-sm rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] p-6 sm:p-7 shadow-xl space-y-4 text-center relative overflow-hidden"
            >
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            role={toast.type === 'error' ? 'alert' : 'status'}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="reference-panel fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl border text-xs font-medium bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)]"
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
