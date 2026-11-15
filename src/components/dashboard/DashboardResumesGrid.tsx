'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Clock,
  Plus,
  FileEdit,
  Check,
  Sparkles,
  Trash2,
  AlertTriangle,
  Loader2,
  X,
} from 'lucide-react';

export interface DashboardResumeItem {
  id: string;
  filename: string;
  file_type: string | null;
  uploaded_at: string;
  isActive: boolean;
  analyses_count: number;
  versionsCount: number;
  latestAtsScore: number | null;
}

interface DashboardResumesGridProps {
  initialResumes: DashboardResumeItem[];
}

function formatUploadDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function DashboardResumesGrid({ initialResumes }: DashboardResumesGridProps) {
  const router = useRouter();
  const [resumes, setResumes] = useState<DashboardResumeItem[]>(initialResumes);
  const [resumeToDelete, setResumeToDelete] = useState<DashboardResumeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    setResumes(initialResumes);
  }, [initialResumes]);

  useEffect(() => {
    if (!toastMsg) return;
    const timer = setTimeout(() => setToastMsg(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMsg]);

  const handleConfirmDelete = async () => {
    if (!resumeToDelete) return;
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/user/resumes?id=${encodeURIComponent(resumeToDelete.id)}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 404) {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.message || 'Failed to remove resume.');
        setIsDeleting(false);
        return;
      }

      const data = await res.json().catch(() => ({}));
      const remainingRaw = resumes.filter((item) => item.id !== resumeToDelete.id);
      const nextActiveId: string | null =
        data.nextActiveResumeId && remainingRaw.some((item) => item.id === data.nextActiveResumeId)
          ? data.nextActiveResumeId
          : remainingRaw.find((item) => item.isActive)?.id || remainingRaw[0]?.id || null;

      const updated = remainingRaw.map((item) => ({
        ...item,
        isActive: nextActiveId ? item.id === nextActiveId : false,
      }));

      try {
        const savedRaw = localStorage.getItem('sra_resume_data');
        if (savedRaw) {
          const parsed = JSON.parse(savedRaw);
          if (parsed?.id === resumeToDelete.id || updated.length === 0) {
            localStorage.removeItem('sra_resume_data');
          }
        }
      } catch {
        // ignore storage access issues
      }

      setResumes(updated);
      setToastMsg(`Removed "${resumeToDelete.filename}".`);
      setResumeToDelete(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error while removing resume.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#E5E8ED] gap-4">
        <div>
          <h1 className="heading-page">My Resumes</h1>
          <p className="text-body-secondary mt-1">
            Manage, edit, and tailor your resumes in the unified Resume Editor ({resumes.length} saved).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/builder"
            className="btn-primary-action inline-flex items-center gap-2 py-2.5 px-4 text-[14px]"
          >
            <Plus className="w-4 h-4" />
            <span>Open Resume Editor</span>
          </Link>
        </div>
      </div>

      {toastMsg && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 flex items-center justify-between gap-3"
        >
          <span>{toastMsg}</span>
          <button
            type="button"
            onClick={() => setToastMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {resumes.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E8ED] bg-white p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[#F6F7F9] border border-[#E5E8ED] flex items-center justify-center mx-auto mb-4 text-[#626B78]">
            <FileText className="w-7 h-7" />
          </div>
          <h3 className="heading-card">No resumes saved yet</h3>
          <p className="text-body-secondary max-w-sm mx-auto mt-1 mb-5">
            Create a resume in our professional editor or upload your existing PDF/DOCX resume to get started.
          </p>
          <Link
            href="/builder"
            className="btn-primary-action inline-flex items-center gap-2 py-2.5 px-5 text-[15px]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Your First Resume</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resumes.map((r) => {
            const hasScore = r.latestAtsScore !== null;
            return (
              <div
                key={r.id}
                data-testid={`resume-card-${r.id}`}
                className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all duration-200 hover:border-slate-300 shadow-sm ${
                  r.isActive ? 'ring-2 ring-[#3157C8]/30 border-[#3157C8]' : 'border-[#E5E8ED]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[#3157C8]/10 text-[#3157C8] flex items-center justify-center shrink-0 border border-[#3157C8]/20 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {r.isActive && (
                        <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      )}
                      <span className="uppercase text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-[#F6F7F9] border border-[#E5E8ED] text-[#626B78]">
                        {r.file_type || 'PDF'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[#20242B] break-words line-clamp-2">
                    {r.filename}
                  </h3>

                  <p className="text-[13px] text-[#626B78] mt-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Uploaded {formatUploadDate(r.uploaded_at)}</span>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#E5E8ED]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#626B78]">
                        {r.analyses_count} {r.analyses_count === 1 ? 'Scan' : 'Scans'}
                      </span>
                      {r.versionsCount > 0 && (
                        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[#3157C8]/10 text-[#3157C8] border border-[#3157C8]/20">
                          {r.versionsCount} {r.versionsCount === 1 ? 'Version' : 'Versions'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-[#626B78]">ATS:</span>
                      <span
                        className={`text-[15px] font-extrabold ${
                          !hasScore
                            ? 'text-[#626B78]'
                            : (r.latestAtsScore ?? 0) >= 75
                            ? 'text-emerald-700'
                            : (r.latestAtsScore ?? 0) >= 60
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {hasScore ? `${r.latestAtsScore}/100` : 'Not Scored'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Link
                      href={`/builder?resumeId=${r.id}`}
                      className="btn-primary-action py-2 text-[13px] text-center flex items-center justify-center gap-1"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </Link>
                    <Link
                      href="/analyzer"
                      className="btn-secondary-action py-2 text-[13px] text-center flex items-center justify-center gap-1"
                      title="Run new scan on this resume"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Scan</span>
                    </Link>
                    <Link
                      href="/dashboard/analyses"
                      className="btn-secondary-action py-2 text-[13px] text-center flex items-center justify-center"
                    >
                      <span>History</span>
                    </Link>
                  </div>

                  <button
                    type="button"
                    data-testid={`remove-resume-${r.id}`}
                    onClick={() => {
                      setErrorMsg(null);
                      setResumeToDelete(r);
                    }}
                    className="mt-2.5 w-full py-2 px-3 rounded-xl border border-transparent hover:border-rose-200 hover:bg-rose-50 text-rose-600 text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Resume</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {resumeToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-resume-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E5E8ED] p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 id="remove-resume-modal-title" className="text-base font-bold text-[#20242B]">
                  Remove Saved Resume?
                </h2>
                <p className="text-xs text-[#626B78] mt-0.5">
                  This removes &quot;{resumeToDelete.filename}&quot; from your saved resumes. Past scan and application history remains intact.
                </p>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E8ED]">
              <button
                type="button"
                onClick={() => {
                  setResumeToDelete(null);
                  setErrorMsg(null);
                }}
                disabled={isDeleting}
                className="btn-secondary-action py-2 px-4 text-xs cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                data-testid="confirm-remove-resume"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Removal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

