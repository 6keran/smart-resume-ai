import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FileText, Clock } from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserResumes } from '@/lib/db';

export const metadata = {
  title: 'My Resumes | Smart Resume AI',
  description: 'Manage and track all your uploaded resumes and ATS scans.',
};

export default async function UserResumesPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login?from=/dashboard/resumes');
  }

  const resumes = await getUserResumes(user.id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[var(--border-color)] gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            My Resumes
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            All resume documents uploaded to your Smart Resume AI account ({resumes.length} total).
          </p>
        </div>
      </div>

      {resumes.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No resumes uploaded yet
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1">
            Upload a PDF or DOCX resume to see it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {resumes.map((r) => {
            const hasScore = r.latestAtsScore !== null;
            return (
              <div
                key={r.id}
                className="bento-card p-5 sm:p-6 flex flex-col justify-between transition-all duration-200 hover:border-[var(--accent)]/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <span className="uppercase text-[10px] font-bold px-2.5 py-1 rounded-md bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)]">
                      {r.file_type || 'PDF'}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)] break-words line-clamp-2">
                    {r.filename}
                  </h3>

                  <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Uploaded {new Date(r.uploaded_at).toLocaleDateString()}</span>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--glass-border)]">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)]">
                        {r.analyses_count} {r.analyses_count === 1 ? 'Scan' : 'Scans'}
                      </span>
                      {r.versionsCount > 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                          {r.versionsCount} {r.versionsCount === 1 ? 'Version' : 'Versions'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">ATS:</span>
                      <span
                        className={`text-sm font-extrabold ${
                          !hasScore
                            ? 'text-[var(--text-secondary)]'
                            : r.latestAtsScore >= 75
                            ? 'text-emerald-400'
                            : r.latestAtsScore >= 60
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {hasScore ? `${r.latestAtsScore}/100` : 'Not Scored'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Link
                      href={`/builder?resumeId=${r.id}`}
                      className="btn-primary btn-sm text-xs font-semibold text-center flex items-center justify-center gap-1 shadow-sm"
                    >
                      <span>Builder</span>
                    </Link>
                    <Link
                      href="/analyzer"
                      className="btn-secondary btn-sm text-xs font-semibold text-center text-[var(--text-primary)] flex items-center justify-center"
                      title="Run new scan on this resume"
                    >
                      <span>Re-scan</span>
                    </Link>
                    <Link
                      href="/dashboard/analyses"
                      className="btn-secondary btn-sm text-xs font-semibold text-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center"
                    >
                      <span>Scans</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
