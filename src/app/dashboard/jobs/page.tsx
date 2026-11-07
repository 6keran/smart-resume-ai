'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Search,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Send,
  Loader2,
  FileText,
} from 'lucide-react';

interface JobMatchItem {
  id: string;
  jobId: string | null;
  jobTitle: string;
  company: string;
  matchScore: number;
  matchedSkills: string[];
  partialSkills: string[];
  missingSkills: string[];
  resumeFilename: string | null;
  createdAt: string;
}

export default function UserJobMatchesPage() {
  const [matches, setMatches] = useState<JobMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [appliedJobs, setAppliedJobs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadMatches() {
      try {
        const res = await fetch('/api/user/jobs');
        if (res.ok) {
          const data = await res.json();
          setMatches(data.matches || []);
        }
      } catch (err) {
        console.error('Failed to load job matches:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  const handleMarkApplied = async (match: JobMatchItem) => {
    try {
      setAppliedJobs((prev) => ({ ...prev, [match.id]: true }));
      await fetch('/api/user/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: match.jobTitle,
          company: match.company,
          source: 'Job Match Engine',
          status: 'Applied',
          appliedAt: new Date().toISOString().split('T')[0],
          notes: `Matched with ${match.matchScore}% score against ${match.resumeFilename || 'resume'}.`,
        }),
      });
    } catch (err) {
      console.error('Error recording application:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="bento-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Job Matches
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Roles evaluated by AI against your resume&apos;s skills, qualifications, and keywords ({matches.length} total).
          </p>
        </div>
        <Link
          href="/jobs"
          className="btn-primary btn-sm inline-flex items-center gap-2 text-xs font-semibold shadow-sm shrink-0 cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Search Live Postings</span>
        </Link>
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--accent)] mb-3" />
          <p className="text-xs text-[var(--text-secondary)]">Loading your job matches...</p>
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
            <Briefcase className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No matched jobs yet
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1 mb-6">
            Search live job listings or match your uploaded resume against target job descriptions to compute compatibility benchmarks.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/jobs"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-md shadow-[var(--accent)]/20"
            >
              <Search className="w-4 h-4" />
              <span>Search Available Jobs</span>
            </Link>
            <Link
              href="/job-match"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-primary)] transition-all"
            >
              <Sparkles className="w-4 h-4 text-[var(--accent)]" />
              <span>Run Job Match Engine</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((item) => {
            const isApplied = appliedJobs[item.id];
            const isHighMatch = item.matchScore >= 75;
            const isMedMatch = item.matchScore >= 50 && item.matchScore < 75;

            return (
              <div
                key={item.id}
                className="bento-card p-5 sm:p-6 transition-all duration-200 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-color)] gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {item.jobTitle}
                      </h3>
                      <span className="font-semibold text-xs text-[var(--text-secondary)]">
                        at {item.company}
                      </span>
                    </div>
                    {item.resumeFilename && (
                      <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>Matched with: {item.resumeFilename}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] block">
                        Match Score
                      </span>
                      <span
                        className={`text-xl font-extrabold ${
                          isHighMatch
                            ? 'text-emerald-400'
                            : isMedMatch
                            ? 'text-amber-400'
                            : 'text-red-400'
                        }`}
                      >
                        {item.matchScore}%
                      </span>
                    </div>

                    <button
                      onClick={() => handleMarkApplied(item)}
                      disabled={isApplied}
                      className={`btn-sm inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
                        isApplied
                          ? 'btn-secondary text-emerald-400 border border-emerald-500/20 cursor-default'
                          : 'btn-primary shadow-sm'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tracked as Applied</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Mark Applied</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Matched vs Missing Skills */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {item.matchedSkills && item.matchedSkills.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                      <span className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Matched Skills ({item.matchedSkills.length})</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.matchedSkills.map((s) => (
                          <span
                            key={s}
                            className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-[11px]"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.missingSkills && item.missingSkills.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)]">
                      <span className="font-semibold text-amber-400 flex items-center gap-1.5 mb-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Skill Gaps ({item.missingSkills.length})</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {item.missingSkills.map((s) => (
                          <span
                            key={s}
                            className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px]"
                          >
                            {s}
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
