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
  Copy,
  Edit3,
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

  const [resumeToRename, setResumeToRename] = useState<DashboardResumeItem | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null);

  const handleDuplicate = async (r: DashboardResumeItem) => {
    setIsDuplicatingId(r.id);
    setErrorMsg(null);
    try {
      const getRes = await fetch(`/api/user/resumes?id=${encodeURIComponent(r.id)}`);
      if (!getRes.ok) throw new Error('Failed to fetch resume data to duplicate.');
      const getData = await getRes.json();
      const resumeData = getData.resume?.resumeData || getData.resume?.resume_data;
      if (!resumeData) throw new Error('Resume content unavailable.');

      const copyName = `${r.filename} (Copy)`;
      const postRes = await fetch('/api/user/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createNew: true,
          filename: copyName,
          resumeData,
        }),
      });

      if (!postRes.ok) {
        const err = await postRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to duplicate resume.');
      }

      const postData = await postRes.json();
      const createdItem: DashboardResumeItem = {
        id: postData.resumeId || postData.resume?.id,
        filename: copyName,
        file_type: r.file_type,
        uploaded_at: new Date().toISOString(),
        isActive: false,
        analyses_count: 0,
        versionsCount: 1,
        latestAtsScore: r.latestAtsScore,
      };

      setResumes((prev) => [createdItem, ...prev]);
      setToastMsg(`Duplicated "${r.filename}" successfully!`);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error duplicating resume.');
    } finally {
      setIsDuplicatingId(null);
    }
  };

  const handleConfirmRename = async () => {
    if (!resumeToRename || !renameInput.trim()) return;
    setIsRenaming(true);
    setErrorMsg(null);
    try {
      const getRes = await fetch(`/api/user/resumes?id=${encodeURIComponent(resumeToRename.id)}`);
      if (!getRes.ok) throw new Error('Failed to fetch current resume details.');
      const getData = await getRes.json();
      const resumeData = getData.resume?.resumeData || getData.resume?.resume_data;
      if (!resumeData) throw new Error('Resume content unavailable.');

      const newName = renameInput.trim();
      const putRes = await fetch('/api/user/resumes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeId: resumeToRename.id,
          filename: newName,
          resumeData,
        }),
      });

      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to rename resume.');
      }

      setResumes((prev) =>
        prev.map((item) => (item.id === resumeToRename.id ? { ...item, filename: newName } : item))
      );
      setToastMsg(`Renamed resume to "${newName}".`);
      setResumeToRename(null);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error renaming resume.');
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[var(--border-color)] gap-4">
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
        <div className="reference-panel rounded-2xl border border-[var(--border-color)] bg-white p-12 text-center shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
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
                  r.isActive ? 'ring-2 ring-[var(--accent)]/30 border-[var(--accent)]' : 'border-[var(--border-color)]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/20 shadow-xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {r.isActive && (
                        <span className="text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </span>
                      )}
                      <span className="uppercase text-[12px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                        {r.file_type || 'PDF'}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)] break-words line-clamp-2">
                    {r.filename}
                  </h3>

                  <p className="text-[13px] text-[var(--text-secondary)] mt-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Uploaded {formatUploadDate(r.uploaded_at)}</span>
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[var(--text-secondary)]">
                        {r.analyses_count} {r.analyses_count === 1 ? 'Scan' : 'Scans'}
                      </span>
                      {r.versionsCount > 0 && (
                        <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                          {r.versionsCount} {r.versionsCount === 1 ? 'Version' : 'Versions'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[13px] font-medium text-[var(--text-secondary)]">ATS:</span>
                      <span
                        className={`text-[15px] font-extrabold ${
                          !hasScore
                            ? 'text-[var(--text-secondary)]'
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

                  <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[var(--border-color)] text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setResumeToRename(r);
                        setRenameInput(r.filename);
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      title="Rename this resume (e.g. Google Resume, Amazon Resume)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      <span>Rename</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDuplicatingId === r.id}
                      onClick={() => handleDuplicate(r)}
                      className="flex-1 py-1.5 px-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-primary)] text-[var(--text-primary)] font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Duplicate this resume"
                    >
                      {isDuplicatingId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                      )}
                      <span>Duplicate</span>
                    </button>

                    <button
                      type="button"
                      data-testid={`remove-resume-${r.id}`}
                      onClick={() => {
                        setErrorMsg(null);
                        setResumeToDelete(r);
                      }}
                      className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove resume"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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
          <div className="reference-panel w-full max-w-md rounded-2xl bg-white border border-[var(--border-color)] p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 id="remove-resume-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                  Remove Saved Resume?
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  This removes &quot;{resumeToDelete.filename}&quot; from your saved resumes. Past scan and application history remains intact.
                </p>
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
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

      {/* Rename Modal */}
      {resumeToRename && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-resume-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
        >
          <div className="reference-panel w-full max-w-md rounded-2xl bg-white border border-[var(--border-color)] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[var(--accent)]" />
                <h2 id="rename-resume-modal-title" className="text-base font-bold text-[var(--text-primary)]">
                  Rename Resume
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setResumeToRename(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-semibold text-[var(--text-primary)]">
                Resume Name (e.g. Google Resume, Amazon Resume, Senior SWE)
              </label>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                placeholder="Enter resume name..."
                autoFocus
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {errorMsg}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setResumeToRename(null)}
                disabled={isRenaming}
                className="btn-secondary-action py-2 px-4 text-xs cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                disabled={isRenaming || !renameInput.trim()}
                className="btn-primary-action py-2 px-4 text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRenaming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Name</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

