'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  FileText,
  AlignLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
} from 'lucide-react';
import { ResumeAnalysisResult } from '@/types/resume';
import { FeedbackButtons } from '@/components/feedback/FeedbackButtons';

interface AtsExplainabilityBreakdownProps {
  analysis: ResumeAnalysisResult;
  className?: string;
}

export function AtsExplainabilityBreakdown({
  analysis,
  className = '',
}: AtsExplainabilityBreakdownProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showAllKeywords, setShowAllKeywords] = useState<boolean>(false);

  const toggleCategory = (cat: string) => {
    setExpandedCategory(prev => (prev === cat ? null : cat));
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#16845B] bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-[#A96812] bg-amber-50 border-amber-200';
    return 'text-[#C43D43] bg-red-50 border-red-200';
  };

  const detectedKws = analysis.detectedKeywords || [];
  const missingKws = analysis.missingKeywords || [];
  const detectedSecs = analysis.detectedSections || ['Work Experience', 'Education', 'Skills', 'Contact Info'];
  const missingSecs = analysis.missingSections || [];

  return (
    <div className={`space-y-6 text-left ${className}`} data-testid="ats-explainability-breakdown">
      {/* Header with Transparency Notice */}
      <div className="bg-white rounded-2xl border border-[#E5E8ED] p-6 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#3157C8] flex items-center justify-center border border-blue-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#20242B]">
                ATS Score Explainability &amp; Category Breakdown
              </h3>
              <p className="text-[13px] text-[#626B78]">
                Understand how automated recruitment parsers scored each dimension of your resume.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-[#3157C8] text-[12px] font-semibold border border-blue-100 self-start sm:self-auto">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Deterministic Scoring</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-[13px] text-[#626B78] flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#3157C8] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-[#20242B]">Authentic Skills Policy:</strong> All keywords and section evaluations are derived directly from your document and authentic target role criteria. We never recommend fabricated credentials or keyword stuffing.
          </p>
        </div>
      </div>

      {/* 4 Core Category Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* CATEGORY 1: KEYWORD MATCH */}
        <div className="bg-white rounded-2xl border border-[#E5E8ED] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#3157C8] flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h4 className="text-[16px] font-bold text-[#20242B]">
                  Keyword Match
                </h4>
              </div>
              <span className={`text-[14px] font-bold px-3 py-1 rounded-full border ${getScoreColor(analysis.keywordMatchScore)}`}>
                {analysis.keywordMatchScore}%
              </span>
            </div>

            <p className="text-[13px] text-[#626B78] leading-relaxed">
              Measures alignment between your resume and industry or target job requirements. ATS algorithms scan for exact technical skills, frameworks, and domain expertise.
            </p>

            {/* Matched Keywords */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#16845B] block">
                Matched Keywords ({detectedKws.length})
              </span>
              {detectedKws.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(showAllKeywords ? detectedKws : detectedKws.slice(0, 10)).map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[12px] font-medium"
                    >
                      <CheckCircle2 className="w-3 h-3 text-[#16845B]" />
                      <span>{kw}</span>
                    </span>
                  ))}
                  {detectedKws.length > 10 && (
                    <button
                      type="button"
                      onClick={() => setShowAllKeywords(!showAllKeywords)}
                      className="text-[12px] text-[#3157C8] hover:underline self-center pl-1 font-semibold cursor-pointer"
                    >
                      {showAllKeywords ? 'Show fewer' : `+${detectedKws.length - 10} more`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-[12px] text-[#626B78] italic">No standard industry keywords matched.</p>
              )}
            </div>

            {/* Missing Keywords */}
            {missingKws.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-[#E5E8ED]">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#A96812] block">
                  Missing High-Impact Keywords ({missingKws.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {missingKws.slice(0, 8).map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[12px] font-medium"
                    >
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{kw}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 text-[12px] text-[#626B78] border-t border-[#E5E8ED]">
            <strong>Advice:</strong> Incorporate missing skills into project and work experience bullets where you have legitimate experience.
          </div>
        </div>

        {/* CATEGORY 2: FORMATTING & PARSEABILITY */}
        <div className="bg-white rounded-2xl border border-[#E5E8ED] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#3157C8] flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h4 className="text-[16px] font-bold text-[#20242B]">
                  Formatting &amp; Parseability
                </h4>
              </div>
              <span className={`text-[14px] font-bold px-3 py-1 rounded-full border ${getScoreColor(analysis.formattingScore)}`}>
                {analysis.formattingScore}%
              </span>
            </div>

            <p className="text-[13px] text-[#626B78] leading-relaxed">
              Evaluates how cleanly automated ATS parsers convert your visual layout into structured plaintext fields without scrambling text.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED]">
                <span className="text-[11px] font-bold uppercase text-[#626B78] block">Word Count</span>
                <span className="text-[16px] font-bold text-[#20242B]">{analysis.wordCount} words</span>
                <span className="text-[11px] text-[#16845B] block mt-0.5">
                  {analysis.wordCount >= 350 && analysis.wordCount <= 850 ? 'Optimal (1-2 pages)' : 'Acceptable'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED]">
                <span className="text-[11px] font-bold uppercase text-[#626B78] block">Layout Structure</span>
                <span className="text-[16px] font-bold text-[#20242B]">Linear A4</span>
                <span className="text-[11px] text-[#16845B] block mt-0.5">Table-Free Headers</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-[12px] text-[#20242B]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B] shrink-0" />
                <span>Clean typographic hierarchy with standard bullet symbols</span>
              </div>
              <div className="flex items-center gap-2 text-[12px] text-[#20242B]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B] shrink-0" />
                <span>Text extractable across all 3 parsing engine layers</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[12px] text-[#626B78] border-t border-[#E5E8ED]">
            <strong>Advice:</strong> Keep margins consistent and avoid multi-column tables or embedded images for job portal uploads.
          </div>
        </div>

        {/* CATEGORY 3: CONTENT QUALITY & IMPACT */}
        <div className="bg-white rounded-2xl border border-[#E5E8ED] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#3157C8] flex items-center justify-center">
                  <AlignLeft className="w-4 h-4" />
                </div>
                <h4 className="text-[16px] font-bold text-[#20242B]">
                  Content Quality &amp; Impact
                </h4>
              </div>
              <span className={`text-[14px] font-bold px-3 py-1 rounded-full border ${getScoreColor(analysis.contentScore)}`}>
                {analysis.contentScore}%
              </span>
            </div>

            <p className="text-[13px] text-[#626B78] leading-relaxed">
              Analyzes action verb strength, measurable business/technical outcomes ($/%, scale), and professional readability scores.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED]">
                <span className="text-[11px] font-bold uppercase text-[#626B78] block">Readability</span>
                <span className="text-[16px] font-bold text-[#20242B]">{analysis.readabilityScore}/100</span>
                <span className="text-[11px] text-[#16845B] block mt-0.5">Professional English</span>
              </div>

              <div className="p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED]">
                <span className="text-[11px] font-bold uppercase text-[#626B78] block">Bullet Strength</span>
                <span className="text-[16px] font-bold text-[#20242B]">
                  {analysis.bulletStrengthScore ? `${analysis.bulletStrengthScore}%` : 'Strong'}
                </span>
                <span className="text-[11px] text-[#3157C8] block mt-0.5">Action-Oriented</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-2 text-[12px] text-[#20242B]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16845B] shrink-0" />
                <span>Active verbs detected (engineered, architected, optimized, built)</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[12px] text-[#626B78] border-t border-[#E5E8ED]">
            <strong>Advice:</strong> Frame bullet points using the Formula: <em>[Action Verb] + [Task/Scope] + [Measurable Result]</em>.
          </div>
        </div>

        {/* CATEGORY 4: SECTION COMPLETENESS */}
        <div className="bg-white rounded-2xl border border-[#E5E8ED] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#3157C8] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h4 className="text-[16px] font-bold text-[#20242B]">
                  Section Completeness
                </h4>
              </div>
              <span className={`text-[14px] font-bold px-3 py-1 rounded-full border ${getScoreColor(analysis.sectionScore)}`}>
                {analysis.sectionScore}%
              </span>
            </div>

            <p className="text-[13px] text-[#626B78] leading-relaxed">
              Verifies the presence of all standard canonical sections required for ATS applicant profiles to index without data gaps.
            </p>

            {/* Detected Sections */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#16845B] block">
                Detected Canonical Sections ({detectedSecs.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {detectedSecs.map((sec, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[12px] font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3 text-[#16845B]" />
                    <span>{sec}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Sections */}
            {missingSecs.length > 0 ? (
              <div className="space-y-1.5 pt-2 border-t border-[#E5E8ED]">
                <span className="text-[12px] font-bold uppercase tracking-wider text-[#A96812] block">
                  Missing Recommended Sections ({missingSecs.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {missingSecs.map((sec, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[12px] font-medium"
                    >
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{sec}</span>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[12px] text-[#16845B] pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All essential recruitment sections are present and identifiable.</span>
              </div>
            )}
          </div>

          <div className="pt-2 text-[12px] text-[#626B78] border-t border-[#E5E8ED]">
            <strong>Advice:</strong> Ensure standard section headings (Work Experience, Education, Skills) are not replaced with ambiguous titles.
          </div>
        </div>
      </div>

      {/* Feedback Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-xs">
        <span className="text-[12px] text-[#626B78] font-medium">
          Was this ATS explainability breakdown helpful for optimizing your resume?
        </span>
        <FeedbackButtons category="ATS Suggestions" contextId={`ats-score-${analysis.overallAtsScore}`} />
      </div>
    </div>
  );
}
