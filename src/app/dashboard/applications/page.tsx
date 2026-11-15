'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Send,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  ExternalLink,
  MapPin,
  Building,
  Calendar,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  Bookmark,
  Sparkles,
} from 'lucide-react';

interface JobApplication {
  id: string;
  user_id: string;
  job_id: string | null;
  job_title: string;
  company: string;
  location: string | null;
  source: string | null;
  job_url: string | null;
  applied_at: string;
  status:
    | 'Saved'
    | 'Ready to apply'
    | 'Application pending'
    | 'Applied'
    | 'Interview'
    | 'Offer'
    | 'Rejected'
    | 'Withdrawn';
  notes: string | null;
  resume_id: string | null;
  applied_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_OPTIONS = [
  'All',
  'Saved',
  'Ready to apply',
  'Application pending',
  'Applied',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
] as const;

function ApplicationsContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'All';

  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formSource, setFormSource] = useState('Manual');
  const [formJobUrl, setFormJobUrl] = useState('');
  const [formAppliedAt, setFormAppliedAt] = useState('');
  const [formStatus, setFormStatus] = useState<JobApplication['status']>('Applied');
  const [formNotes, setFormNotes] = useState('');

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/applications');
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    const s = searchParams.get('status');
    if (s && STATUS_OPTIONS.includes(s as any)) {
      setFilterStatus(s);
    }
  }, [searchParams]);

  const openCreateModal = () => {
    setEditingApp(null);
    setFormTitle('');
    setFormCompany('');
    setFormLocation('');
    setFormSource('Manual');
    setFormJobUrl('');
    setFormAppliedAt(new Date().toISOString().split('T')[0]);
    setFormStatus('Applied');
    setFormNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (app: JobApplication) => {
    setEditingApp(app);
    setFormTitle(app.job_title);
    setFormCompany(app.company);
    setFormLocation(app.location || '');
    setFormSource(app.source || 'Manual');
    setFormJobUrl(app.job_url || '');
    setFormAppliedAt(app.applied_at || '');
    setFormStatus(app.status);
    setFormNotes(app.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleQuickStatusChange = async (appId: string, newStatus: JobApplication['status']) => {
    try {
      const res = await fetch('/api/user/applications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: appId,
          status: newStatus,
        }),
      });

      if (res.ok) {
        setApplications((prev) =>
          prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
        );
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formTitle.trim() || !formCompany.trim()) {
      setFormError('Please enter both the Job Title and Company name.');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        id: editingApp?.id,
        jobTitle: formTitle.trim(),
        company: formCompany.trim(),
        location: formLocation.trim() || null,
        source: formSource.trim() || 'Manual',
        jobUrl: formJobUrl.trim() || null,
        appliedAt: formAppliedAt || new Date().toISOString().split('T')[0],
        status: formStatus,
        notes: formNotes.trim() || null,
      };

      const method = editingApp ? 'PUT' : 'POST';
      const res = await fetch('/api/user/applications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to save application');
      }

      setIsModalOpen(false);
      await fetchApplications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this application record?')) {
      return;
    }

    try {
      const res = await fetch(`/api/user/applications?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setApplications((prev) => prev.filter((app) => app.id !== id));
      } else {
        const data = await res.json();
        alert(data.message || 'Failed to delete application');
      }
    } catch (err) {
      console.error('Failed to delete application:', err);
    }
  };

  const filteredApplications = applications.filter((app) => {
    const matchesStatus = filterStatus === 'All' || app.status === filterStatus;
    const matchesSearch =
      app.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.location && app.location.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: JobApplication['status']) => {
    switch (status) {
      case 'Saved':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Ready to apply':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Application pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Applied':
        return 'bg-blue-50 text-[#3157C8] border-blue-200';
      case 'Interview':
        return 'bg-blue-100/70 text-blue-800 border-blue-200';
      case 'Offer':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Withdrawn':
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-[#E5E8ED] shadow-sm p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="heading-page">
            Job Applications
          </h1>
          <p className="text-body-secondary mt-1">
            Track, update, and manage every stage of your job hunt ({applications.length} total records).
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={openCreateModal}
            className="btn-primary-action inline-flex items-center gap-2 py-2 px-4 text-[14px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Application</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#E5E8ED] shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#626B78]" />
          <input
            type="text"
            placeholder="Search by job title, company, or city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-[14px] text-[#20242B] placeholder-[#626B78]/60 focus:outline-none focus:border-[#3157C8] focus:bg-white"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {STATUS_OPTIONS.map((st) => {
            const count =
              st === 'All'
                ? applications.length
                : applications.filter((a) => a.status === st).length;

            return (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-[14px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  filterStatus === st
                    ? 'bg-[#3157C8] text-white shadow-xs'
                    : 'bg-[#F6F7F9] text-[#626B78] hover:text-[#20242B] border border-[#E5E8ED]'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-[12px] px-1.5 py-0.2 rounded-full ${
                    filterStatus === st ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#626B78]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent)] mb-3" />
          <p className="text-xs text-[var(--text-secondary)]">Loading your job applications...</p>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
            <Send className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No applications match your criteria
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1 mb-6">
            Keep track of every role you apply for, from initial application to offer letter.
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-md shadow-[var(--accent)]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Your First Application</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-2xl border border-[#E5E8ED] shadow-sm p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-slate-300"
            >
              <div className="min-w-0 space-y-2 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-bold text-[#20242B]">
                    {app.job_title}
                  </h3>

                  <span
                    className={`px-3 py-1 rounded-full text-[12px] font-bold border ${getStatusColor(
                      app.status
                    )}`}
                  >
                    {app.status}
                  </span>

                  {app.source && (
                    <span className="text-[12px] font-medium text-[#626B78] px-2 py-0.5 rounded-md bg-[#F6F7F9] border border-[#E5E8ED]">
                      {app.source}
                    </span>
                  )}

                  {app.applied_confirmed_at && (
                    <span className="text-[12px] text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-semibold border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Confirmed Applied
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-[14px] text-[#626B78]">
                  <span className="flex items-center gap-1.5 font-semibold text-[#20242B]">
                    <Building className="w-4 h-4 text-[#3157C8]" />
                    {app.company}
                  </span>
                  {app.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      {app.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Applied: {new Date(app.applied_at).toLocaleDateString()}
                  </span>
                </div>

                {app.notes && (
                  <p className="text-[14px] text-[#626B78] italic bg-[#F6F7F9] px-3.5 py-2 rounded-xl border border-[#E5E8ED]">
                    &ldquo;{app.notes}&rdquo;
                  </p>
                )}
              </div>

              {/* Status Selector & Actions */}
              <div className="flex items-center gap-2.5 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#E5E8ED]">
                {/* Inline Status Dropdown */}
                <select
                  value={app.status}
                  onChange={(e) =>
                    handleQuickStatusChange(app.id, e.target.value as JobApplication['status'])
                  }
                  className="text-[14px] font-semibold px-3 py-1.5 rounded-xl border border-[#E5E8ED] bg-[#F6F7F9] text-[#20242B] focus:outline-none focus:border-[#3157C8] cursor-pointer"
                >
                  <option value="Saved">Saved</option>
                  <option value="Ready to apply">Ready to apply</option>
                  <option value="Application pending">Application pending</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>

                {app.job_url && (
                  <a
                    href={app.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl border border-[#E5E8ED] bg-[#F6F7F9] text-[#626B78] hover:text-[#20242B] hover:border-[#3157C8] transition-all cursor-pointer"
                    title="View Job Listing"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <button
                  onClick={() => openEditModal(app)}
                  className="p-2 rounded-xl border border-[#E5E8ED] bg-[#F6F7F9] text-[#626B78] hover:text-[#20242B] hover:border-[#3157C8] transition-all cursor-pointer"
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(app.id)}
                  className="p-2 rounded-xl border border-[#E5E8ED] bg-[#F6F7F9] text-[#626B78] hover:text-rose-600 hover:border-rose-300 transition-all cursor-pointer"
                  title="Delete application"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#20242B]/40 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E5E8ED] shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E8ED]">
              <h3 className="heading-card">
                {editingApp ? 'Edit Job Application' : 'Track New Job Application'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-[#626B78] hover:text-[#20242B] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[14px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="label-form block mb-1">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-base text-[#20242B] focus:outline-none focus:border-[#3157C8] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="label-form block mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    placeholder="e.g. Stripe"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-base text-[#20242B] focus:outline-none focus:border-[#3157C8] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="label-form block mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. San Francisco / Remote"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-base text-[#20242B] focus:outline-none focus:border-[#3157C8] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="label-form block mb-1">
                    Source
                  </label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    placeholder="e.g. LinkedIn / Naukri"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-base text-[#20242B] focus:outline-none focus:border-[#3157C8] focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="label-form block mb-1">
                  Job Posting URL
                </label>
                <input
                  type="url"
                  value={formJobUrl}
                  onChange={(e) => setFormJobUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-base text-[#20242B] focus:outline-none focus:border-[#3157C8] focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="label-form block mb-1">
                    Applied Date
                  </label>
                  <input
                    type="date"
                    value={formAppliedAt}
                    onChange={(e) => setFormAppliedAt(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-base text-[#20242B] focus:outline-none focus:border-[#3157C8] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="label-form block mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as JobApplication['status'])}
                    className="w-full px-3.5 py-2 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-base text-[#20242B] focus:outline-none focus:border-[#3157C8] focus:bg-white cursor-pointer"
                  >
                    <option value="Saved">Saved</option>
                    <option value="Ready to apply">Ready to apply</option>
                    <option value="Application pending">Application pending</option>
                    <option value="Applied">Applied</option>
                    <option value="Interview">Interview</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Withdrawn">Withdrawn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label-form block mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Recruiter contact, interview questions asked, follow-up dates..."
                  className="w-full p-3.5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-base text-[#20242B] focus:outline-none focus:border-[#3157C8] focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary-action cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary-action py-2.5 px-5 text-[15px] cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingApp ? 'Save Changes' : 'Create Application'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-xs text-[var(--text-secondary)]">
          Loading application tracker...
        </div>
      }
    >
      <ApplicationsContent />
    </Suspense>
  );
}
