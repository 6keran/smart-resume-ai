import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Award,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserSkillsStatus } from '@/lib/db';

export const metadata = {
  title: 'My Verified Skills | Smart Resume AI',
  description: 'Track your proctored skill badges, assessment scores, and verified certificates.',
};

export default async function UserSkillsPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login?from=/dashboard/skills');
  }

  const skills = await getUserSkillsStatus(user.id);
  const verifiedSkills = skills.filter((s) => s.status === 'VERIFIED');
  const unverifiedSkills = skills.filter((s) => s.status !== 'VERIFIED');

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="bento-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Skill Badges
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Track your completed technical assessments and earned skill badges ({verifiedSkills.length} of {skills.length} passed).
          </p>
        </div>
        <Link
          href="/skills"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Take a Skill Assessment</span>
        </Link>
      </div>

      {/* Verified Skills Section */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
          <BadgeCheck className="w-4 h-4" />
          <span>Passed Badges ({verifiedSkills.length})</span>
        </h2>

        {verifiedSkills.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-8 text-center mb-8">
            <p className="text-xs text-[var(--text-secondary)] mb-3">
              You haven&apos;t earned any verified skill badges yet.
            </p>
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90"
            >
              <span>Take Your First Skill Test</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {verifiedSkills.map((s) => (
              <div
                key={s.skillId}
                className="bento-card p-5 space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <BadgeCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {s.skillName}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        PASSED BADGE
                      </span>
                    </div>
                  </div>
                  {s.percentage !== null && (
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {s.percentage}%
                    </span>
                  )}
                </div>

                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                  {s.description || 'Passed Smart Resume AI skill assessment.'}
                </p>

                <div className="pt-3 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    Score: {s.score || 'Passing'}
                  </span>
                  {s.certificateCode ? (
                    <Link
                      href="/dashboard/certificates"
                      className="inline-flex items-center gap-1 font-semibold text-emerald-400 hover:underline text-[11px]"
                    >
                      <Award className="w-3 h-3" />
                      <span>Certificate</span>
                    </Link>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-semibold">Active</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available & In Progress Skills */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">
          Available for Verification ({unverifiedSkills.length})
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {unverifiedSkills.map((s) => (
            <div
              key={s.skillId}
              className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/70 hover:bg-[var(--bg-secondary)] p-5 flex flex-col justify-between space-y-3 transition-all duration-200 hover:border-[var(--accent)]/40"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)] tracking-wider">
                    {s.category}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                    NOT VERIFIED
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {s.skillName}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">
                  {s.description || 'Take the 10-question proctored assessment to verify this skill.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Pass Mark: 70%
                </span>
                <Link
                  href={`/skills/assess/${encodeURIComponent(s.skillName)}`}
                  className="px-3 py-1.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Start Test</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
