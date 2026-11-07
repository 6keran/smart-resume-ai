import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  FileCheck2,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Award,
  ArrowRight,
} from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserAssessments } from '@/lib/db';

export const metadata = {
  title: 'My Assessments | Smart Resume AI',
  description: 'Historical records of all skill assessments completed by you.',
};

export default async function UserAssessmentsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login?from=/dashboard/assessments');
  }

  const assessments = await getUserAssessments(user.id);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="bento-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            My Assessments
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Complete assessment history with scores, proctoring violations, and timestamps ({assessments.length} total).
          </p>
        </div>
        <Link
          href="/skills"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
        >
          <FileCheck2 className="w-4 h-4" />
          <span>Take New Assessment</span>
        </Link>
      </div>

      {assessments.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
            <FileCheck2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No assessments attempted yet
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1 mb-6">
            Complete a proctored technical test in React, Python, TypeScript, Node.js, SQL or System Design to prove your competencies.
          </p>
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-md shadow-[var(--accent)]/20"
          >
            <span>Browse Skill Tests</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => {
            const formatDuration = (sec: number) => {
              const m = Math.floor(sec / 60);
              const s = sec % 60;
              return `${m}m ${s}s`;
            };

            const isIncomplete = a.status === 'INCOMPLETE' || a.status === 'terminated';

            return (
              <div
                key={a.id}
                className="bento-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isIncomplete
                        ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        : a.passed
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {isIncomplete ? (
                      <ShieldAlert className="w-5 h-5" />
                    ) : a.passed ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <XCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {a.skill} Assessment
                      </h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          isIncomplete
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : a.passed
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {isIncomplete ? 'INCOMPLETE' : a.passed ? 'PASSED' : 'FAILED'}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                        Camera Monitored
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(a.completedAt).toLocaleDateString()}
                      </span>
                      <span>·</span>
                      <span>Duration: {formatDuration(a.durationSeconds)}</span>
                      {a.violationCount > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-amber-400 flex items-center gap-1 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            {a.violationCount} {a.violationCount === 1 ? 'Violation' : 'Violations'}
                          </span>
                        </>
                      )}
                    </p>
                    {isIncomplete && a.terminationReason && (
                      <p className="text-[11px] text-rose-400 font-medium mt-1">
                        Reason: {a.terminationReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end md:self-center">
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] block">
                      Score
                    </span>
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {a.score}/{a.totalQuestions} ({a.percentage}%)
                    </span>
                  </div>

                  {a.certificateCode ? (
                    <Link
                      href="/dashboard/certificates"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 text-xs font-semibold transition-all"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>View Certificate</span>
                    </Link>
                  ) : (
                    <Link
                      href={`/skills/assess/${encodeURIComponent(a.skill)}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--accent)] text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent)] transition-all cursor-pointer"
                    >
                      <span>Retake</span>
                    </Link>
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
