import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  FileSearch,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserAnalyses } from '@/lib/db';

export const metadata = {
  title: 'Resume Analyses | Smart Resume AI',
  description: 'Detailed ATS analysis history, scores, and keyword audits for your resumes.',
};

export default async function UserAnalysesPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login?from=/dashboard/analyses');
  }

  const analyses = await getUserAnalyses(user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)] gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Resume Analyses
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Historical ATS scoring, keyword benchmarks, and section audits ({analyses.length} total).
          </p>
        </div>
      </div>

      {analyses.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
            <FileSearch className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No analyses conducted yet
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1">
            Upload a resume to get an ATS score and keyword feedback.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {analyses.map((anl) => {
            const isHigh = anl.atsScore >= 75;
            const isMed = anl.atsScore >= 60 && anl.atsScore < 75;

            return (
              <div
                key={anl.id}
                className="bento-card p-5 sm:p-6 transition-all duration-200"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[var(--glass-border)] gap-4">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {anl.resumeFilename}
                      </h3>
                      <span className="uppercase text-[9px] font-bold px-2 py-0.5 rounded bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
                        {anl.fileType}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Scanned on {new Date(anl.analyzedAt).toLocaleString()}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-[var(--glass-bg)] px-4 py-2 rounded-xl border border-[var(--glass-border)] shadow-xs">
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] block">
                          ATS Score
                        </span>
                        <span
                          className={`text-2xl font-extrabold ${
                            isHigh ? 'text-emerald-400' : isMed ? 'text-amber-400' : 'text-red-400'
                          }`}
                        >
                          {anl.atsScore}/100
                        </span>
                      </div>
                      <div className="h-8 w-px bg-[var(--glass-border)] mx-1" />
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] block">
                          Keyword
                        </span>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {anl.keywordScore}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] block">
                          Formatting
                        </span>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {anl.formattingScore}%
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold uppercase text-[var(--text-secondary)] block">
                          Sections
                        </span>
                        <span className="text-sm font-bold text-[var(--text-primary)]">
                          {anl.sectionScore}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Keywords breakdown */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {anl.detectedKeywords && anl.detectedKeywords.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Detected Keywords ({anl.detectedKeywords.length})</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {anl.detectedKeywords.slice(0, 12).map((k: string) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {anl.missingKeywords && anl.missingKeywords.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)]">
                      <span className="font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Recommended Keywords ({anl.missingKeywords.length})</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {anl.missingKeywords.slice(0, 12).map((k: string) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]"
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
