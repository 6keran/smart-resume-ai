'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Check,
  X,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileEdit,
  FileText,
  Info,
  CheckCircle2,
  Edit2,
  Copy,
  ArrowRight,
  ChevronRight,
  Layers,
  Flame,
  CheckCheck,
  Target,
  Briefcase,
  GraduationCap,
  Loader2,
  Plus,
} from 'lucide-react';
import { useResume, isImprovementAppliedToResume } from '@/context/ResumeContext';

const SAMPLE_PROMPTS = [
  {
    label: 'Full Stack App',
    section: 'experience' as const,
    text: 'I made a website using Python and Django where users can register and login, and helped fix bugs in the database.',
  },
  {
    label: 'High-Volume Database',
    section: 'experience' as const,
    text: 'Maintained 3 MySQL database servers handling 5,000 queries per second from June 2020 to December 2022.',
  },
  {
    label: 'React Frontend',
    section: 'projects' as const,
    text: 'Built the frontend using React and TypeScript, added state management, and made sure it works on mobile devices.',
  },
  {
    label: 'Backend Summary',
    section: 'summary' as const,
    text: 'Software engineer with 4 years of experience working with Node.js, PostgreSQL, and cloud APIs looking for backend roles.',
  },
];

export default function ResumeImproverPage() {
  const {
    resumeData,
    targetJob,
    improvements,
    setImprovements,
    acceptImprovement,
    rejectImprovement,
    regenerateImprovement,
    editImprovement,
    saveState,
    saveActiveResume,
    updateSummary,
    updateSkills,
    updateProjects,
    updateExperience,
  } = useResume();

  const [activeTab, setActiveTab] = useState<'all' | 'summary' | 'experience' | 'projects' | 'skills' | 'education'>('all');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Job-Specific Tailoring Studio State
  const [targetRoleInput, setTargetRoleInput] = useState(targetJob.title || 'Graduate Software Engineer');
  const [targetCompanyInput, setTargetCompanyInput] = useState(targetJob.company || '');
  const [targetJdInput, setTargetJdInput] = useState(targetJob.description || '');
  const [isTailoringJob, setIsTailoringJob] = useState(false);
  const [tailoredResult, setTailoredResult] = useState<{
    tailoredSummary: string;
    suggestedBullets: Array<{
      original: string;
      tailored: string;
      impactReason: string;
    }>;
    recommendedSkills: string[];
  } | null>(null);
  const [appliedSummary, setAppliedSummary] = useState(false);
  const [appliedBullets, setAppliedBullets] = useState<Set<number>>(new Set());
  const [addedSkills, setAddedSkills] = useState<Set<string>>(new Set());

  // Live direct text improver state
  const [customInput, setCustomInput] = useState('');
  const [customSection, setCustomSection] = useState<'experience' | 'projects' | 'summary' | 'skills' | 'education'>('experience');
  const [isImprovingCustom, setIsImprovingCustom] = useState(false);
  const [customResult, setCustomResult] = useState<{
    original: string;
    improved: string;
    reasoning: string;
    metricImpact: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Cursor-reactive lighting for workbench
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, []);

  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.removeProperty('--mouse-x');
    e.currentTarget.style.removeProperty('--mouse-y');
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleRunJobTailoring = async () => {
    if (!targetJdInput.trim()) {
      triggerToast('Please provide a target job or internship description to tailor against.');
      return;
    }

    const resumeParts: string[] = [];
    if (resumeData.personalInfo?.fullName) resumeParts.push(`Name: ${resumeData.personalInfo.fullName}`);
    if (resumeData.summary) resumeParts.push(`Summary: ${resumeData.summary}`);
    if (resumeData.education?.length) {
      resumeParts.push(`Education: ${resumeData.education.map((e) => `${e.degree} at ${e.institution}`).join(', ')}`);
    }
    const allSkills = [
      ...(resumeData.skills?.technical || []),
      ...(resumeData.skills?.soft || []),
      ...(resumeData.skills?.tools || []),
    ];
    if (allSkills.length) {
      resumeParts.push(`Skills: ${allSkills.join(', ')}`);
    }
    if (resumeData.projects?.length) {
      resumeParts.push(`Projects:\n${resumeData.projects.map((p) => `• ${p.title}: ${p.description || p.bullets?.join('; ')}`).join('\n')}`);
    }
    if (resumeData.experience?.length) {
      resumeParts.push(`Experience:\n${resumeData.experience.map((e) => `• ${e.role} at ${e.company}: ${e.bulletPoints?.join('; ')}`).join('\n')}`);
    }

    const fullResumeText = resumeParts.join('\n\n') || (customInput.trim() ? customInput.trim() : 'Candidate seeking entry-level software position with academic projects.');

    setIsTailoringJob(true);
    try {
      const res = await fetch('/api/resume/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText: fullResumeText,
          jobTitle: targetRoleInput.trim() || 'Graduate Software Engineer',
          company: targetCompanyInput.trim() || 'Target Company',
          jobDescription: targetJdInput.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        triggerToast(err.message || 'Unable to tailor resume for target role.');
        return;
      }

      const data = await res.json();
      setTailoredResult(data);
      setAppliedSummary(false);
      setAppliedBullets(new Set());
      setAddedSkills(new Set());
      triggerToast('Tailored resume comparison generated! Review original-vs-improved diff below.');
    } catch {
      triggerToast('Connection error while tailoring resume.');
    } finally {
      setIsTailoringJob(false);
    }
  };

  const handleApplyTailoredSummary = () => {
    if (!tailoredResult?.tailoredSummary) return;
    updateSummary(tailoredResult.tailoredSummary);
    setAppliedSummary(true);
    triggerToast('Applied tailored summary to active resume draft!');
  };

  const handleApplyTailoredBullet = (idx: number, original: string, tailored: string) => {
    let matched = false;

    if (resumeData.experience?.length) {
      const updatedExp = [...resumeData.experience];
      for (let i = 0; i < updatedExp.length; i++) {
        const bList = updatedExp[i].bulletPoints || [];
        const matchIdx = bList.findIndex((b) => b.toLowerCase().includes(original.slice(0, 30).toLowerCase()) || original.toLowerCase().includes(b.slice(0, 30).toLowerCase()));
        if (matchIdx !== -1) {
          bList[matchIdx] = tailored;
          updatedExp[i].bulletPoints = bList;
          updateExperience(updatedExp);
          matched = true;
          break;
        }
      }
    }

    if (!matched && resumeData.projects?.length) {
      const updatedProj = [...resumeData.projects];
      for (let j = 0; j < updatedProj.length; j++) {
        if (updatedProj[j].bullets?.length) {
          const bIdx = updatedProj[j].bullets!.findIndex((b) => b.toLowerCase().includes(original.slice(0, 30).toLowerCase()));
          if (bIdx !== -1) {
            updatedProj[j].bullets![bIdx] = tailored;
            updateProjects(updatedProj);
            matched = true;
            break;
          }
        } else if (updatedProj[j].description) {
          updatedProj[j].description = tailored;
          updateProjects(updatedProj);
          matched = true;
          break;
        }
      }
    }

    if (!matched) {
      if (resumeData.projects?.length) {
        const updatedProj = [...resumeData.projects];
        if (!updatedProj[0].bullets) updatedProj[0].bullets = [];
        updatedProj[0].bullets.push(tailored);
        updateProjects(updatedProj);
      } else {
        const updatedExp = [...(resumeData.experience || [])];
        if (!updatedExp.length) {
          updatedExp.push({
            id: 'exp_' + Date.now(),
            role: targetRoleInput || 'Software Engineer',
            company: 'Academic Projects & Training',
            startDate: '2024',
            endDate: 'Present',
            current: true,
            bulletPoints: [tailored],
          });
        } else {
          updatedExp[0].bulletPoints.push(tailored);
        }
        updateExperience(updatedExp);
      }
    }

    setAppliedBullets((prev) => new Set([...prev, idx]));
    triggerToast('Applied tailored bullet to active resume!');
  };

  const handleAddRecommendedSkill = (skill: string) => {
    const existingTechnical = resumeData.skills?.technical || [];
    const lowerSet = new Set(existingTechnical.map((s) => s.toLowerCase()));
    if (!lowerSet.has(skill.toLowerCase())) {
      updateSkills({
        ...resumeData.skills,
        technical: [...existingTechnical, skill],
      });
    }
    setAddedSkills((prev) => new Set([...prev, skill]));
    triggerToast(`Added ${skill} to resume technical skills!`);
  };

  const handleImproveCustom = async () => {
    const trimmed = customInput.trim();
    if (!trimmed) {
      triggerToast('Please enter text to improve.');
      return;
    }

    setIsImprovingCustom(true);
    try {
      const res = await fetch('/api/resume/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionName: customSection,
          originalContent: trimmed,
          jobDescription: targetJob?.description || undefined,
          jobTitle: targetJob?.title || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCustomResult({
          original: trimmed,
          improved: data.improvedContent,
          reasoning: data.reasoning,
          metricImpact: data.metricImpact,
        });
        triggerToast('Phrasing improved while strictly preserving your content and facts.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        triggerToast(errJson.message || 'Unable to improve phrasing at this time.');
      }
    } catch {
      triggerToast('Network error while connecting to phrasing improver. Please check your connection and retry.');
    } finally {
      setIsImprovingCustom(false);
    }
  };

  const handleApplyCustomToResume = async () => {
    if (!customResult) return;
    const newItem = {
      id: `imp_manual_${Date.now()}`,
      section: customSection,
      field:
        customSection === 'experience'
          ? 'Work Experience Bullet'
          : customSection === 'projects'
          ? 'Project Description'
          : customSection === 'summary'
          ? 'Professional Summary'
          : 'Resume Section',
      originalContent: customResult.original,
      improvedContent: customResult.improved,
      reasoning: customResult.reasoning,
      metricImpact: customResult.metricImpact,
      status: 'pending' as const,
      diff: {
        before: customResult.original,
        after: customResult.improved,
      },
    };

    setImprovements((prev) => [newItem, ...prev]);
    const ok = await acceptImprovement(newItem.id, newItem);
    if (ok) {
      triggerToast('Applied suggestion directly to your resume.');
    } else {
      triggerToast('Added to your suggestions list.');
    }
  };

  const handleCopyImproved = () => {
    if (!customResult) return;
    try {
      navigator.clipboard.writeText(customResult.improved);
    } catch {
      // Fallback
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    triggerToast('Copied improved text to clipboard.');
  };

  const filtered =
    activeTab === 'all'
      ? improvements
      : improvements.filter((imp) => imp.section === activeTab);

  const handleRegenerate = async (id: string) => {
    try {
      setRegeneratingId(id);
      const success = await regenerateImprovement(id);
      if (success) {
        triggerToast('Alternative phrasing generated.');
      } else {
        triggerToast('Unable to regenerate alternative at this time.');
      }
    } catch {
      triggerToast('Unable to regenerate alternative at this time.');
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleApply = async (id: string, label: string) => {
    const success = await acceptImprovement(id);
    if (success) {
      triggerToast(`Applied suggestion for "${label}" and saved to your resume.`);
    } else {
      triggerToast(`Could not save suggestion for "${label}". Please check your network and retry.`);
    }
  };

  const handleSaveEdit = async (id: string, applyImmediately: boolean = false) => {
    const trimmed = editTextValue.trim();
    if (!trimmed) return;
    editImprovement(id, trimmed);
    setEditingSuggestionId(null);
    if (applyImmediately) {
      const ok = await acceptImprovement(id);
      if (ok) {
        triggerToast('Updated phrasing and saved to your resume.');
      } else {
        triggerToast('Updated suggestion wording. Click "Apply" to save to resume.');
      }
    } else {
      triggerToast('Updated suggestion wording.');
    }
  };

  return (
    <div className="relative min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-6 right-6 z-50 glass-workbench px-4 py-3 rounded-xl flex items-center gap-3 text-xs font-semibold text-[var(--text-primary)] shadow-2xl"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Atmospheric Page Header */}
      <div className="relative overflow-hidden rounded-2xl glass-workbench p-6 sm:p-8 border border-[var(--glass-border)]">
        {/* Soft atmospheric ambient light */}
        <div
          aria-hidden="true"
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[680px] h-[340px] bg-[radial-gradient(ellipse_at_center,rgba(79,131,241,0.18),transparent_70%)] pointer-events-none"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-subtle)] border border-[var(--accent)]/25 text-[var(--accent)] text-[11px] font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Career Intelligence Studio</span>
              <span className="w-1 h-1 rounded-full bg-[var(--accent)]" />
              <span className="text-[var(--text-secondary)] font-normal normal-case">Preserves 100% of Facts</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              Resume Improver
            </h1>

            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              Elevate draft bullets, project descriptions, and summaries into high-impact professional phrasing—while strictly preserving your real technologies, metrics, and experience.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-auto shrink-0">
            {/* Cloud Sync State */}
            {saveState === 'saving' && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                Saving to cloud...
              </span>
            )}
            {saveState === 'saved' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                Changes saved
              </span>
            )}
            {saveState === 'error' && (
              <button
                onClick={() => saveActiveResume()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 hover:bg-rose-500/20 font-medium cursor-pointer transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Save
              </button>
            )}

            <Link
              href="/builder"
              className="btn-secondary rounded-full text-xs px-4 inline-flex items-center gap-2 h-9"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Resume Builder</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Content Integrity Guarantee Note */}
      <div className="p-4 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl flex items-start gap-3.5 shadow-xs">
        <div className="p-2 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 shrink-0 mt-0.5">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <div className="text-xs leading-relaxed">
          <strong className="text-[var(--text-primary)] font-semibold block mb-0.5">
            Strict Anti-Hallucination & Preservation Architecture
          </strong>
          <span className="text-[var(--text-secondary)]">
            Every improvement elevates passive phrasing into active leadership verbs and clearer structure. The system never invents technologies, metrics, certifications, or employment history not present in your input.
          </span>
        </div>
      </div>

      {/* ─── JOB-SPECIFIC TAILORING & DIFF STUDIO ────────────────────────── */}
      <div className="bento-card p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
                  Targeted Application Optimizer
                </span>
              </div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                Job & Internship Specific Tailoring Studio
              </h2>
            </div>
          </div>
          <span className="text-xs text-[var(--text-secondary)]">
            Generates side-by-side original-vs-tailored diffs aligned with employer criteria.
          </span>
        </div>

        {/* Input Dock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-[var(--text-primary)] mb-1">
              Target Role / Title
            </label>
            <input
              type="text"
              value={targetRoleInput}
              onChange={(e) => setTargetRoleInput(e.target.value)}
              placeholder="e.g. Graduate Software Engineer or SDE Intern"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-primary)] mb-1">
              Target Company / Organization
            </label>
            <input
              type="text"
              value={targetCompanyInput}
              onChange={(e) => setTargetCompanyInput(e.target.value)}
              placeholder="e.g. Google, Microsoft, Startup"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-semibold text-[var(--text-primary)] mb-1">
              Job / Internship Description or Qualifications *
            </label>
            <textarea
              rows={3}
              value={targetJdInput}
              onChange={(e) => setTargetJdInput(e.target.value)}
              placeholder="Paste the target job description, requirements, or internship bullet points here..."
              className="w-full p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] leading-relaxed resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleRunJobTailoring}
            disabled={isTailoringJob || !targetJdInput.trim()}
            className="btn-primary btn-md flex items-center gap-2 text-xs font-semibold cursor-pointer shadow-md disabled:opacity-50"
          >
            {isTailoringJob ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Tailoring Resume & Generating Diffs...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Job-Specific Tailoring & Diff</span>
              </>
            )}
          </button>
        </div>

        {/* Tailored Results Presentation */}
        {tailoredResult && (
          <div className="space-y-6 pt-4 border-t border-[var(--border-color)]">
            {/* 1. Tailored Summary Diff */}
            {tailoredResult.tailoredSummary && (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                    <span className="font-bold text-[var(--text-primary)]">
                      Targeted Professional Summary Comparison
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyTailoredSummary}
                    disabled={appliedSummary}
                    className={`btn-sm px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                      appliedSummary
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        : 'btn-primary shadow-xs'
                    }`}
                  >
                    {appliedSummary ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    <span>{appliedSummary ? 'Applied to Resume' : 'Adopt Summary'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-red-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">
                      Original Draft Summary
                    </span>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      {resumeData.summary || 'No summary drafted in active resume.'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-emerald-500/30 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">
                      AI-Tailored High-Impact Summary
                    </span>
                    <p className="text-[var(--text-primary)] font-medium leading-relaxed">
                      {tailoredResult.tailoredSummary}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Bullets Side-by-Side Diff */}
            {tailoredResult.suggestedBullets && tailoredResult.suggestedBullets.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--accent)]" />
                  <span className="font-bold text-xs text-[var(--text-primary)] uppercase tracking-wider">
                    Project & Experience Bullet Rewrites ({tailoredResult.suggestedBullets.length})
                  </span>
                </div>

                <div className="space-y-3">
                  {tailoredResult.suggestedBullets.map((bullet, bIdx) => {
                    const isApplied = appliedBullets.has(bIdx);
                    return (
                      <div
                        key={bIdx}
                        className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                            Suggestion #{bIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleApplyTailoredBullet(bIdx, bullet.original, bullet.tailored)}
                            disabled={isApplied}
                            className={`btn-sm px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
                              isApplied
                                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                : 'btn-primary shadow-xs'
                            }`}
                          >
                            {isApplied ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            <span>{isApplied ? 'Adopted in Resume' : 'Adopt Bullet'}</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-red-500/20 space-y-1">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block">
                              Original Phrasing
                            </span>
                            <p className="text-[var(--text-secondary)] leading-relaxed">
                              {bullet.original}
                            </p>
                          </div>

                          <div className="p-3 rounded-lg bg-[var(--bg-primary)] border border-emerald-500/30 space-y-1">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider block">
                              Tailored High-Impact Phrasing (XYZ Formula)
                            </span>
                            <p className="text-[var(--text-primary)] font-medium leading-relaxed">
                              {bullet.tailored}
                            </p>
                          </div>
                        </div>

                        {bullet.impactReason && (
                          <div className="p-2.5 rounded-lg bg-[var(--accent)]/5 border border-[var(--accent)]/15 text-[11px] text-[var(--accent)] flex items-start gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span><strong>ATS & Hiring Impact:</strong> {bullet.impactReason}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Recommended Skills */}
            {tailoredResult.recommendedSkills && tailoredResult.recommendedSkills.length > 0 && (
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-3 text-xs">
                <span className="font-bold text-[var(--text-primary)] block">
                  Recommended Target Role Skills (Identified in Job Description)
                </span>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Add verified technologies you know from coursework and projects to boost keyword match rate:
                </p>
                <div className="flex flex-wrap gap-2">
                  {tailoredResult.recommendedSkills.map((sk) => {
                    const isAdded = addedSkills.has(sk);
                    return (
                      <button
                        key={sk}
                        type="button"
                        onClick={() => handleAddRecommendedSkill(sk)}
                        disabled={isAdded}
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                            : 'bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--accent)] border border-[var(--border-color)]'
                        }`}
                      >
                        {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-[var(--accent)]" />}
                        <span>{sk}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── LIVE PHRASING STUDIO WORKBENCH ──────────────────────────────── */}
      <div
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerOut={handlePointerLeave}
        className="liquid-glass-card rounded-2xl p-6 sm:p-8 space-y-6"
      >
        {/* Workbench Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--glass-border)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/30 shadow-xs">
              <Sparkles className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                Live Phrasing Studio
              </h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Draft or paste any statement to elevate clarity and impact with instant AI evaluation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs text-[var(--text-muted)] font-medium">Target Section:</span>
            <select
              value={customSection}
              onChange={(e) => setCustomSection(e.target.value as any)}
              className="text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer transition-colors shadow-xs"
            >
              <option value="experience">Experience Bullet</option>
              <option value="projects">Project Description</option>
              <option value="summary">Professional Summary</option>
              <option value="skills">Technical Skills</option>
              <option value="education">Education</option>
            </select>
          </div>
        </div>

        {/* Workbench Two-Column Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column 1: Writing Canvas (lg:col-span-6) */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--text-secondary)] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  Writing Canvas
                </span>
                <span className="text-[11px] text-[var(--text-muted)] font-mono">
                  {customInput.trim().length} chars · {customInput.trim() ? customInput.trim().split(/\s+/).length : 0} words
                </span>
              </div>

              <div className="relative rounded-xl border border-[var(--border-color)] focus-within:border-[var(--accent)] focus-within:shadow-[0_0_24px_rgba(79,131,241,0.18)] transition-all duration-200 bg-[var(--input-bg)] overflow-hidden">
                <textarea
                  rows={4}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Paste or write your bullet here (e.g., 'I made a website using Python and Django where users can register and login, and helped fix database issues.')..."
                  className="w-full p-3.5 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] bg-transparent resize-none focus:outline-none leading-relaxed"
                />

                <div className="px-3.5 py-2 bg-[var(--bg-secondary)]/60 border-t border-[var(--border-color)] flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)]">
                    Press Improve to elevate phrasing
                  </span>

                  <div className="flex items-center gap-2">
                    {customInput.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomInput('');
                          setCustomResult(null);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleImproveCustom}
                      data-magnetic="true"
                      disabled={isImprovingCustom || !customInput.trim()}
                      className="btn-primary rounded-full px-5 py-2 text-xs font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Wand2 className={`w-3.5 h-3.5 ${isImprovingCustom ? 'animate-spin' : ''}`} />
                      <span>{isImprovingCustom ? 'Elevating...' : 'Improve Phrasing'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                Quick Sample Prompts
              </span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample.label}
                    type="button"
                    onClick={() => {
                      setCustomInput(sample.text);
                      setCustomSection(sample.section);
                    }}
                    className="text-[11px] px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)]/40 transition-colors text-left cursor-pointer shadow-xs"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Refinement Stage (lg:col-span-6) */}
          <div className="lg:col-span-6 flex flex-col justify-between">
            {customResult ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col justify-between space-y-4 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] p-4 shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--glass-border)]">
                    <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Professional Refinement
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" />
                      Facts Preserved
                    </span>
                  </div>

                  {/* Refined Content Pane */}
                  <div className="text-xs sm:text-sm text-[var(--text-primary)] font-medium leading-relaxed bg-[var(--glass-bg)] p-3.5 rounded-xl border border-[var(--glass-border)] whitespace-pre-wrap">
                    {customResult.improved}
                  </div>

                  {/* Editorial Note */}
                  <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex items-start gap-2">
                    <Info className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[var(--text-primary)] font-semibold">Editorial Note: </strong>
                      <span>{customResult.reasoning}</span>
                    </div>
                  </div>
                </div>

                {/* Refinement Actions */}
                <div className="pt-3 border-t border-[var(--glass-border)] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleCopyImproved}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--glass-bg)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied ? 'Copied' : 'Copy'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleApplyCustomToResume}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Apply to Resume</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col justify-center rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] p-6 text-center space-y-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] mx-auto flex items-center justify-center border border-[var(--accent)]/20 shadow-xs">
                  <Flame className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">
                    Refinement Stage Awaiting Input
                  </h3>
                  <p className="text-[11px] text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
                    Type a sentence in the writing canvas or select a quick sample prompt on the left to see instant professional phrase elevation.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-left">
                  <div className="p-2.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-1">
                    <span className="text-[10px] font-bold text-[var(--accent)] block">01 · VERBS</span>
                    <span className="text-[10px] text-[var(--text-secondary)] leading-tight block">Elevates passive wording into action leadership.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-1">
                    <span className="text-[10px] font-bold text-emerald-400 block">02 · FACTS</span>
                    <span className="text-[10px] text-[var(--text-secondary)] leading-tight block">Zero invented tools, dates, or metrics.</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] space-y-1">
                    <span className="text-[10px] font-bold text-blue-400 block">03 · ATS FIT</span>
                    <span className="text-[10px] text-[var(--text-secondary)] leading-tight block">Calibrated for recruiter keyword engines.</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── SUGGESTIONS NAVIGATION TABS ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--glass-border)]">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
            Resume Section Recommendations
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Compare original resume wording side-by-side with proposed improvements.
          </p>
        </div>

        {/* Segmented Pill Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] self-start sm:self-auto overflow-x-auto max-w-full">
          {(['all', 'summary', 'experience', 'projects', 'skills', 'education'] as const).map((tab) => {
            const count =
              tab === 'all'
                ? improvements.length
                : improvements.filter((imp) => imp.section === tab).length;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative px-3.5 py-1.5 rounded-full text-xs font-semibold capitalize tracking-wide transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="activeFilterHighlight"
                    className="absolute inset-0 bg-[var(--accent)] rounded-full shadow-xs"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span>{tab}</span>
                  {count > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        activeTab === tab
                          ? 'bg-white/20 text-white'
                          : 'bg-[var(--bg-primary)] text-[var(--text-muted)]'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── SUGGESTIONS LIST / EMPTY STATE ──────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl glass-workbench p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] mx-auto flex items-center justify-center border border-[var(--accent)]/20 shadow-xs">
            <Wand2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-[var(--text-primary)]">
              No improvements found for this section yet.
            </h3>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
              Every improvement is derived directly from your genuine uploaded resume. Upload or re-analyze your resume to generate recommendations across all sections.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/analyzer"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all shadow-[0_4px_16px_rgba(79,131,241,0.25)] active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Analyze Resume to Generate Improvements</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((item, idx) => {
            const isRejected = item.status === 'rejected';
            const isAppliedToResume = isImprovementAppliedToResume(item, resumeData);
            const isEditing = editingSuggestionId === item.id;

            return (
              <div
                key={item.id}
                onPointerMove={handlePointerMove}
                onPointerLeave={handlePointerLeave}
                onPointerOut={handlePointerLeave}
                className={`liquid-glass-card rounded-2xl p-5 sm:p-6 space-y-4 transition-all ${
                  isRejected
                    ? 'opacity-60'
                    : isAppliedToResume
                    ? 'border-emerald-500/30 shadow-[0_4px_20px_rgba(36,199,138,0.06)]'
                    : ''
                }`}
              >
                {/* Card Header: Index, Section Tag, Target Field, Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--glass-border)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-[11px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                      {item.section}
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {item.field}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAppliedToResume && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Applied to Resume
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                        <X className="w-3 h-3 text-[var(--text-muted)]" />
                        Dismissed
                      </span>
                    )}
                  </div>
                </div>

                {/* Dual-Pane Comparison Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Original Phrasing */}
                  <div className="p-4 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-[var(--glass-border)]">
                        <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" />
                          Current Resume Phrasing
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">Source</span>
                      </div>
                      <div className="text-xs text-[var(--text-primary)] font-mono leading-relaxed bg-[var(--glass-bg)] p-3 rounded-lg border border-[var(--glass-border)] whitespace-pre-wrap min-h-[64px]">
                        {item.originalContent || 'No existing text recorded for this section.'}
                      </div>
                    </div>

                    <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed pt-2.5 border-t border-[var(--glass-border)] flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[var(--text-primary)]">Observation: </span>
                        <span>{item.reasoning}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: AI Improved Phrasing */}
                  <div className="p-4 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pb-1 border-b border-[var(--glass-border)]">
                        <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          Proposed Professional Alternative
                        </span>
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSuggestionId(item.id);
                              setEditTextValue(item.improvedContent);
                            }}
                            className="text-[11px] font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-2">
                          <textarea
                            rows={3}
                            value={editTextValue}
                            onChange={(e) => setEditTextValue(e.target.value)}
                            className="w-full p-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--accent)] text-xs text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 transition-all shadow-xs"
                            placeholder="Edit suggested wording..."
                          />
                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingSuggestionId(null)}
                              className="px-2.5 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] border border-[var(--glass-border)] active:scale-95 transition-all cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(item.id, false)}
                              className="px-3 py-1 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold active:scale-95 transition-all cursor-pointer shadow-xs"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-[var(--text-primary)] leading-relaxed bg-[var(--glass-bg)] p-3 rounded-lg border border-[var(--glass-border)] whitespace-pre-wrap font-medium min-h-[64px]">
                          {item.improvedContent}
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-[var(--text-muted)] leading-relaxed pt-2.5 border-t border-[var(--glass-border)] flex items-start gap-1.5">
                      <span className="font-semibold text-[var(--text-secondary)]">Guideline: </span>
                      <span>Phrased with clear active verbs and relevant domain skills without inventing experience.</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Accept / Reject / Regenerate */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-[var(--glass-border)]">
                  <button
                    type="button"
                    onClick={() => handleRegenerate(item.id)}
                    disabled={regeneratingId === item.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--glass-bg)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RotateCcw
                      className={`w-3.5 h-3.5 ${regeneratingId === item.id ? 'animate-spin' : ''}`}
                    />
                    <span>Regenerate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (isRejected) {
                        setImprovements((prev) =>
                          prev.map((imp) => (imp.id === item.id ? { ...imp, status: 'pending' } : imp))
                        );
                        triggerToast('Suggestion restored.');
                      } else {
                        rejectImprovement(item.id);
                        triggerToast('Suggestion dismissed.');
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium active:scale-95 transition-all cursor-pointer ${
                      isRejected
                        ? 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                        : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-rose-400 hover:border-rose-500/30'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{isRejected ? 'Restore' : 'Dismiss'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApply(item.id, item.field)}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold active:scale-95 transition-all cursor-pointer ${
                      isAppliedToResume
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-[0_2px_12px_rgba(79,131,241,0.25)]'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isAppliedToResume ? 'Re-Apply to Resume' : 'Apply to Resume'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
