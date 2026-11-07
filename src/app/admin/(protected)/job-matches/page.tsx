'use client';

import React, { useEffect, useState } from 'react';
import {
  Target,
  Search,
  RefreshCw,
  Building,
  Briefcase,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

export default function AdminJobMatchesPage() {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/records?type=matches');
      if (res.ok) {
        const json = await res.json();
        setMatches(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load job matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const filtered = matches.filter((m) =>
    (m.job_title && m.job_title.toLowerCase().includes(search.toLowerCase())) ||
    (m.company && m.company.toLowerCase().includes(search.toLowerCase())) ||
    m.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-left">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 mb-2">
            <Target className="w-3 h-3" />
            Matching Engine
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            Job Match Operations
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Real evaluations comparing candidate resumes to target job requirements.
          </p>
        </div>

        <button
          onClick={fetchMatches}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-elevated)] text-xs font-semibold text-[var(--text-primary)] transition-all active:scale-95 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Matches
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job title, company, or ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:outline-none focus:border-[var(--accent)]"
          />
        </div>
        <span className="text-xs text-[var(--text-secondary)]">
          {filtered.length} of {matches.length} match logs
        </span>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--text-secondary)]">
            Loading job match logs from database...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-8 h-8 text-[var(--text-secondary)]/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No job matches recorded yet.
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              When users evaluate a resume against a job description in Job Match, records will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[var(--bg-elevated)]/60 text-[10px] uppercase font-bold text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="py-3 px-4">Target Job</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4 text-center">Match Score</th>
                  <th className="py-3 px-4 text-right">Evaluated At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {filtered.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--bg-elevated)]/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[var(--text-primary)]">
                        {m.job_title}
                      </div>
                      <div className="text-[10px] text-[var(--text-secondary)] font-mono">
                        {m.id}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-[var(--text-secondary)]">
                      <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-primary)]">
                        <Building className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        {m.company}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-black ${
                        m.match_score >= 80 ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                        m.match_score >= 60 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' :
                        'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                      }`}>
                        {m.match_score}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-[var(--text-secondary)]">
                      {new Date(m.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
