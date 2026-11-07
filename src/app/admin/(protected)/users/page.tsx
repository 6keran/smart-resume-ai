'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  RefreshCw,
  ChevronRight,
  UserCheck,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  UserPlus,
  Edit2,
  Shield,
  Key,
  ChevronLeft,
  ChevronRight as ChevronNext,
  Filter,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

interface UserListItem {
  id: string;
  name: string;
  email: string | null;
  role: string;
  is_active: number;
  created_at: string;
  last_active_at: string;
  resumes_count: number;
  analyses_count: number;
  searches_count: number;
  assessments_count: number;
  verified_skills_count: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'USER'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; email: string } | null>(null);

  // Add User modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    is_active: 1,
  });
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Edit User modal state
  const [userToEdit, setUserToEdit] = useState<UserListItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'USER',
    is_active: 1,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Deletion modal state
  const [userToDelete, setUserToDelete] = useState<UserListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Global Feedback Toast
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter !== 'ALL') params.set('role', roleFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
        if (json.pagination) {
          setTotalCount(json.pagination.total);
          setTotalPages(json.pagination.totalPages);
        }
      } else {
        // Fallback to records API if needed
        const fallbackRes = await fetch('/api/admin/records?type=users');
        if (fallbackRes.ok) {
          const fbJson = await fallbackRes.json();
          setUsers(fbJson.data || []);
          setTotalCount((fbJson.data || []).length);
          setTotalPages(1);
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
    fetchCurrentAdmin();
  }, [fetchUsers]);

  // Handle Add User
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    setAddError(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create user account.');
      }

      setFeedback({
        type: 'success',
        message: data.message || `User account "${addForm.name}" created successfully.`,
      });
      setShowAddModal(false);
      setAddForm({ name: '', email: '', password: '', role: 'USER', is_active: 1 });
      await fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAddError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (u: UserListItem) => {
    setUserToEdit(u);
    setEditForm({
      name: u.name,
      email: u.email || '',
      password: '',
      role: u.role || 'USER',
      is_active: u.is_active !== undefined ? u.is_active : 1,
    });
    setEditError(null);
  };

  // Handle Edit User
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit) return;

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

      const res = await fetch(`/api/admin/users/${encodeURIComponent(userToEdit.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update user account.');
      }

      setFeedback({
        type: 'success',
        message: data.message || `User "${editForm.name}" was updated successfully.`,
      });
      setUserToEdit(null);
      await fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setEditError(msg);
    } finally {
      setIsEditing(false);
    }
  };

  // Handle Delete User
  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userToDelete.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete user.');
      }

      setFeedback({
        type: 'success',
        message: data.message || `User "${userToDelete.name}" was permanently removed.`,
      });
      setUserToDelete(null);
      await fetchUsers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setDeleteError(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const isSelf = Boolean(
    userToDelete &&
      currentAdmin &&
      (currentAdmin.id === userToDelete.id ||
        (userToDelete.email && currentAdmin.email.toLowerCase() === userToDelete.email.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="relative overflow-hidden rounded-xl p-6 sm:p-8 glass-card border border-[var(--border-color)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-semibold bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/20 backdrop-blur-md">
              <Users className="w-3.5 h-3.5" />
              <span>Enterprise User Administration</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
              User Accounts
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Registered candidate accounts, administrators, telemetry aggregates, and access controls ({totalCount} total).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setAddForm({ name: '', email: '', password: '', role: 'USER', is_active: 1 });
                setAddError(null);
                setShowAddModal(true);
              }}
              className="btn-primary h-10 px-4 text-xs"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add User</span>
            </button>

            <button
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] hover:bg-[var(--glass-bg-elevated)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-sm backdrop-blur-md cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm backdrop-blur-md ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 glass-card border border-[var(--glass-border)] bg-[var(--glass-bg)]/80 backdrop-blur-xl p-3.5 rounded-2xl shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by candidate name or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)] transition-all"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] text-xs">
            <Shield className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value as any);
                setPage(1);
              }}
              className="bg-transparent border-none text-[var(--text-primary)] text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Roles</option>
              <option value="ADMIN">Admins Only</option>
              <option value="USER">Candidates Only</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] text-xs">
            <Filter className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setPage(1);
              }}
              className="bg-transparent border-none text-[var(--text-primary)] text-xs font-semibold focus:outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <GlassCard className="overflow-hidden border border-[var(--border-color)] bg-[var(--card-bg)] rounded-xl shadow-sm p-0">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-secondary)] flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 text-[var(--accent)] animate-spin" />
            <span>Loading user profiles from database...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <UserCheck className="w-8 h-8 text-[var(--text-secondary)]/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No matching user profiles found.
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Try adjusting your search query or role/status filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[var(--bg-elevated)]/50 border-b border-[var(--border-color)] text-[var(--text-secondary)] text-[11px] font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Resumes</th>
                  <th className="py-3 px-4 text-center">Analyses</th>
                  <th className="py-3 px-4 text-center">Searches</th>
                  <th className="py-3 px-4 text-center">Assessments</th>
                  <th className="py-3 px-4 text-center">Skills</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {users.map((u) => {
                  const isCurrentAdminRow = Boolean(
                    currentAdmin &&
                      (currentAdmin.id === u.id ||
                        (u.email && currentAdmin.email.toLowerCase() === u.email.toLowerCase()))
                  );

                  const isAdminRole = (u.role || '').toUpperCase() === 'ADMIN';
                  const isActive = u.is_active !== 0;

                  return (
                    <tr key={u.id} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center shrink-0 border ${
                            isAdminRole
                              ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                              : 'bg-[var(--accent)]/15 text-[var(--accent)] border-[var(--accent)]/25'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[var(--text-primary)]">
                                {u.name}
                              </span>
                              {isCurrentAdminRow && (
                                <span className="text-[10px] text-[var(--accent)] font-semibold bg-[var(--accent)]/10 px-1.5 py-0.5 rounded border border-[var(--accent)]/20">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-[var(--text-secondary)] font-mono block">
                              {u.email || 'No email provided'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          isAdminRole
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/25'
                            : 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                        }`}>
                          <Shield className="w-3 h-3" />
                          {isAdminRole ? 'ADMIN' : 'USER'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                          isActive
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-zinc-500/15 text-zinc-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-[var(--text-primary)]">
                        {u.resumes_count || 0}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-[var(--text-primary)]">
                        {u.analyses_count || 0}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-[var(--text-primary)]">
                        {u.searches_count || 0}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-[var(--text-primary)]">
                        {u.assessments_count || 0}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-emerald-400">
                        {u.verified_skills_count || 0}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/admin/users/${u.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--accent)] hover:text-white text-xs font-semibold text-[var(--text-primary)] transition-all border border-[var(--border-color)]"
                            title="View full user details"
                          >
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>

                          <button
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-primary)] transition-all border border-[var(--border-color)]"
                            title="Edit user details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => {
                              setUserToDelete(u);
                              setDeleteError(null);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white text-xs font-semibold transition-all border border-red-500/20"
                            title={`Remove user ${u.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalCount > 0 && (
          <div className="p-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-secondary)]">
            <div>
              Showing <span className="font-bold text-[var(--text-primary)]">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-bold text-[var(--text-primary)]">{Math.min(page * limit, totalCount)}</span> of{' '}
              <span className="font-bold text-[var(--text-primary)]">{totalCount}</span> registered users
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="font-mono text-xs px-2 font-bold text-[var(--text-primary)]">
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold transition-all"
              >
                <span>Next</span>
                <ChevronNext className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl p-6 space-y-5 text-left">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--border-color)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)] flex items-center justify-center shrink-0 border border-[var(--accent)]/25">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Create New User Account
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Add a candidate or administrator profile to the system.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(false)}
                disabled={isAdding}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Maya Chen"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="e.g. user@example.com"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                  Password <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-primary)] mb-1">
                    Role
                  </label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
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
                    value={addForm.is_active}
                    onChange={(e) => setAddForm({ ...addForm, is_active: parseInt(e.target.value, 10) })}
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
                  onClick={() => setShowAddModal(false)}
                  disabled={isAdding}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] hover:opacity-90 text-white text-xs font-bold disabled:opacity-50 transition-all shadow-md"
                >
                  {isAdding ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {userToEdit && (
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
                    Update candidate or administrator profile attributes.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setUserToEdit(null)}
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
                  placeholder="Leave blank to keep existing password"
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
                  onClick={() => setUserToEdit(null)}
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

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl p-6 space-y-5 text-left">
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
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

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
                <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Candidate Name:</span>
                    <span className="font-bold text-[var(--text-primary)]">{userToDelete.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Email Address:</span>
                    <span className="font-mono text-[var(--text-primary)]">{userToDelete.email || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">Role:</span>
                    <span className="font-semibold text-[var(--text-primary)]">{userToDelete.role || 'USER'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">User Identifier:</span>
                    <span className="font-mono text-[11px] text-[var(--text-muted)]">{userToDelete.id}</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                  <p className="font-semibold text-[var(--text-primary)]">
                    Associated candidate data that will be permanently purged:
                  </p>
                  <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-[var(--text-muted)]">
                    <li>{userToDelete.resumes_count || 0} uploaded resumes and version histories</li>
                    <li>{userToDelete.analyses_count || 0} ATS analyses and keyword score logs</li>
                    <li>{userToDelete.assessments_count || 0} assessment attempts and question snapshots</li>
                    <li>{userToDelete.verified_skills_count || 0} verified skills and issued certificates</li>
                    <li>All tracked job applications, searches, and proctoring telemetry</li>
                  </ul>
                </div>

                <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/15 text-[11px] text-red-400">
                  <span className="font-bold">Warning:</span> This action is permanent and cannot be undone.
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
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
    </div>
  );
}
