'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  Award,
  FileText,
  Send,
  FolderGit2,
  CheckCircle2,
  Briefcase,
  ChevronRight,
  Filter,
} from 'lucide-react';
import type { CareerTimelineItem } from '@/types/career';
import type { RecentApplicationItem } from './DashboardContent';

interface InteractiveCareerMilestonesProps {
  timeline: CareerTimelineItem[];
  recentApplications: RecentApplicationItem[];
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

export default function InteractiveCareerMilestones({
  timeline = [],
  recentApplications = [],
}: InteractiveCareerMilestonesProps) {
  const [filter, setFilter] = useState<'all' | 'resume' | 'credential' | 'application'>('all');

  // Synthesize events if timeline has items or fall back to application items
  const rawItems = timeline.length > 0
    ? timeline
    : recentApplications.map((app) => ({
        id: app.id,
        type: 'job_applied' as const,
        title: `Applied: ${app.job_title}`,
        description: `${app.company}${app.location ? ` • ${app.location}` : ''} (${app.status})`,
        timestamp: app.applied_at || app.created_at || new Date().toISOString(),
        badge: app.status,
      }));

  const filteredItems = rawItems.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'resume') {
      return item.type === 'resume_analyzed' || item.title.toLowerCase().includes('resume');
    }
    if (filter === 'credential') {
      return (
        item.type === 'assessment_completed' ||
        item.type === 'certificate_earned' ||
        item.title.toLowerCase().includes('assessment') ||
        item.title.toLowerCase().includes('certificate') ||
        item.title.toLowerCase().includes('skill')
      );
    }
    if (filter === 'application') {
      return (
        item.type === 'job_applied' ||
        item.title.toLowerCase().includes('applied') ||
        item.title.toLowerCase().includes('application')
      );
    }
    return true;
  });

  const getEventIcon = (type?: string, title?: string) => {
    const t = (type || '').toLowerCase();
    const txt = (title || '').toLowerCase();
    if (t.includes('certificate') || txt.includes('certificate') || t.includes('assessment')) {
      return Award;
    }
    if (t.includes('project') || txt.includes('project')) {
      return FolderGit2;
    }
    if (t.includes('resume') || txt.includes('resume')) {
      return FileText;
    }
    if (t.includes('apply') || txt.includes('applied') || t.includes('job')) {
      return Send;
    }
    return CheckCircle2;
  };

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 shadow-xs space-y-4">
      {/* ── Header & Category Filter ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-color)] pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Career Activity &amp; Milestones
          </h3>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'resume', label: 'Resumes' },
              { key: 'credential', label: 'Skills' },
              { key: 'application', label: 'Applications' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-[var(--accent)] text-white font-bold shadow-xs'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Milestones Activity Feed ── */}
      {filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.slice(0, 5).map((item, idx) => {
            const Icon = getEventIcon(item.type, item.title);

            return (
              <div
                key={item.id || idx}
                className="p-3.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/70 transition-colors flex items-start gap-3.5"
              >
                <div className="w-8 h-8 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--accent)] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">
                      {item.title}
                    </p>
                    <span className="text-[10px] font-mono text-[var(--text-muted)] shrink-0">
                      {formatDate(item.timestamp)}
                    </span>
                  </div>

                  <p className="text-[11px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>

                  {item.badge && (
                    <span className="inline-block text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-muted)] uppercase mt-0.5">
                      {item.badge}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            No milestones found for this category.
          </p>
          <div className="flex justify-center gap-2 pt-1 text-xs">
            <Link href="/builder" className="text-[var(--accent)] font-semibold hover:underline">
              Create Resume
            </Link>
            <span className="text-[var(--text-muted)]">•</span>
            <Link href="/skills" className="text-[var(--accent)] font-semibold hover:underline">
              Take Assessment
            </Link>
            <span className="text-[var(--text-muted)]">•</span>
            <Link href="/jobs" className="text-[var(--accent)] font-semibold hover:underline">
              Search Roles
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

