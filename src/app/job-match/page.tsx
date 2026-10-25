'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Target,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Briefcase,
  Building,
  Link2,
  TrendingUp,
  Info,
} from 'lucide-react';
import { useResume } from '@/context/ResumeContext';
import { useCareer } from '@/context/CareerContext';
import { JobMatchResult } from '@/types/jobs';
import { ScoreRing } from '@/components/ui/ScoreRing';
import { GlassCard } from '@/components/ui/GlassCard';
import { LoadingState } from '@/components/ui/StateViews';

export default function JobMatchPage() {
  const { resumeData } = useResume();
  const { saveJobMatch } = useCareer();

  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<JobMatchResult | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  const handleRunMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMatchError(null);
    setValidationWarning(null);

    const hasExperience = resumeData.experience && resumeData.experience.length > 0;
    const hasSkills = resumeData.skills && resumeData.skills.technical && resumeData.skills.technical.length > 0;
    const hasName = resumeData.personalInfo && resumeData.personalInfo.fullName && resumeData.personalInfo.fullName.trim().length > 0;

    if (!hasName && !hasExperience && !hasSkills) {
      setMatchError('Your resume profile appears empty. Please populate your skills and experience in the Resume Builder first.');
      setIsLoading(false);
      return;
    }

    try {
      const resumeText = `${resumeData.personalInfo.fullName}\n${resumeData.personalInfo.headline}\n${resumeData.summary}\nSkills: ${resumeData.skills.technical.join(', ')}\nExperience:\n${resumeData.experience
        .map((e) => `${e.role} at ${e.company}: ${e.bulletPoints.join(' ')}`)
        .join('\n')}`;

      const res = await fetch('/api/job/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobTitle,
          company,
          jobDescription,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMatchError(data.message || 'Unable to evaluate job match. Please verify your inputs and try again.');
        if (data.validation) {
          setValidationWarning(data.validation.message || 'Resume structure needs additional sections.');
        }
      } else {
        setMatchResult(data);
        saveJobMatch(data);
      }
    } catch {
      setMatchError('A network error occurred while evaluating job match. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Job Match Analysis
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
            Compare your active resume against job descriptions to identify matching qualifications and keyword gaps.
          </p>
        </div>
      </div>

      {/* Advisory Disclaimer */}
      <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-[var(--text-primary)]">Internal Advisory Estimate:</strong> This match score is an algorithmic assessment comparing keywords, skills, and qualifications between your resume and the job listing. It is provided strictly to guide your preparation and does not represent an official employer hiring decision or guarantee interview selection.
        </div>
      </div>

      {/* Error / Incomplete Resume Guidance */}
      {matchError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-300 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold">{matchError}</p>
              {validationWarning && (
                <p className="text-[11px] text-rose-400/80 mt-0.5">{validationWarning}</p>
              )}
            </div>
          </div>
          <Link
            href="/builder"
            className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors shrink-0 text-center"
          >
            Update Resume in Builder
          </Link>
        </div>
      )}

      {/* Input Form Card */}
      <GlassCard className="p-6 text-left space-y-4">
        <form onSubmit={handleRunMatch} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Briefcase className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  required
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Machine Learning Engineer"
                  className="w-full pl-9 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1">
                Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. OpenAI"
                  className="w-full pl-9 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-[var(--text-secondary)] mb-1">
                Job Posting URL (Optional)
              </label>
              <div className="relative">
                <Link2 className="w-3.5 h-3.5 absolute left-3 top-3 text-[var(--text-secondary)]" />
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-primary)] mb-1">
              Job Description / Requirements <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={6}
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description or key requirements here..."
              className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono text-[11px] leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--text-secondary)]">
              Matching with active profile: <strong className="text-[var(--text-primary)]">{resumeData.personalInfo.fullName}</strong>
            </span>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white font-semibold text-xs sm:text-sm shadow-md active:scale-95 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {isLoading ? 'Analyzing Match...' : 'Compare Against My Resume'}
            </button>
          </div>
        </form>
      </GlassCard>

      {/* Loading state */}
      {isLoading && (
        <LoadingState
          title="Evaluating Career Fit..."
          message="Computing vector similarity between resume bullet points and job requirements."
        />
      )}

      {/* Match Results View */}
      {matchResult && !isLoading && (
        <div className="space-y-8 text-left animate-fade-in">
          {/* Top Score Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <GlassCard className="md:col-span-2 flex flex-col sm:flex-row items-center justify-between p-6 gap-6" glow>
              <div className="space-y-2 text-left">
                <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider">
                  Overall Candidate Fit
                </span>
                <h3 className="text-2xl font-black text-[var(--text-primary)]">
                  {matchResult.overallMatchScore >= 80 ? 'High Fit Match' : 'Moderate Fit'}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs">
                  {matchResult.jobTitle} at {matchResult.company}.
                </p>
                <div className="pt-2">
                  <Link
                    href="/improver"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:bg-[var(--accent-hover)]"
                  >
                    Optimize For This Role
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <ScoreRing
                score={matchResult.overallMatchScore}
                size={130}
                strokeWidth={10}
                subLabel="MATCH"
              />
            </GlassCard>

            <GlassCard className="flex flex-col items-center justify-center p-5 text-center">
              <ScoreRing score={matchResult.skillsMatchScore} size={90} strokeWidth={7} showPercentage />
              <span className="mt-2 text-xs font-bold text-[var(--text-primary)]">Skills Match</span>
              <span className="text-[10px] text-[var(--text-secondary)]">Required Technologies</span>
            </GlassCard>

            <GlassCard className="flex flex-col items-center justify-center p-5 text-center">
              <ScoreRing score={matchResult.experienceMatchScore} size={90} strokeWidth={7} showPercentage />
              <span className="mt-2 text-xs font-bold text-[var(--text-primary)]">Experience Match</span>
              <span className="text-[10px] text-[var(--text-secondary)]">Seniority & Tenure</span>
            </GlassCard>

            <GlassCard className="flex flex-col items-center justify-center p-5 text-center">
              <ScoreRing score={matchResult.keywordMatchScore} size={90} strokeWidth={7} showPercentage />
              <span className="mt-2 text-xs font-bold text-[var(--text-primary)]">Keyword Density</span>
              <span className="text-[10px] text-[var(--text-secondary)]">ATS Filter Match</span>
            </GlassCard>
          </div>

          {/* Detailed Skill Classification (Matched, Partial, Missing) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Matched */}
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Matched Skills ({matchResult.matchedSkills.length})
                </h4>
              </div>
              <div className="space-y-2 text-xs">
                {matchResult.matchedSkills.map((sk, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-[var(--text-primary)] block">{sk.skill}</span>
                      {sk.importance && (
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                          sk.importance === 'required' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {sk.importance}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">{sk.context}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Partial */}
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Partial Alignment ({matchResult.partialSkills.length})
                </h4>
              </div>
              <div className="space-y-2 text-xs">
                {matchResult.partialSkills.length === 0 ? (
                  <p className="text-[11px] text-[var(--text-secondary)] italic">
                    No ambiguous or partial competencies detected.
                  </p>
                ) : (
                  matchResult.partialSkills.map((sk, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-[var(--text-primary)] block">{sk.skill}</span>
                        {sk.importance && (
                          <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-400">
                            {sk.importance}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)]">{sk.context}</span>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

            {/* Missing */}
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Missing Skills ({matchResult.missingSkills.length})
                </h4>
              </div>
              <div className="space-y-2 text-xs">
                {matchResult.missingSkills.map((sk, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-[var(--text-primary)] block">{sk.skill}</span>
                      {sk.importance && (
                        <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                          sk.importance === 'required' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {sk.importance}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)]">{sk.context}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Key Strengths & Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="p-6 space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Key Profile Strengths
              </h4>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                {matchResult.keyStrengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>

            <GlassCard className="p-6 space-y-3">
              <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Actionable Gap Recommendations
              </h4>
              <ul className="space-y-2 text-xs text-[var(--text-secondary)]">
                {matchResult.gapsToAddress.map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
