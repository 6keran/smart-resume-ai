'use client';

import React, { ReactNode, useEffect, useId, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { JobSearchSuggestion } from '@/server/services/jobs/suggestions';

const suggestionResponseCache = new Map<string, JobSearchSuggestion[]>();

function cacheSuggestions(key: string, suggestions: JobSearchSuggestion[]) {
  suggestionResponseCache.delete(key);
  suggestionResponseCache.set(key, suggestions);
  if (suggestionResponseCache.size > 100) {
    const oldestKey = suggestionResponseCache.keys().next().value;
    if (oldestKey) suggestionResponseCache.delete(oldestKey);
  }
}

interface JobSearchAutocompleteProps {
  field: 'keywords' | 'location';
  label: string;
  value: string;
  placeholder: string;
  leadingIcon: ReactNode;
  onChange: (value: string) => void;
  onSelect: (value: string) => void;
  className?: string;
}

function HighlightedValue({ value, query }: { value: string; query: string }) {
  const terms = query.trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return value;

  const escapedTerms = terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const matcher = new RegExp(`(${escapedTerms.join('|')})`, 'ig');
  const parts = value.split(matcher);

  return parts.map((part, index) =>
    terms.some((term) => part.toLocaleLowerCase() === term.toLocaleLowerCase())
      ? <mark key={`${part}-${index}`} className="rounded-sm bg-[var(--accent)]/15 text-inherit">{part}</mark>
      : part
  );
}

export function JobSearchAutocomplete({
  field,
  label,
  value,
  placeholder,
  leadingIcon,
  onChange,
  onSelect,
  className = '',
}: JobSearchAutocompleteProps) {
  const id = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<JobSearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');

  const query = value.trim();
  const isOpen = focused && query.length >= 2 && status !== 'idle';
  const listboxId = `${id}-suggestions`;

  useEffect(() => {
    if (!focused || query.length < 2) {
      requestIdRef.current += 1;
      setSuggestions([]);
      setActiveIndex(-1);
      setStatus('idle');
      return;
    }

    const requestId = ++requestIdRef.current;
    const cacheKey = `${field}:${query.toLocaleLowerCase()}`;
    const cachedSuggestions = suggestionResponseCache.get(cacheKey);
    if (cachedSuggestions) {
      setSuggestions(cachedSuggestions);
      setActiveIndex(-1);
      setStatus('ready');
      return;
    }

    const controller = new AbortController();
    setSuggestions([]);
    setActiveIndex(-1);
    setStatus('loading');

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/jobs/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field, query }),
          signal: controller.signal,
        });

        if (!response.ok) throw new Error('Suggestion request failed');
        const result = await response.json() as { suggestions?: JobSearchSuggestion[] };
        if (requestId !== requestIdRef.current) return;

        const nextSuggestions = Array.isArray(result.suggestions) ? result.suggestions : [];
        cacheSuggestions(cacheKey, nextSuggestions);
        setSuggestions(nextSuggestions);
        setStatus('ready');
      } catch {
        if (controller.signal.aborted || requestId !== requestIdRef.current) return;
        setSuggestions([]);
        setStatus('error');
      }
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [field, focused, query]);

  useEffect(() => {
    if (!focused) return;

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !wrapperRef.current?.contains(event.target)) {
        setFocused(false);
      }
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [focused]);

  const selectSuggestion = (suggestion: JobSearchSuggestion) => {
    onChange(suggestion.value);
    onSelect(suggestion.value);
    setFocused(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && focused) {
      event.preventDefault();
      setFocused(false);
      setActiveIndex(-1);
      return;
    }

    if (!isOpen || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => current <= 0 ? suggestions.length - 1 : current - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative min-w-0 ${className}`}>
      <label htmlFor={`${id}-input`} className="sr-only">{label}</label>
      <span className="absolute left-3.5 top-3.5 text-[var(--text-secondary)] pointer-events-none">
        {leadingIcon}
      </span>
      <input
        id={`${id}-input`}
        type="text"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={isOpen && suggestions.length > 0 ? listboxId : undefined}
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        aria-busy={status === 'loading'}
        value={value}
        onFocus={() => setFocused(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setFocused(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full min-h-11 pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/80 text-[var(--text-primary)] text-xs sm:text-sm focus:outline-none focus:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/20 transition-colors duration-150"
      />

      {isOpen && (
        <div className="absolute z-40 left-0 right-0 top-full mt-1.5 overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/95 shadow-lg backdrop-blur-xl animate-fade-in">
          {status === 'loading' && (
            <p role="status" className="flex items-center gap-2 px-3.5 py-3 text-xs text-[var(--text-secondary)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
              Finding suggestions…
            </p>
          )}

          {status === 'error' && (
            <p role="status" className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">
              Suggestions are temporarily unavailable. You can still search with this text.
            </p>
          )}

          {status === 'ready' && suggestions.length === 0 && (
            <p role="status" className="px-3.5 py-3 text-xs text-[var(--text-secondary)]">
              No matching suggestions. Press Enter or Search to use your text.
            </p>
          )}

          {status === 'ready' && suggestions.length > 0 && (
            <ul id={listboxId} role="listbox" aria-label={`${label} suggestions`} className="max-h-64 overflow-y-auto py-1">
              {suggestions.map((suggestion, index) => (
                <li
                  key={`${suggestion.kind}-${suggestion.value}`}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`flex min-h-10 cursor-pointer items-center justify-between gap-3 px-3.5 py-2 text-left text-sm transition-colors duration-100 ${
                    activeIndex === index
                      ? 'bg-[var(--accent-subtle)] text-[var(--text-primary)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                >
                  <span className="min-w-0 truncate"><HighlightedValue value={suggestion.value} query={query} /></span>
                  <span className="shrink-0 text-[10px] font-medium text-[var(--text-muted)]">{suggestion.kind}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
