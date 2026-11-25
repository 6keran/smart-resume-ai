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
import { LoadingState } from '@/components/ui/StateViews';
import { JobSearchAutocomplete } from '@/components/jobs/JobSearchAutocomplete';

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
    setMatchError(null);
    setValidationWarning(null);

    if (!jobTitle.trim()) {
      setMatchError('Please enter or select a job title before running a match.');
      return;
    }

    setIsLoading(true);

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
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 text-[var(--text-primary)]">
      {/* Header */}
      <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 sm:p-8 text-left space-y-2 shadow-sm">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--accent-subtle)] border border-[var(--accent)]/20 text-xs font-semibold text-[var(--accent)]">
          <Target className="w-3.5 h-3.5" />
          <span>Role Alignment Scanner</span>
        </div>
        <h1 className="text-[28px] sm:text-[30px] font-bold text-[var(--text-primary)] tracking-tight">
          Job Match Analysis
        </h1>
        <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-2xl">
          Compare your active resume against job descriptions to identify matching qualifications and keyword gaps.
        </p>
      </div>

      {/* Advisory Disclaimer */}
      <div className="p-4 rounded-xl border border-[var(--accent)]/20 bg-[var(--accent-subtle)] text-[13px] text-[var(--text-secondary)] flex items-start gap-3 shadow-xs">
        <Info className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[var(--text-primary)]">Internal Advisory Estimate:</strong> This match score is an algorithmic assessment comparing keywords, skills, and qualifications between your resume and the job listing. It is provided strictly to guide your preparation and does not represent an official employer hiring decision.
        </div>
      </div>

      {/* Error / Incomplete Resume Guidance */}
      {matchError && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-start sm:items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#C43D43] shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-semibold text-[#C43D43]">{matchError}</p>
              {validationWarning && (
                <p className="text-[13px] text-red-700 mt-0.5">{validationWarning}</p>
              )}
            </div>
          </div>
          <Link
            href="/builder"
            className="px-4 py-2 rounded-lg bg-[#C43D43] hover:bg-red-700 text-white font-semibold text-[13px] transition-colors shrink-0 text-center"
          >
            Update Resume in Builder
          </Link>
        </div>
      )}

      {/* Input Form Card */}
      <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 sm:p-8 text-left space-y-4 shadow-sm">
        <form onSubmit={handleRunMatch} className="space-y-4 text-[14px]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                Job Title <span className="text-[#C43D43]">*</span>
              </label>
              <JobSearchAutocomplete
                field="role"
                label="Job Title"
                value={jobTitle}
                onChange={setJobTitle}
                onSelect={setJobTitle}
                placeholder="e.g. Data Analyst, Mechanical Engineer"
                leadingIcon={<Briefcase className="w-4 h-4 text-[var(--text-secondary)]" />}
                inputClassName="w-full min-h-[42px] pl-9 pr-3 py-2 rounded-lg border border-[#E5E8ED] bg-white text-[#20242B] text-[14px] focus:outline-none focus:border-[#3157C8]"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                Company Name <span className="text-[#C43D43]">*</span>
              </label>
              <div className="relative">
                <Building className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
                <input
                  type="text"
                  required
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Tech"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border-color)] bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
                Job Posting URL (Optional)
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border-color)] bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[var(--text-primary)] mb-1.5">
              Job Description / Requirements <span className="text-[#C43D43]">*</span>
            </label>
            <textarea
              rows={6}
              required
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description or key requirements here..."
              className="w-full p-3 rounded-lg border border-[var(--border-color)] bg-white text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] font-mono text-[13px] leading-relaxed"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <span className="text-[14px] text-[var(--text-secondary)]">
              Matching with active profile: <strong className="text-[var(--text-primary)]">{resumeData.personalInfo.fullName || 'Candidate'}</strong>
            </span>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[15px] font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isLoading ? 'Analyzing Match...' : 'Compare Against My Resume'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Loading state */}
      {isLoading && (
        <LoadingState
          title="Evaluating Career Fit..."
          message="Computing vector similarity between resume bullet points and job requirements."
        />
      )}

      {/* Match Results View */}
      {matchResult && !isLoading && (
        <div className="space-y-6 text-left animate-fade-in">
          {/* Top Score Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="reference-panel md:col-span-2 flex flex-col sm:flex-row items-center justify-between p-6 gap-6 bg-white rounded-2xl border border-[var(--border-color)] shadow-sm">
              <div className="space-y-2 text-left">
                <span className="text-[12px] font-bold text-[var(--accent)] uppercase tracking-wider">
                  Overall Candidate Fit
                </span>
                <h3 className="text-[24px] font-bold text-[var(--text-primary)]">
                  {matchResult.overallMatchScore >= 80 ? 'High Fit Match' : 'Moderate Fit'}
                </h3>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed max-w-xs">
                  {matchResult.jobTitle} at {matchResult.company}.
                </p>
                <div className="pt-2">
                  <Link
                    href="/improver"
                    className="px-4 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-[14px] font-semibold inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Optimize For This Role</span>
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
            </div>

            <div className="reference-panel flex flex-col items-center justify-center p-5 text-center bg-white rounded-2xl border border-[var(--border-color)] shadow-sm">
              <ScoreRing score={matchResult.skillsMatchScore} size={90} strokeWidth={7} showPercentage />
              <span className="mt-3 text-[15px] font-bold text-[var(--text-primary)]">Skills Match</span>
              <span className="text-[13px] text-[var(--text-secondary)]">Required Tech</span>
            </div>

            <div className="reference-panel flex flex-col items-center justify-center p-5 text-center bg-white rounded-2xl border border-[var(--border-color)] shadow-sm">
              <ScoreRing score={matchResult.experienceMatchScore} size={90} strokeWidth={7} showPercentage />
              <span className="mt-3 text-[15px] font-bold text-[var(--text-primary)]">Experience Match</span>
              <span className="text-[13px] text-[var(--text-secondary)]">Seniority &amp; Scope</span>
            </div>

            <div className="reference-panel flex flex-col items-center justify-center p-5 text-center bg-white rounded-2xl border border-[var(--border-color)] shadow-sm">
              <ScoreRing score={matchResult.keywordMatchScore} size={90} strokeWidth={7} showPercentage />
              <span className="mt-3 text-[15px] font-bold text-[var(--text-primary)]">Keyword Density</span>
              <span className="text-[13px] text-[var(--text-secondary)]">ATS Alignment</span>
            </div>
          </div>

          {/* Detailed Skill Classification (Matched, Partial, Missing) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Matched */}
            <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                <CheckCircle2 className="w-5 h-5 text-[#16845B]" />
                <h4 className="text-[16px] font-bold text-[var(--text-primary)]">
                  Matched Skills ({matchResult.matchedSkills.length})
                </h4>
              </div>
              <div className="space-y-2 pt-1">
                {matchResult.matchedSkills.map((sk, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-[14px] text-emerald-950 block">{sk.skill}</span>
                      {sk.importance && (
                        <span className={`text-[11px] uppercase px-2 py-0.5 rounded font-semibold ${
                          sk.importance === 'required' ? 'bg-emerald-200 text-emerald-900' : 'bg-blue-100 text-[var(--accent)]'
                        }`}>
                          {sk.importance}
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] text-emerald-800">{sk.context}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Partial */}
            <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                <HelpCircle className="w-5 h-5 text-[#A96812]" />
                <h4 className="text-[16px] font-bold text-[var(--text-primary)]">
                  Partial Alignment ({matchResult.partialSkills.length})
                </h4>
              </div>
              <div className="space-y-2 pt-1">
                {matchResult.partialSkills.length === 0 ? (
                  <p className="text-[14px] text-[var(--text-secondary)] italic py-2">
                    No ambiguous or partial competencies detected.
                  </p>
                ) : (
                  matchResult.partialSkills.map((sk, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-bold text-[14px] text-amber-950 block">{sk.skill}</span>
                        {sk.importance && (
                          <span className="text-[11px] uppercase px-2 py-0.5 rounded font-semibold bg-amber-200 text-amber-900">
                            {sk.importance}
                          </span>
                        )}
                      </div>
                      <span className="text-[13px] text-amber-800">{sk.context}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Missing */}
            <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 space-y-3 shadow-sm">
              <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
                <AlertCircle className="w-5 h-5 text-[#C43D43]" />
                <h4 className="text-[16px] font-bold text-[var(--text-primary)]">
                  Missing Skills ({matchResult.missingSkills.length})
                </h4>
              </div>
              <div className="space-y-2 pt-1">
                {matchResult.missingSkills.map((sk, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-bold text-[14px] text-red-950 block">{sk.skill}</span>
                      {sk.importance && (
                        <span className={`text-[11px] uppercase px-2 py-0.5 rounded font-semibold ${
                          sk.importance === 'required' ? 'bg-red-200 text-red-900' : 'bg-amber-100 text-[#A96812]'
                        }`}>
                          {sk.importance}
                        </span>
                      )}
                    </div>
                    <span className="text-[13px] text-red-800">{sk.context}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key Strengths & Gaps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 space-y-3 shadow-sm text-left">
              <h4 className="text-[18px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#16845B]" />
                Key Profile Strengths
              </h4>
              <ul className="space-y-2 text-[14px] text-[var(--text-secondary)] pt-1">
                {matchResult.keyStrengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#16845B] font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="reference-panel bg-white rounded-2xl border border-[var(--border-color)] p-6 space-y-3 shadow-sm text-left">
              <h4 className="text-[18px] font-bold text-[var(--text-primary)] flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-[#A96812]" />
                Actionable Gap Recommendations
              </h4>
              <ul className="space-y-2 text-[14px] text-[var(--text-secondary)] pt-1">
                {matchResult.gapsToAddress.map((gap, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#A96812] font-bold">•</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
