import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  AlertCircle,
} from 'lucide-react';
import { getCertificateByCode } from '@/lib/db';
import { PrintCertificateButton } from '@/components/certificate/PrintCertificateButton';

export const metadata = {
  title: 'Verified Skill Certificate | Smart Resume AI',
  description: 'Official verified skill competency certificate.',
};

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cert = await getCertificateByCode(id);

  if (!cert) {
    return (
      <div className="min-h-screen py-16 px-4 max-w-xl mx-auto text-center space-y-6">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 p-10 backdrop-blur-xl shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
            Certificate Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            No verified credential was found matching code <code className="font-mono font-bold text-[var(--text-primary)]">&quot;{id}&quot;</code>.
            Certificates are issued only after successfully passing a proctored technical assessment with at least 70% accuracy.
          </p>
          <div className="pt-4 flex items-center justify-center gap-3">
            <Link
              href="/skills"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all shadow-md"
            >
              <span>Explore Skill Assessments</span>
            </Link>
            <Link
              href="/dashboard/certificates"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent)] transition-all"
            >
              My Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const issueDateFormatted = new Date(cert.issueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
      {/* Top action bar */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-4">
        <Link
          href="/skills"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Skills
        </Link>

        <div className="flex items-center gap-3">
          <PrintCertificateButton />
        </div>
      </div>

      {/* A4 CERTIFICATE DOCUMENT */}
      <div className="flex justify-center overflow-auto p-2">
        <div
          id="certificate-document"
          className="a4-page bg-white text-slate-900 border-8 border-double border-slate-300 p-12 sm:p-16 relative flex flex-col justify-between shadow-2xl text-center select-none"
          style={{
            width: '210mm',
            minHeight: '297mm',
            boxSizing: 'border-box',
          }}
        >
          {/* Subtle Security Guilloche Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <Award className="w-96 h-96" />
          </div>

          {/* Certificate Header */}
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shadow-md">
                <Award className="w-7 h-7" />
              </div>
              <div className="text-left leading-tight">
                <span className="font-extrabold tracking-wider text-base text-slate-900 block">
                  SMART RESUME AI
                </span>
                <span className="text-[10px] tracking-widest font-semibold text-[var(--accent)] uppercase">
                  Career Intelligence Platform
                </span>
              </div>
            </div>

            <div className="pt-6">
              <span className="text-xs font-bold tracking-[0.25em] text-slate-500 uppercase block mb-1">
                Certificate of Technical Verification
              </span>
              <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-tight text-slate-900">
                PROCTOR VALIDATED SKILL MASTERY
              </h1>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-6 my-auto py-8">
            <p className="text-xs text-slate-600 tracking-wide">
              This credential officially certifies that
            </p>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-indigo-950 border-b-2 border-indigo-200 pb-2 inline-block px-8">
              {cert.userName}
            </h2>

            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              has successfully satisfied the technical evaluation criteria and demonstrated verified
              competence in
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 inline-block px-10">
              <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-wide uppercase">
                {cert.skill}
              </span>
              <div className="flex items-center justify-center gap-4 mt-1 text-[11px] text-slate-600">
                <span>Score: <strong className="text-slate-900">{cert.score} / {cert.totalQuestions}</strong></span>
                <span>·</span>
                <span>Accuracy: <strong className="text-slate-900">{cert.percentage}%</strong></span>
                <span>·</span>
                <span className="text-emerald-700 font-bold">STATUS: {cert.verificationStatus}</span>
              </div>
            </div>
          </div>

          {/* Certificate Footer with Seals, Verification Code, and Signature */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-3 items-end text-left text-xs">
            {/* Verification Metadata */}
            <div className="space-y-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Verification ID
              </p>
              <p className="font-mono font-bold text-slate-900 text-xs">{cert.certificateCode}</p>
              <p className="text-[10px] text-slate-500">Issued on: {issueDateFormatted}</p>
            </div>

            {/* Official Gold Seal Badge */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full border-4 border-amber-400 bg-amber-50 flex flex-col items-center justify-center text-amber-700 shadow-md">
                <ShieldCheck className="w-6 h-6 text-amber-600 mb-0.5" />
                <span className="text-[8px] font-black tracking-widest uppercase">VERIFIED</span>
              </div>
            </div>

            {/* Signature */}
            <div className="text-right space-y-1">
              <div className="font-serif italic text-base text-slate-800 pr-2">
                Director of Assessment
              </div>
              <div className="w-32 ml-auto border-b border-slate-400" />
              <p className="text-[10px] text-slate-500 uppercase font-semibold">
                Evaluation Board
              </p>
              <p className="text-[9px] text-slate-400">Smart Resume AI Systems</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
