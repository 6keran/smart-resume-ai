'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Users,
  ArrowLeft,
  Calendar,
  Clock,
  Mail,
  FileSearch,
  Award,
  BadgeCheck,
  Briefcase,
  Target,
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Star,
  MapPin,
  Globe,
  Tag,
  Trash2,
  AlertTriangle,
  X,
  AlertCircle,
  ShieldAlert,
  Edit2,
  Shield,
  Key,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

interface UserDetailData {
  user: {
    id: string;
    name: string;
    email: string | null;
    role?: string;
    is_active?: number;
    created_at: string;
    last_active_at: string;
  };
  resumes: any[];
  analyses: any[];
  assessments: any[];
  verifiedSkills: any[];
  searches: any[];
  matches: any[];
  feedback: any[];
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [data, setData] = useState<UserDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'analyses' | 'assessments' | 'skills' | 'jobs' | 'feedback'>('analyses');
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; email: string } | null>(null);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    is_active: 1,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Global feedback toast
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const openEditModal = () => {
    if (!data?.user) return;
    setEditForm({
      name: data.user.name,
      email: data.user.email || '',
      password: '',
      role: data.user.role || 'USER',
      is_active: data.user.is_active !== undefined ? data.user.is_active : 1,
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsEditing(true);
    setEditError(null);

    try {
      const payload: any = {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        is_active: editForm.is_active,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resJson = await res.json();

      if (!res.ok) {
        throw new Error(resJson.message || 'Failed to update user profile.');
      }

      setActionNotice({
        type: 'success',
        message: resJson.message || `User "${editForm.name}" updated successfully.`,
      });
      setShowEditModal(false);
      await fetchUserDetail();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEditError(msg);
    } finally {
      setIsEditing(false);
    }
  };

  const fetchCurrentAdmin = async () => {
    try {
      const res = await fetch('/api/admin/auth/me');
      if (res.ok) {
        const json = await res.json();
        if (json.admin) {
          setCurrentAdmin(json.admin);
        }
      }
    } catch {
      // ignore
    }
  };

  const fetchUserDetail = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/records?type=user_detail&id=${encodeURIComponent(userId)}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data || null);
      }
    } catch (err) {
      console.error('Failed to load user detail:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetail();
    fetchCurrentAdmin();
  }, [fetchUserDetail]);

  const handleDeleteUser = async () => {
    if (!userId) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });
      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(resData.message || 'Failed to delete user.');
      }

      router.push('/admin/users');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const isSelf = Boolean(
    data?.user &&
      currentAdmin &&
      (currentAdmin.id === data.user.id ||
        (data.user.email && currentAdmin.email.toLowerCase() === data.user.email.toLowerCase()))
  );

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <RefreshCw className="w-8 h-8 text-[var(--accent)] animate-spin" />
        <p className="text-sm font-semibold text-[var(--text-secondary)]">
          Loading user records from database...
        </p>
      </div>
    );
  }

  if (!data || !data.user) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-left space-y-4">
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Link>
        <GlassCard className="p-12 text-center space-y-3">
          <Users className="w-10 h-10 text-[var(--text-secondary)]/40 mx-auto" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">User Not Found</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            No profile exists in the database with ID: <span className="font-mono">{userId}</span>
          </p>
        </GlassCard>
      </div>
    );
  }

  const { user, resumes, analyses, assessments, verifiedSkills, searches, matches, feedback } = data;

  const passedAssessmentsCount = assessments.filter((a) => a.passed).length;
  const avgAtsScore = analyses.length > 0
    ? Math.round(analyses.reduce((sum, a) => sum + (a.ats_score || 0), 0) / analyses.length)
    : 0;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-left">
      {/* Back Button & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div className="space-y-2">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Users List
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-white font-bold text-xl flex items-center justify-center shadow-sm shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
                  {user.name}
                </h1>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  (user.role || '').toUpperCase() === 'ADMIN'
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                    : 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                }`}>
                  <Shield className="w-3 h-3" />
                  {user.role || 'USER'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                  user.is_active !== 0
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-zinc-500/15 text-zinc-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${user.is_active !== 0 ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
                  {user.is_active !== 0 ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-1">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="w-3.5 h-3.5" />
                  {user.email || <span className="italic">Not provided</span>}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Joined {new Date(user.created_at).toLocaleDateString()}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Active {new Date(user.last_active_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={fetchUserDetail}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteError(null);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold transition-all border border-red-500/20 active:scale-95 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove User</span>
          </button>
        </div>
      </div>

      {/* Global Action Banner */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm ${
            actionNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{actionNotice.message}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <GlassCard className="p-4 text-left">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Analyses</span>
            <FileSearch className="w-3.5 h-3.5 text-[var(--accent)]" />
          </div>
          <div className="text-xl font-black text-[var(--text-primary)]">
            {analyses.length}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">ATS evaluations</span>
        </GlassCard>

        <GlassCard className="p-4 text-left">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Avg ATS</span>
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-[var(--text-primary)]">
            {avgAtsScore > 0 ? `${avgAtsScore}/100` : '-'}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">Average score</span>
        </GlassCard>

        <GlassCard className="p-4 text-left">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Assessments</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-[var(--text-primary)]">
            {assessments.length}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">{passedAssessmentsCount} passed</span>
        </GlassCard>

        <GlassCard className="p-4 text-left">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Verified</span>
            <BadgeCheck className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">
            {verifiedSkills.length}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">Skills certified</span>
        </GlassCard>

        <GlassCard className="p-4 text-left">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Job Searches</span>
            <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-black text-[var(--text-primary)]">
            {searches.length}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">Queries logged</span>
        </GlassCard>

        <GlassCard className="p-4 text-left">
          <div className="flex items-center justify-between text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider mb-1">
            <span>Feedback</span>
            <MessageSquare className="w-3.5 h-3.5 text-pink-400" />
          </div>
          <div className="text-xl font-black text-[var(--text-primary)]">
            {feedback.length}
          </div>
          <span className="text-[10px] text-[var(--text-secondary)]">Reviews given</span>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-color)] overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('analyses')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'analyses'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <FileSearch className="w-4 h-4" />
          Resume Analyses ({analyses.length})
        </button>

        <button
          onClick={() => setActiveTab('assessments')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'assessments'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Award className="w-4 h-4" />
          Skill Assessments ({assessments.length})
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'skills'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <BadgeCheck className="w-4 h-4" />
          Verified Skills ({verifiedSkills.length})
        </button>

        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'jobs'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Job Searches ({searches.length})
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'feedback'
              ? 'border-[var(--accent)] text-[var(--accent)]'
              : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Feedback ({feedback.length})
        </button>
      </div>

      {/* Tab 1: Resume Analyses */}
      {activeTab === 'analyses' && (
        <GlassCard className="overflow-hidden">
          {analyses.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
              No resume analyses recorded for this user yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[var(--bg-elevated)]/50 border-b border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Filename</th>
                    <th className="py-3 px-4">Format</th>
                    <th className="py-3 px-4 text-center">ATS Score</th>
                    <th className="py-3 px-4 text-center">Keywords</th>
                    <th className="py-3 px-4 text-center">Formatting</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Analyzed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {analyses.map((a: any) => (
                    <tr key={a.id} className="hover:bg-[var(--bg-elevated)]/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--text-primary)]">
                          {a.filename || 'Pasted-Resume.txt'}
                        </div>
                        <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                          {a.id}
                        </div>
                      </td>
                      <td className="py-3 px-4 uppercase text-[11px] font-bold text-[var(--text-secondary)]">
                        {a.file_type}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                          a.ats_score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                          a.ats_score >= 60 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                          'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                        }`}>
                          {a.ats_score}/100
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[var(--text-primary)]">
                        {a.keyword_score}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-[var(--text-primary)]">
                        {a.formatting_score}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase">
                          <CheckCircle2 className="w-3 h-3" />
                          {a.analysis_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-[var(--text-secondary)]">
                        {new Date(a.analyzed_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Tab 2: Skill Assessments */}
      {activeTab === 'assessments' && (
        <GlassCard className="overflow-hidden">
          {assessments.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
              No skill assessment attempts taken by this user yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[var(--bg-elevated)]/50 border-b border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Skill</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4 text-center">Result</th>
                    <th className="py-3 px-4 text-center">Duration</th>
                    <th className="py-3 px-4 text-center">Violations</th>
                    <th className="py-3 px-4 text-right">Completed At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {assessments.map((att: any) => (
                    <tr key={att.id} className="hover:bg-[var(--bg-elevated)]/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                        {att.skill}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-sm text-[var(--text-primary)]">
                        {att.score} / {att.total_questions} ({att.total_questions > 0 ? Math.round((att.score / att.total_questions) * 100) : 0}%)
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            att.passed
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {att.passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {att.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-xs text-[var(--text-secondary)] font-mono">
                        {Math.floor((att.duration_seconds || 0) / 60)}m {(att.duration_seconds || 0) % 60}s
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-xs text-[var(--text-secondary)]">
                        {att.proctoring_violation_count || 0}
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-[var(--text-secondary)]">
                        {att.completed_at ? new Date(att.completed_at).toLocaleString() : 'In Progress'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Tab 3: Verified Skills */}
      {activeTab === 'skills' && (
        <GlassCard className="p-6">
          {verifiedSkills.length === 0 ? (
            <div className="text-center py-8 text-xs text-[var(--text-secondary)]">
              No verified skill credentials earned yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {verifiedSkills.map((vs: any) => (
                <div
                  key={vs.id}
                  className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-base text-[var(--text-primary)]">
                      {vs.skill_name}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" />
                      VERIFIED
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    Verified on {new Date(vs.verified_at || vs.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Tab 4: Job Searches */}
      {activeTab === 'jobs' && (
        <GlassCard className="overflow-hidden">
          {searches.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
              No job searches conducted by this user yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[var(--bg-elevated)]/50 border-b border-[var(--border-color)] text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Search Query</th>
                    <th className="py-3 px-4">Target Location</th>
                    <th className="py-3 px-4">Data Provider</th>
                    <th className="py-3 px-4 text-center">Results Returned</th>
                    <th className="py-3 px-4 text-right">Searched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {searches.map((j: any) => (
                    <tr key={j.id} className="hover:bg-[var(--bg-elevated)]/20 transition-colors">
                      <td className="py-3 px-4 font-bold text-[var(--text-primary)]">
                        {j.query}
                      </td>
                      <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[var(--accent)]" />
                          {j.location || 'India'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase">
                          <Globe className="w-3 h-3" />
                          {j.provider}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-black text-xs text-emerald-400">
                        {j.results_count} listings
                      </td>
                      <td className="py-3 px-4 text-right text-xs text-[var(--text-secondary)]">
                        {new Date(j.searched_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      )}

      {/* Tab 5: Feedback */}
      {activeTab === 'feedback' && (
        <GlassCard className="overflow-hidden">
          {feedback.length === 0 ? (
            <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
              No feedback submissions from this user yet.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {feedback.map((item: any) => (
                <div key={item.id} className="p-5 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            star <= item.rating
                              ? 'text-amber-400 fill-amber-400'
                              : 'text-zinc-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                      {item.category}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                      item.status === 'reviewed'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-medium text-[var(--text-primary)]">
                    &ldquo;{item.message}&rdquo;
                  </p>

                  {item.suggestions && (
                    <div className="text-xs text-[var(--text-secondary)] p-2 rounded-lg bg-[var(--bg-elevated)]/40 border border-[var(--border-color)]">
                      <span className="font-semibold text-[var(--text-primary)]">Suggestions: </span>
                      {item.suggestions}
                    </div>
                  )}

                  <div className="text-[10px] text-[var(--text-secondary)]">
                    Submitted: {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl p-6 space-y-5 text-left">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 border border-red-500/20">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Remove User Account
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Confirm deletion of candidate profile and associated records.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {deleteError && (
              <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Self Deletion Prohibition Notice */}
            {isSelf ? (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Self-Deletion Prohibited</p>
                  <p className="text-[11px] mt-1 text-amber-200/80 leading-relaxed">
                    You are currently authenticated as this administrator account. Administrators cannot delete their own account from the Admin Console.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Account Details Box */}
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Candidate Name:</span>
                    <span className="font-bold text-[var(--text-primary)]">{user.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Email Address:</span>
                    <span className="font-mono text-[var(--text-primary)]">{user.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">User Identifier:</span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">{user.id}</span>
                  </div>
                </div>

                {/* Impact Summary */}
                <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  <p className="font-semibold text-[var(--text-primary)]">
                    Associated candidate data that will be permanently purged:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-[var(--text-muted)]">
                    <li>{resumes.length} uploaded resumes and version histories</li>
                    <li>{analyses.length} ATS analyses and keyword score logs</li>
                    <li>{assessments.length} assessment attempts and question snapshots</li>
                    <li>{verifiedSkills.length} verified skills and issued certificates</li>
                    <li>{searches.length} job search records and application entries</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 text-[11px] text-red-400">
                  <span className="font-bold">Warning:</span> This action is permanent and cannot be undone.
                </div>
              </>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] transition-all"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeleting || isSelf}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-red-600/20"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing Account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Remove User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl p-6 space-y-5 text-left">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/25">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Edit User Account
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Update profile details and administrative permissions.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowEditModal(false)}
                disabled={isEditing}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editError && (
              <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="e.g. user@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                  <span>Update Password (Optional)</span>
                </label>
                <input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leave blank to keep current password"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                  >
                    <option value="USER">User (Candidate)</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Account Status
                  </label>
                  <select
                    value={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: parseInt(e.target.value, 10) })}
                    className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Inactive / Suspended</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={isEditing}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditing}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold disabled:opacity-50 transition-all shadow-md"
                >
                  {isEditing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
