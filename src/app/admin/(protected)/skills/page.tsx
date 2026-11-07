'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Search,
  RefreshCw,
  Award,
  CheckCircle2,
  ChevronRight,
  Layers,
  Settings,
  X,
  Edit2,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

interface SkillItem {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  is_active: boolean;
  totalQuestions: number;
  activeQuestions: number;
  inactiveQuestions: number;
  easyQuestions: number;
  mediumQuestions: number;
  hardQuestions: number;
  assessmentCount: number;
  verifiedCount: number;
  config: {
    questionsCount: number;
    passPercentage: number;
    timeLimitMinutes: number;
  };
}

export default function AdminSkillsPage() {
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingSkill, setEditingSkill] = useState<SkillItem | null>(null);
  const [editForm, setEditForm] = useState({ name: '', category: '', description: '' });

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/skills');
      if (res.ok) {
        const json = await res.json();
        setSkills(json.skills || []);
      }
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSkills();
  }, [fetchSkills]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/skills', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      });
      if (res.ok) {
        fetchSkills();
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;

    try {
      const res = await fetch('/api/admin/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSkill.id,
          name: editForm.name,
          category: editForm.category,
          description: editForm.description,
        }),
      });

      if (res.ok) {
        setEditingSkill(null);
        fetchSkills();
      }
    } catch (err) {
      console.error('Edit skill error:', err);
    }
  };

  const filtered = skills.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 mb-2">
            <BadgeCheck className="w-3 h-3" />
            Skills Catalog Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Supported Assessment Skills
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Manage supported technical assessment disciplines, activate or deactivate skills, and configure assessment parameters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/assessments?tab=questions"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold shadow-md transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            Open Question Bank
          </Link>

          <button
            onClick={fetchSkills}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills by name or category..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <span className="text-xs text-[var(--text-secondary)]">
          {filtered.length} of {skills.length} skills supported
        </span>
      </div>

      {/* Skills Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[var(--text-secondary)] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-[var(--accent)]" />
          Loading skills catalog...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-[var(--border-color)] rounded-2xl bg-[var(--bg-card)]">
          <BadgeCheck className="w-8 h-8 text-[var(--text-secondary)]/50 mx-auto mb-2" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No matching skills found.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <GlassCard key={s.id} className="p-5 flex flex-col justify-between space-y-4">
              <div>
                {/* Header: Name, Category, Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-[var(--text-primary)]">
                      {s.name}
                    </h3>
                    <span className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-wider">
                      {s.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(s.id, s.is_active)}
                      className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                        s.is_active
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                      }`}
                      title="Toggle active status"
                    >
                      {s.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </button>

                    <button
                      onClick={() => {
                        setEditingSkill(s);
                        setEditForm({ name: s.name, category: s.category, description: s.description || '' });
                      }}
                      className="p-1 rounded-lg border border-[var(--border-color)] hover:text-[var(--accent)]"
                      title="Edit skill details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mb-3">
                  {s.description || 'Core technical assessment discipline.'}
                </p>

                {/* Difficulty Breakdown & Question Counts */}
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">Total Questions:</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {s.totalQuestions} ({s.activeQuestions} active · {s.inactiveQuestions} inactive)
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-[var(--text-secondary)]">
                    <span>By Difficulty:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {s.easyQuestions} Easy · {s.mediumQuestions} Med · {s.hardQuestions} Hard
                    </span>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-[var(--border-color)]/60 text-[11px]">
                    <span className="text-[var(--text-secondary)]">Assessment Requirement:</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {s.config.questionsCount} questions · {s.config.passPercentage}% to pass
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer Links */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border-color)] text-xs">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  <span className="font-bold text-[var(--text-primary)]">{s.assessmentCount}</span> attempts ·{' '}
                  <span className="font-bold text-emerald-400">{s.verifiedCount}</span> verified
                </span>

                <Link
                  href={`/admin/assessments?tab=questions&skill=${encodeURIComponent(s.name)}`}
                  className="font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                >
                  <span>Manage Questions</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Edit Skill Modal */}
      {editingSkill && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl shadow-2xl p-6 text-left space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Edit Skill: {editingSkill.name}
              </h3>
              <button
                onClick={() => setEditingSkill(null)}
                className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Skill Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Category
                </label>
                <input
                  type="text"
                  required
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-color)] text-xs font-semibold hover:bg-[var(--bg-elevated)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
