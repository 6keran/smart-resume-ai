import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Wand2,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserImprovements } from '@/lib/db';

export const metadata = {
  title: 'My Resume Improvements | Smart Resume AI',
  description: 'Verified wording, summary, experience, and ATS keyword enhancements for your resume.',
};

export default async function UserImprovementsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login?from=/dashboard/improvements');
  }

  const improvements = await getUserImprovements(user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)] gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Resume Improvements
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Review saved wording improvements across your resumes ({improvements.length} total).
          </p>
        </div>
        <Link
          href="/improver"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-sm"
        >
          <Wand2 className="w-4 h-4" />
          <span>Open Resume Improver</span>
        </Link>
      </div>

      {improvements.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
            <Wand2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No improvements recorded yet
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1">
            Run an analysis or use the Resume Improver to save revised wording.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {improvements.map((imp) => (
            <div
              key={imp.id}
              className="bento-card hover:border-[var(--accent)]/40 p-5 sm:p-6 transition-all duration-200 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--glass-border)] gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--glass-border)] flex items-center justify-center shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                      {imp.title}
                    </h3>
                    <p className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {imp.resumeFilename}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(imp.createdAt).toLocaleDateString()}
                      </span>
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-center px-2.5 py-1 rounded-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[10px] font-bold uppercase text-[var(--accent)] tracking-wider">
                  {imp.category}
                </span>
              </div>

              {/* Before vs After Display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Before */}
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    <span>Original Formulation (Before)</span>
                    <span className="text-red-400 font-medium">Needs Polish</span>
                  </div>
                  <p className="p-3 rounded-lg bg-red-500/5 text-[var(--text-secondary)] border border-red-500/15 leading-relaxed font-mono text-[11px]">
                    {imp.beforeText}
                  </p>
                </div>

                {/* After */}
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--accent)]/30 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--accent)] uppercase tracking-wider">
                    <span>ATS Optimized Output (After)</span>
                    <span className="text-emerald-400 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3 h-3" />
                      Enhanced
                    </span>
                  </div>
                  <p className="p-3 rounded-lg bg-emerald-500/5 text-emerald-300 border border-emerald-500/20 leading-relaxed font-mono text-[11px]">
                    {imp.afterText}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
