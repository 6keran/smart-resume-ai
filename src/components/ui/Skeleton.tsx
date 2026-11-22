'use client';

import React from 'react';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Base Skeleton shimmer primitive.
 * Replaces abrupt spinners with smooth, subtle content loading placeholders.
 */
export function Skeleton({ className = '', style }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer rounded-lg ${className}`}
      style={style}
    />
  );
}

/**
 * Skeleton Card for resume lists, job cards, or activity feeds.
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`p-5 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3.5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3.5 w-3/4" />
      <div className="pt-2 flex items-center gap-2">
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton Board placeholder for application tracker or multi-column layouts.
 */
export function SkeletonBoard({ columns = 5 }: { columns?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start"
    >
      {Array.from({ length: columns }).map((_, colIdx) => (
        <div
          key={colIdx}
          className="rounded-2xl bg-[#F8FAFC] border border-[#E5E8ED] p-3.5 flex flex-col space-y-3 min-h-[380px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E8ED]">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          {/* Card placeholders */}
          <div className="space-y-2.5 flex-1">
            <div className="p-3.5 rounded-xl bg-white border border-[#E5E8ED] space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="pt-2 border-t border-[#F1F3F5] flex justify-between">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-14" />
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-[#E5E8ED] space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
