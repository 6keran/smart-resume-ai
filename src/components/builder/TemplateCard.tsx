'use client';

import React from 'react';
import { ResumeTemplateInfo, ResumeTemplateId, ResumeData } from '@/types/resume';
import { ResumeRenderer } from './templates/ResumeRenderer';
import { Check, Eye, ShieldCheck, AlertCircle } from 'lucide-react';

export function TemplateCard({
  template,
  isSelected,
  onSelect,
  onPreview,
  previewData,
}: {
  template: ResumeTemplateInfo;
  isSelected: boolean;
  onSelect: (id: ResumeTemplateId) => void;
  onPreview: (id: ResumeTemplateId) => void;
  previewData: ResumeData;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState<number>(0.32);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const updateScale = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          setScale(w / 794);
        }
      }
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      id={`template-card-${template.id}`}
      data-template-id={template.id}
      className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-200 overflow-hidden hover:-translate-y-1 active:scale-[0.99] before:pointer-events-none before:absolute before:top-0 before:left-4 before:right-4 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent ${
        isSelected
          ? 'border-[var(--accent)] bg-[var(--accent-subtle)] ring-2 ring-[var(--accent)]/30 shadow-[var(--shadow-glass-hover)] -translate-y-0.5'
          : 'border-[var(--glass-border)] bg-[var(--glass-bg)] hover:bg-[var(--glass-bg-elevated)] hover:border-[var(--glass-border-hover)] hover:shadow-[var(--shadow-glass-hover)] backdrop-blur-xl'
      }`}
    >
      {/* Top Details & Badges */}
      <div className="p-3.5 pb-2">
        <div className="flex items-start justify-between gap-1.5 mb-1">
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-[var(--text-primary)] truncate">
              {template.name}
            </h3>
            {template.intendedUse && (
              <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate mt-0.5" title={template.intendedUse}>
                Best for: {template.intendedUse}
              </p>
            )}
          </div>

          {template.isVisualLayout ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full shrink-0"
              title="Visual layout for creative tech & portfolios. Single-column recommended for ATS-strict portals."
            >
              <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
              Visual Layout
            </span>
          ) : template.isAtsFriendly ? (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--color-success)] bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 px-2.5 py-0.5 rounded-full shrink-0"
              title="100% compliant single-column layout for Applicant Tracking Systems"
            >
              <ShieldCheck className="w-3 h-3 text-[var(--color-success)] shrink-0" />
              ATS-Friendly
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--accent)] bg-[var(--accent-subtle)] border border-[var(--border-color)] px-2.5 py-0.5 rounded-full shrink-0"
            >
              Portfolio Design
            </span>
          )}
        </div>

        <p className="text-[10.5px] text-[var(--text-secondary)] line-clamp-2 mt-1 leading-relaxed">
          {template.description}
        </p>
      </div>

      {/* Miniature Live A4 Representation (Actual Render, Proportional Fit) */}
      <div className="px-3.5 py-1">
        <div
          id={`template-preview-${template.id}`}
          ref={containerRef}
          onClick={() => onSelect(template.id)}
          className="relative w-full aspect-[210/297] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-white shadow-sm cursor-pointer select-none group-hover:shadow-md transition-shadow"
          title={`Click to select ${template.name}`}
        >
          {/* Scaled Live Renderer */}
          <div
            className="absolute top-0 left-0 w-[794px] h-[1123px] origin-top-left pointer-events-none select-none bg-white flex flex-col"
            style={{
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            <ResumeRenderer data={previewData} templateId={template.id} isMiniPreview={false} />
          </div>

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
            {isSelected && (
              <div className="absolute top-2 right-2 bg-[var(--accent)] text-white p-1 rounded-full shadow-md z-10">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="p-3.5 pt-2.5 mt-auto border-t border-[var(--glass-border)] flex items-center gap-2">
        <button
          id={`btn-preview-template-${template.id}`}
          type="button"
          onClick={() => onPreview(template.id)}
          className="btn-secondary btn-sm flex-1 h-8 px-2.5 text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs active:scale-95"
          title="Full Preview of this template"
        >
          <Eye className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
          Preview
        </button>

        <button
          id={`btn-select-template-${template.id}`}
          type="button"
          onClick={() => onSelect(template.id)}
          className={`btn-sm flex-1 h-8 px-2.5 rounded-full text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 ${
            isSelected
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
              : 'btn-primary'
          }`}
          title="Select this template"
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5" />
              Selected
            </>
          ) : (
            'Use Template'
          )}
        </button>
      </div>
    </div>
  );
}
