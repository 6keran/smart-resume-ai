import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Award,
  CheckCircle2,
  Calendar,
  ExternalLink,
  Download,
  Share2,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { getAuthenticatedUser } from '@/lib/userSession';
import { getUserCertificates } from '@/lib/db';

export const metadata = {
  title: 'My Certificates | Smart Resume AI',
  description: 'Verified certificates earned through proctored skill assessments.',
};

export default async function UserCertificatesPage() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect('/login?from=/dashboard/certificates');
  }

  const certificates = await getUserCertificates(user.id);

  return (
    <div className="space-y-6 animate-fade-in text-left">
      {/* Header */}
      <div className="bento-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Earned Certificates
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Official credentials backed by cryptographic verification codes ({certificates.length} total).
          </p>
        </div>
        <Link
          href="/skills"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)] transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
        >
          <Award className="w-4 h-4" />
          <span>Earn Another Certificate</span>
        </Link>
      </div>

      {certificates.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4 text-[var(--text-secondary)]">
            <Award className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text-primary)]">
            No certificates earned yet
          </h3>
          <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto mt-1 mb-6">
            Certificates are issued automatically when you pass a proctored technical skill assessment with at least 70% accuracy.
          </p>
          <Link
            href="/skills"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-md shadow-[var(--accent)]/20"
          >
            <span>Take Skill Assessment</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              className="bento-card p-6 flex flex-col justify-between space-y-5 transition-all duration-200 relative overflow-hidden"
            >
              {/* Corner Watermark */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent)]/5 rounded-bl-full pointer-events-none -z-10" />

              <div>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center shadow-md shadow-[var(--accent)]/20 shrink-0">
                    <Award className="w-6 h-6" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{cert.verificationStatus}</span>
                  </span>
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Certificate of Competency
                </span>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                  {cert.skill} Professional
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Issued to <span className="font-semibold text-[var(--text-primary)]">{user.name}</span> with a passing score of {cert.score}/{cert.totalQuestions} ({cert.percentage}%).
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-medium text-[var(--text-secondary)] block">
                      Certificate Code
                    </span>
                    <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                      {cert.certificateCode}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-medium text-[var(--text-secondary)] block">
                      Issue Date
                    </span>
                    <span className="text-xs font-semibold text-[var(--text-primary)]">
                      {new Date(cert.issueDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Link
                    href={`/skills/certificate/${cert.certificateCode}`}
                    className="flex-1 py-2 px-3 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all text-center flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Certificate</span>
                  </Link>
                  <a
                    href={`/api/user/certificates?code=${encodeURIComponent(cert.certificateCode)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 px-3 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] transition-all flex items-center justify-center gap-1.5"
                    title="Verify certificate JSON endpoint"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verify</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
