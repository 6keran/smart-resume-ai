'use client';

import React, { useState } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { useResume, isImprovementAppliedToResume } from '@/context/ResumeContext';

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
    saveError,
    saveActiveResume,
  } = useResume();

  const [activeTab, setActiveTab] = useState<'all' | 'summary' | 'experience' | 'projects' | 'skills' | 'education'>('all');
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [editingSuggestionId, setEditingSuggestionId] = useState<string | null>(null);
  const [editTextValue, setEditTextValue] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
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
        triggerToast('Unable to improve phrasing at this time.');
      }
    } catch {
      triggerToast('Unable to improve phrasing at this time.');
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
    navigator.clipboard.writeText(customResult.improved);
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
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--text-primary)] text-[var(--bg-primary)] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-[var(--border-color)] animate-fade-in text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Resume Improver
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Compare original phrasing against proposed improvements and apply changes directly to your resume.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveState === 'saving' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              Saving to cloud...
            </span>
          )}
          {saveState === 'saved' && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
              <Check className="w-3.5 h-3.5" />
              Changes saved
            </span>
          )}
          {saveState === 'error' && (
            <button
              onClick={() => saveActiveResume()}
              className="inline-flex items-center gap-1.5 text-xs text-rose-500 hover:text-rose-400 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Retry Save
            </button>
          )}

          <Link
            href="/builder"
            className="inline-flex items-center gap-2 h-[42px] px-4 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] active:scale-95 transition-all duration-150 shadow-xs"
          >
            <FileEdit className="w-4 h-4" />
            Apply to Resume Builder
          </Link>
        </div>
      </div>

      {/* Content Guideline Note */}
      <div className="p-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md flex items-start gap-3 shadow-xs">
        <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="text-[var(--text-primary)] block font-semibold mb-0.5">
            Content Guidelines
          </strong>
          <span className="text-[var(--text-secondary)]">
            Suggestions focus on concise phrasing and action verbs while keeping your actual employment history, titles, and technical skills intact.
          </span>
        </div>
      </div>

      {/* Live Content Editor & Improver Card */}
      <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl p-5 sm:p-6 space-y-4 shadow-[var(--shadow-glass)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center border border-[var(--accent)]/20 shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Live Content Editor & Improver
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)]">
                Paste any bullet point, project description, or summary to elevate phrasing while strictly preserving facts and technologies.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">Target Section:</span>
            <select
              value={customSection}
              onChange={(e) => setCustomSection(e.target.value as any)}
              className="text-xs bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="experience">Experience Bullet</option>
              <option value="projects">Project Description</option>
              <option value="summary">Professional Summary</option>
              <option value="skills">Technical Skills</option>
              <option value="education">Education</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <textarea
            rows={3}
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="e.g. I made a website using Python and Django where users can register and login."
            className="w-full p-3 rounded-xl bg-[var(--input-bg)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-all shadow-xs leading-relaxed"
          />

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-[var(--text-muted)]">
              {customInput.trim().length} characters
            </span>

            <div className="flex items-center gap-2">
              {customInput.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomInput('');
                    setCustomResult(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] transition-all cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={handleImproveCustom}
                disabled={isImprovingCustom || !customInput.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold active:scale-95 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Wand2 className={`w-3.5 h-3.5 ${isImprovingCustom ? 'animate-spin' : ''}`} />
                <span>{isImprovingCustom ? 'Improving...' : 'Improve Phrasing'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Improvement Result Display */}
        {customResult && (
          <div className="mt-4 pt-4 border-t border-[var(--border-color)] space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Original Card */}
              <div className="p-4 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[var(--glass-border)]">
                  <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Original Input
                  </span>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">Source of Truth</span>
                </div>
                <div className="text-xs text-[var(--text-primary)] font-mono leading-relaxed bg-[var(--glass-bg)] p-3 rounded-lg border border-[var(--glass-border)] whitespace-pre-wrap">
                  {customResult.original}
                </div>
              </div>

              {/* Improved Card */}
              <div className="p-4 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-[var(--glass-border)]">
                  <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Professional Refinement
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    Facts & Tech Preserved
                  </span>
                </div>
                <div className="text-xs text-[var(--text-primary)] font-medium leading-relaxed bg-[var(--glass-bg)] p-3 rounded-lg border border-[var(--glass-border)] whitespace-pre-wrap">
                  {customResult.improved}
                </div>
              </div>
            </div>

            {/* Observation & Metric Impact */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
                <span className="text-[var(--text-secondary)] leading-relaxed">
                  <strong className="text-[var(--text-primary)] font-semibold">Editor Note: </strong>
                  {customResult.reasoning}
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={handleCopyImproved}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all cursor-pointer"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleApplyCustomToResume}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold active:scale-95 transition-all shadow-xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply to Resume</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[var(--glass-border)]">
        {(['all', 'summary', 'experience', 'projects', 'skills', 'education'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-150 active:scale-95 whitespace-nowrap cursor-pointer ${
              activeTab === tab
                ? 'bg-[var(--accent)] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Split Screen Cards List or Empty State */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-2xl p-12 text-center space-y-4 shadow-[var(--shadow-glass)]">
          <div className="w-12 h-12 rounded-2xl bg-[var(--accent-subtle)] text-[var(--accent)] mx-auto flex items-center justify-center border border-[var(--accent)]/20 shadow-xs">
            <Wand2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            Upload a resume to start improving it.
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
            Every improvement is generated from your actual uploaded resume text and real AI analysis. No fabricated examples.
          </p>
          <div className="pt-2">
            <Link
              href="/analyzer"
              className="inline-flex items-center gap-2 h-[42px] px-5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all shadow-[0_4px_16px_rgba(79,143,247,0.3)] active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>Analyze Resume to Generate Improvements</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
        {filtered.map((item, idx) => {
          const isAccepted = item.status === 'accepted';
          const isRejected = item.status === 'rejected';
          const isAppliedToResume = isImprovementAppliedToResume(item, resumeData);
          const isEditing = editingSuggestionId === item.id;

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 sm:p-6 transition-all space-y-4 backdrop-blur-xl shadow-[var(--shadow-glass)] ${
                isRejected
                  ? 'border-[var(--glass-border)] bg-[var(--glass-bg)] opacity-60'
                  : isAppliedToResume
                  ? 'border-[var(--glass-border-hover)] bg-[var(--glass-bg-elevated)]'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] hover:border-[var(--glass-border-hover)]'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-[var(--border-color)]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-5 h-5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-[11px] font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]">
                    {item.section}
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {item.field}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {isAppliedToResume && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <Check className="w-3 h-3 text-[var(--accent)]" />
                      Applied
                    </span>
                  )}
                  {isRejected && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-medium text-[var(--text-muted)] bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                      <X className="w-3 h-3 text-[var(--text-muted)]" />
                      Dismissed
                    </span>
                  )}
                </div>
              </div>

              {/* Split Screen Comparison UI */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left: Original Content */}
                <div className="p-4 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--glass-border)]">
                      <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        Current Phrasing
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)] font-mono">
                        Extracted Text
                      </span>
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

                {/* Right: AI Improved Content */}
                <div className="p-4 rounded-xl bg-[var(--glass-bg-elevated)] border border-[var(--glass-border)] space-y-3 flex flex-col justify-between shadow-xs">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-[var(--glass-border)]">
                      <span className="text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                        Proposed AI Alternative
                      </span>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSuggestionId(item.id);
                            setEditTextValue(item.improvedContent);
                          }}
                          className="text-[11px] font-medium text-[var(--accent)] hover:underline inline-flex items-center gap-1 active:scale-95 transition-all duration-150 cursor-pointer"
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
                          className="w-full p-2.5 rounded-lg bg-[var(--input-bg)] border border-[var(--accent)] text-xs text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 transition-all duration-150 shadow-xs"
                          placeholder="Edit suggested wording..."
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingSuggestionId(null)}
                            className="px-2.5 py-1 rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--glass-bg)] border border-[var(--glass-border)] active:scale-95 transition-all duration-150 cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(item.id, false)}
                            className="px-3 py-1 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold active:scale-95 transition-all duration-150 cursor-pointer shadow-xs"
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

                  <div className="text-[11px] text-[var(--text-muted)] leading-relaxed pt-2.5 border-t border-[var(--border-color)]/60 flex items-start gap-1.5">
                    <span className="font-semibold text-[var(--text-secondary)]">Guideline: </span>
                    <span>Phrased with clear active verbs and relevant domain skills without inventing experience.</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Accept / Reject / Regenerate */}
              <div className="pt-2 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleRegenerate(item.id)}
                  disabled={regeneratingId === item.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-95 transition-all duration-150 disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw
                    className={`w-3.5 h-3.5 ${regeneratingId === item.id ? 'animate-spin' : ''}`}
                  />
                  Regenerate
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium active:scale-95 transition-all duration-150 cursor-pointer ${
                    isRejected
                      ? 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                      : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-rose-500 hover:border-rose-300 dark:hover:border-rose-800'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  {isRejected ? 'Restore' : 'Dismiss'}
                </button>

                <button
                  type="button"
                  onClick={() => handleApply(item.id, item.field)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold active:scale-95 transition-all duration-150 cursor-pointer ${
                    isAppliedToResume
                      ? 'border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                      : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white shadow-xs'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  {isAppliedToResume ? 'Re-Apply to Resume' : 'Apply to Resume'}
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

