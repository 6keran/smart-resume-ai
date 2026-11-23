'use client';

import React, { useState } from 'react';
import {
  Check,
  Plus,
  Minus,
  ArrowRight,
  Split,
  FileCheck,
  Sparkles,
  Info,
  Trash2,
} from 'lucide-react';

export interface BulletComparisonItem {
  id?: string;
  section: string;
  original: string;
  tailored: string;
  improvementExplanation?: string;
  isApplied?: boolean;
}

export interface ResumeComparisonData {
  originalSummary?: string;
  tailoredSummary?: string;
  addedKeywords: string[];
  removedContent: string[];
  bulletComparisons: BulletComparisonItem[];
}

export interface ResumeComparisonViewProps {
  comparison: ResumeComparisonData;
  onApplyBullet?: (index: number, bullet: BulletComparisonItem) => void;
  onApplyAll?: () => void;
  onApplySummary?: () => void;
  className?: string;
}

export function ResumeComparisonView({
  comparison,
  onApplyBullet,
  onApplyAll,
  onApplySummary,
  className = '',
}: ResumeComparisonViewProps) {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');
  const [appliedBullets, setAppliedBullets] = useState<Set<number>>(new Set());
  const [summaryApplied, setSummaryApplied] = useState(false);

  const handleApplySingle = (idx: number, b: BulletComparisonItem) => {
    setAppliedBullets(prev => new Set(prev).add(idx));
    onApplyBullet?.(idx, b);
  };

  const handleApplySum = () => {
    setSummaryApplied(true);
    onApplySummary?.();
  };

  const handleApplyEverything = () => {
    const all = new Set(comparison.bulletComparisons.map((_, i) => i));
    setAppliedBullets(all);
    setSummaryApplied(true);
    onApplyAll?.();
  };

  const addedKeywords = comparison.addedKeywords || [];
  const removedContent = comparison.removedContent || [];
  const bullets = comparison.bulletComparisons || [];

  return (
    <div
      className={`space-y-6 text-left ${className}`}
      data-testid="resume-comparison-view"
      role="region"
      aria-label="Resume Comparison View"
    >
      {/* 1. Header Metrics & Controls */}
      <div className="bg-white rounded-2xl border border-[#E5E8ED] p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#3157C8] flex items-center justify-center border border-blue-100">
              <Split className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[18px] font-bold text-[#20242B]">
                Resume Comparison: Original vs. Tailored
              </h3>
              <p className="text-[13px] text-[#626B78]">
                Review side-by-side modifications before applying enhancements to your active resume.
              </p>
            </div>
          </div>

          {/* View Mode Toggle & Batch Apply */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="inline-flex items-center p-1 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] text-[13px]">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  viewMode === 'split'
                    ? 'bg-white text-[#20242B] shadow-xs font-semibold'
                    : 'text-[#626B78] hover:text-[#20242B]'
                }`}
              >
                Split View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  viewMode === 'unified'
                    ? 'bg-white text-[#20242B] shadow-xs font-semibold'
                    : 'text-[#626B78] hover:text-[#20242B]'
                }`}
              >
                Unified Diff
              </button>
            </div>

            {onApplyAll && (
              <button
                type="button"
                onClick={handleApplyEverything}
                className="px-4 py-2 rounded-xl bg-[#3157C8] hover:bg-[#2447AB] text-white text-[13px] font-semibold transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Accept All ({bullets.length + (comparison.tailoredSummary ? 1 : 0)})</span>
              </button>
            )}
          </div>
        </div>

        {/* Diff Metric Summary Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between">
            <span className="text-[13px] font-bold text-emerald-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#16845B]" />
              <span>Added Keywords</span>
            </span>
            <span className="text-[16px] font-bold text-[#16845B]">+{addedKeywords.length}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between">
            <span className="text-[13px] font-bold text-blue-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#3157C8]" />
              <span>Improved Bullets</span>
            </span>
            <span className="text-[16px] font-bold text-[#3157C8]">+{bullets.length}</span>
          </div>

          <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200 flex items-center justify-between">
            <span className="text-[13px] font-bold text-red-900 flex items-center gap-1.5">
              <Minus className="w-4 h-4 text-[#C43D43]" />
              <span>Removed Filler</span>
            </span>
            <span className="text-[16px] font-bold text-[#C43D43]">-{removedContent.length}</span>
          </div>
        </div>
      </div>

      {/* 2. Added & Removed Keywords Showcase */}
      {(addedKeywords.length > 0 || removedContent.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Added Keywords */}
          {addedKeywords.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E8ED] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E8ED] pb-2.5">
                <span className="text-[14px] font-bold text-[#16845B] flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  <span>Incorporated Target Keywords ({addedKeywords.length})</span>
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  +Keyword Match
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {addedKeywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-900 border border-emerald-200 text-[12px] font-semibold"
                  >
                    <span>+{kw}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Removed Irrelevant Content */}
          {removedContent.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E8ED] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E5E8ED] pb-2.5">
                <span className="text-[14px] font-bold text-[#C43D43] flex items-center gap-1.5">
                  <Trash2 className="w-4 h-4" />
                  <span>Removed Irrelevant / Low-Impact Content ({removedContent.length})</span>
                </span>
                <span className="text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                  Pruned Filler
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {removedContent.map((item, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-50 text-red-800 border border-red-200 text-[12px] line-through font-medium"
                  >
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Summary Comparison */}
      {comparison.tailoredSummary && (
        <div className="bg-white rounded-2xl border border-[#E5E8ED] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E8ED] pb-3">
            <span className="text-[16px] font-bold text-[#20242B]">Professional Summary Optimization</span>
            {onApplySummary && (
              <button
                type="button"
                onClick={handleApplySum}
                disabled={summaryApplied}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  summaryApplied
                    ? 'bg-emerald-50 text-[#16845B] border border-emerald-200'
                    : 'bg-[#3157C8] hover:bg-[#2447AB] text-white'
                }`}
              >
                {summaryApplied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Applied to Resume</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" />
                    <span>Apply Tailored Summary</span>
                  </>
                )}
              </button>
            )}
          </div>

          {viewMode === 'split' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-red-50/40 border border-red-200/60 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block">
                  Original Summary
                </span>
                <p className="text-[13px] text-[#626B78] leading-relaxed">
                  {comparison.originalSummary || 'No existing professional summary provided.'}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Tailored High-Impact Summary
                </span>
                <p className="text-[13px] text-[#20242B] font-medium leading-relaxed">
                  {comparison.tailoredSummary}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#F6F7F9] border border-[#E5E8ED] space-y-3">
              {comparison.originalSummary && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-900 line-through leading-relaxed">
                  {comparison.originalSummary}
                </div>
              )}
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-950 font-medium leading-relaxed">
                {comparison.tailoredSummary}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Experience & Project Bullet Point Comparison */}
      <div className="bg-white rounded-2xl border border-[#E5E8ED] p-6 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E5E8ED] pb-3">
          <div>
            <h4 className="text-[16px] font-bold text-[#20242B]">
              Bullet Point Enhancements ({bullets.length})
            </h4>
            <p className="text-[13px] text-[#626B78]">
              Rewritten with the XYZ impact formula: Accomplished [X], as measured by [Y], by doing [Z].
            </p>
          </div>
          <span className="text-[13px] font-semibold text-[#16845B]">
            {appliedBullets.size} of {bullets.length} Applied
          </span>
        </div>

        {bullets.length > 0 ? (
          <div className="space-y-4">
            {bullets.map((b, idx) => {
              const isApplied = appliedBullets.has(idx) || b.isApplied;

              return (
                <div
                  key={b.id || idx}
                  className="p-4 sm:p-5 rounded-xl border border-[#E5E8ED] bg-[#FAFAFA] space-y-3.5 hover:border-blue-200 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#3157C8] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                      {b.section}
                    </span>

                    {onApplyBullet && (
                      <button
                        type="button"
                        onClick={() => handleApplySingle(idx, b)}
                        disabled={isApplied}
                        className={`px-3 py-1 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                          isApplied
                            ? 'bg-emerald-50 text-[#16845B] border border-emerald-200'
                            : 'bg-white hover:bg-blue-50 border border-[#E5E8ED] text-[#20242B]'
                        }`}
                      >
                        {isApplied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Applied</span>
                          </>
                        ) : (
                          <>
                            <span>Accept Replacement</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {viewMode === 'split' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Left: Original */}
                      <div className="p-3.5 rounded-lg bg-red-50/50 border border-red-200/70 space-y-1">
                        <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">
                          Original Phrasing
                        </span>
                        <p className="text-[13px] text-[#626B78] leading-relaxed">
                          {b.original}
                        </p>
                      </div>

                      {/* Right: Tailored */}
                      <div className="p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 space-y-1">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                          Tailored High-Impact Phrasing
                        </span>
                        <p className="text-[13px] text-[#20242B] font-semibold leading-relaxed">
                          {b.tailored}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 rounded-lg bg-red-50/60 border border-red-200 text-[13px] text-red-900 line-through">
                        - {b.original}
                      </div>
                      <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-[13px] text-emerald-950 font-semibold">
                        + {b.tailored}
                      </div>
                    </div>
                  )}

                  {b.improvementExplanation && (
                    <div className="text-[12px] text-[#626B78] flex items-center gap-1.5 pt-1 border-t border-[#E5E8ED]">
                      <Info className="w-3.5 h-3.5 text-[#3157C8] shrink-0" />
                      <span>{b.improvementExplanation}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-[14px] text-[#626B78] italic">
            No bullet rewrites generated. Your existing bullet points already demonstrate strong metrics.
          </p>
        )}
      </div>
    </div>
  );
}
