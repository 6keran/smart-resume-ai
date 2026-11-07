'use client';

import React, { useRef, useEffect, useState } from 'react';
import { ResumeData, ResumeTemplateId } from '@/types/resume';
import { ResumeRenderer } from './templates/ResumeRenderer';

export function A4ResumeDocument({
  data,
  templateId,
  zoom = 1,
}: {
  data: ResumeData;
  templateId?: ResumeTemplateId;
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [docHeight, setDocHeight] = useState<number>(1123);

  const A4_WIDTH_PX = 794;
  const A4_PAGE_HEIGHT_PX = 1123;

  // Measure content height to render realistic page-break guides
  useEffect(() => {
    if (containerRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = Math.max(A4_PAGE_HEIGHT_PX, Math.ceil(entry.contentRect.height));
          setDocHeight(height);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, []);

  const totalPages = Math.ceil(docHeight / A4_PAGE_HEIGHT_PX);
  const scaledWidth = Math.round(A4_WIDTH_PX * zoom);
  const scaledHeight = Math.round(docHeight * zoom);

  return (
    <div
      className="preview-scale-wrapper select-text transition-all duration-150"
      style={{
        width: `${scaledWidth}px`,
        height: `${scaledHeight}px`,
        position: 'relative',
        margin: '0 auto',
        flexShrink: 0,
      }}
    >
      <div
        id="resume-a4-document-wrapper"
        style={{
          width: `${A4_WIDTH_PX}px`,
          minHeight: `${A4_PAGE_HEIGHT_PX}px`,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        <div
          ref={containerRef}
          id="resume-a4-document"
          data-testid="a4-resume-document"
          className="relative a4-page bg-white text-slate-900 shadow-[0_10px_35px_rgba(0,0,0,0.15)] border border-slate-200/60 rounded-[2px] transition-shadow select-text flex flex-col flex-1"
          style={{
            width: `${A4_WIDTH_PX}px`,
            minHeight: `${A4_PAGE_HEIGHT_PX}px`,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Active Template Renderer */}
          <ResumeRenderer data={data} templateId={templateId} />

          {/* Visual Multipage Break Indicators in Live Preview (Hidden in Print) */}
          {totalPages > 1 &&
            Array.from({ length: totalPages - 1 }).map((_, idx) => (
              <div
                key={idx}
                className="no-print absolute left-0 right-0 pointer-events-none flex items-center justify-between px-6 z-10"
                style={{ top: `${(idx + 1) * A4_PAGE_HEIGHT_PX}px` }}
              >
                <div className="w-full border-t border-dashed border-slate-400/50 relative">
                  <span className="absolute -top-3 right-4 bg-slate-800 text-white text-[10px] font-medium px-2.5 py-0.5 rounded shadow-sm">
                    Page {idx + 2} of {totalPages}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
