'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  FileEdit,
  Sparkles,
  Plus,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import type { ResumeProgressItem } from './DashboardContent';

interface DashboardResumeDeckProps {
  resumeProgress: ResumeProgressItem[];
  avgAtsScore: number;
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

export default function DashboardResumeDeck({
  resumeProgress = [],
  avgAtsScore,
}: DashboardResumeDeckProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeResume =
    resumeProgress.length > 0
      ? resumeProgress[selectedIndex] || resumeProgress[0]
      : null;

  if (!activeResume) {
    return (
      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--accent)]" />
            <span>Resume Status</span>
          </h3>
          <Link
            href="/builder"
            className="text-xs text-[var(--accent)] font-semibold hover:underline"
          >
            Create Resume
          </Link>
        </div>

        <div className="text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] flex items-center justify-center mx-auto text-[var(--text-muted)]">
            <FileText className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              No active resume found
            </h4>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs mx-auto">
              Create an ATS-parseable resume in our visual editor or upload your existing document.
            </p>
          </div>
          <Link
            href="/builder"
            className="btn-primary text-xs py-2 px-4 rounded-lg inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your Resume</span>
          </Link>
        </div>
      </div>
    );
  }

  const score = activeResume.latestScore ?? Math.round(avgAtsScore);
  const circumference = 2 * Math.PI * 26; // r=26
  const strokeDashoffset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-xs space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Resume Status
          </h3>
          {resumeProgress.length > 1 && (
            <span className="text-[10px] font-mono text-[var(--text-muted)]">
              [{selectedIndex + 1}/{resumeProgress.length}]
            </span>
          )}
        </div>
        <Link
          href="/dashboard/resumes"
          className="text-xs text-[var(--accent)] font-semibold hover:underline inline-flex items-center gap-1"
        >
          <span>Manage All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ── Active Resume Feature Card ── */}
      <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Metadata */}
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm sm:text-base text-[var(--text-primary)] truncate">
              {activeResume.filename}
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 uppercase shrink-0">
              Active
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] font-mono">
            <Clock className="w-3 h-3" />
            <span>Updated {formatDate(activeResume.uploadedAt)}</span>
            {activeResume.fileType && (
              <>
                <span>•</span>
                <span className="uppercase">{activeResume.fileType}</span>
              </>
            )}
          </div>

          {activeResume.improvement !== null && activeResume.improvement !== 0 && (
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 pt-0.5">
              <TrendingUp className="w-3 h-3" />
              <span>
                {activeResume.improvement > 0 ? `+${activeResume.improvement}` : activeResume.improvement} pts since last revision
              </span>
            </div>
          )}
        </div>

        {/* Right: Circular Score Gauge */}
        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
              <circle
                cx="30"
                cy="30"
                r="26"
                className="stroke-[var(--border-color)]"
                strokeWidth="5"
                fill="none"
              />
              <circle
                cx="30"
                cy="30"
                r="26"
                className="stroke-[var(--accent)] transition-all duration-500 ease-out"
                strokeWidth="5"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-mono font-extrabold text-[var(--text-primary)] leading-none">
                {score ? `${score}%` : 'N/A'}
              </span>
              <span className="text-[9px] font-mono text-[var(--text-muted)] uppercase mt-0.5">
                ATS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Multi-Resume Selector Strip (if > 1) ── */}
      {resumeProgress.length > 1 && (
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Saved Documents ({resumeProgress.length})
          </span>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {resumeProgress.map((r, idx) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                  selectedIndex === idx
                    ? 'bg-[var(--accent)] text-white shadow-xs font-bold'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
              >
                <span className="truncate max-w-[120px]">{r.filename}</span>
                {r.latestScore !== null && (
                  <span className={`text-[10px] font-bold ${selectedIndex === idx ? 'text-white/80' : 'text-[var(--accent)]'}`}>
                    {r.latestScore}%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Action Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1">
        <Link
          href={`/builder?resumeId=${activeResume.id}`}
          className="btn-primary text-xs py-2 px-3.5 rounded-lg inline-flex items-center gap-1.5 shadow-xs"
        >
          <FileEdit className="w-3.5 h-3.5" />
          <span>Edit in Builder</span>
        </Link>
        <Link
          href="/analyzer"
          className="btn-secondary text-xs py-2 px-3.5 rounded-lg inline-flex items-center gap-1.5 hover:border-[var(--accent)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Run ATS Scan</span>
        </Link>
      </div>
    </div>
  );
}

