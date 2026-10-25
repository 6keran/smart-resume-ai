'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Plus,
  Trash2,
  Sparkles,
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
} from 'lucide-react';
import { useCareer } from '@/context/CareerContext';
import { SupportedSkill, UserSkill } from '@/types/skills';
import { SkillBadge } from '@/components/ui/SkillBadge';
import { GlassCard } from '@/components/ui/GlassCard';

export default function SkillVerificationPage() {
  const { skills, addSkill, removeSkill, claimSkill } = useCareer();

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Skill Assessments
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Test your proficiency across key technical topics and track your assessment results.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 h-[42px] px-4 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Skill
        </button>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-5 flex items-start gap-4">
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

        <GlassCard className="p-5 flex items-start gap-4">
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

        <GlassCard className="p-5 flex items-start gap-4">
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
                <GlassCard key={userSkill.id} className="p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <SkillBadge
                        skill={userSkill.name}
                        status={userSkill.status}
                        score={userSkill.score}
                      />
                      <button
                        onClick={() => setSkillToRemove(userSkill)}
                        className="p-1 rounded text-[var(--text-secondary)] hover:text-rose-500 transition-colors"
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
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold transition-all"
                      >
                        <FileCheck className="w-3.5 h-3.5" />
                        View Certificate
                      </Link>
                    ) : (
                      <Link
                        href={`/skills/assess/${encodeURIComponent(userSkill.name)}`}
                        className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition-colors"
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
      <div className="space-y-4 text-left pt-6 border-t border-[var(--border-color)]">
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Explore Supported Technical Skills
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Smart Resume AI currently provides full assessment banks for 11 core industry skills.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {allSupportedSkills.map((sk) => {
            const isUserSkill = skills.some((s) => s.name === sk.name);
            return (
              <div
                key={sk.name}
                className="p-3.5 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] backdrop-blur-xl shadow-xs flex items-center justify-between text-xs transition-all hover:-translate-y-0.5"
              >
                <div>
                  <h4 className="font-bold text-[var(--text-primary)]">{sk.name}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)]">{sk.category}</p>
                </div>
                {isUserSkill ? (
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    Added
                  </span>
                ) : (
                  <button
                    onClick={() => addSkill(sk.name, sk.category, true)}
                    className="p-1.5 rounded-xl bg-[var(--glass-bg-elevated)] hover:bg-[var(--accent)] hover:text-white text-[var(--text-secondary)] border border-[var(--glass-border)] transition-colors cursor-pointer"
                    title={`Add ${sk.name}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD SKILL MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] p-6 sm:p-7 shadow-[var(--shadow-glass-hover)] backdrop-blur-2xl space-y-5 text-left relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-transparent pointer-events-none" />
            <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-3">
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
                  className="h-[38px] px-4 rounded-xl text-xs font-semibold border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] transition-all cursor-pointer shadow-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="h-[38px] px-4 rounded-xl text-xs font-semibold bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-sm hover:shadow-[0_4px_16px_rgba(79,143,247,0.3)] transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] p-6 sm:p-7 shadow-[var(--shadow-glass-hover)] backdrop-blur-2xl space-y-4 text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent pointer-events-none" />
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center border border-rose-500/20 shadow-xs">
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
                disabled={isDeleting}
                onClick={() => setSkillToRemove(null)}
                className="h-[38px] px-4 rounded-xl text-xs font-semibold border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] disabled:opacity-50 transition-all cursor-pointer shadow-xs"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleConfirmRemove}
                className="h-[38px] px-4 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow-[0_4px_16px_rgba(225,29,72,0.3)] flex items-center justify-center gap-2 disabled:opacity-50 transition-all min-w-[110px] cursor-pointer"
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
