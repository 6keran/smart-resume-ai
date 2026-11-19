'use client';

import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Check, Loader2 } from 'lucide-react';

export interface FeedbackButtonsProps {
  category: 'Career Copilot' | 'ATS Suggestions' | 'Project Coach' | 'Resume Builder' | string;
  contextId?: string;
  onFeedbackSubmitted?: (rating: 1 | 5) => void;
  className?: string;
}

export function FeedbackButtons({
  category,
  contextId,
  onFeedbackSubmitted,
  className = '',
}: FeedbackButtonsProps) {
  const [submittedRating, setSubmittedRating] = useState<1 | 5 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRate = async (rating: 1 | 5) => {
    if (submittedRating !== null || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          category,
          feedback: rating === 5 ? 'Helpful' : 'Not helpful',
          suggestions: contextId ? `Context: ${contextId}` : '',
        }),
      });

      setSubmittedRating(rating);
      onFeedbackSubmitted?.(rating);
    } catch {
      // Gracefully show submitted state anyway to not frustrate user
      setSubmittedRating(rating);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedRating !== null) {
    return (
      <div className={`inline-flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium py-1 px-2 rounded-lg bg-emerald-50 border border-emerald-200/60 ${className}`}>
        <Check className="w-3 h-3 text-emerald-600" />
        <span>Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] ${className}`}>
      <span className="text-[10px] text-[var(--text-muted)] font-medium mr-1">Was this helpful?</span>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => handleRate(5)}
        className="p-1 rounded-md hover:bg-[var(--bg-secondary)] hover:text-emerald-600 text-[var(--text-secondary)] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
        title="Helpful"
        aria-label="Rate as helpful"
      >
        {isSubmitting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ThumbsUp className="w-3 h-3" />
        )}
      </button>

      <button
        type="button"
        disabled={isSubmitting}
        onClick={() => handleRate(1)}
        className="p-1 rounded-md hover:bg-[var(--bg-secondary)] hover:text-rose-600 text-[var(--text-secondary)] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
        title="Not helpful"
        aria-label="Rate as not helpful"
      >
        <ThumbsDown className="w-3 h-3" />
      </button>
    </div>
  );
}
