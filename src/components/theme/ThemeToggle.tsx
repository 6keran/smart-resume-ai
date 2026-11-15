'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  className?: string;
  variant?: 'segmented' | 'icon' | 'default';
}

export function ThemeToggle({ className = '', variant = 'segmented' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme, mounted } = useTheme();

  const isDark = mounted ? resolvedTheme === 'dark' : false;

  if (variant === 'icon') {
    return (
      <button
        type="button"
        id="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
        className={`theme-toggle theme-toggle-btn w-9 h-9 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-hover)] flex items-center justify-center transition-all duration-150 cursor-pointer shadow-xs text-[var(--text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] ${className}`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-500 rotate-0 scale-100 transition-transform duration-150" />
        ) : (
          <Moon className="w-4 h-4 text-[var(--accent)] rotate-0 scale-100 transition-transform duration-150" />
        )}
      </button>
    );
  }

  // Segmented control with clear Light and Dark options
  return (
    <div
      role="radiogroup"
      aria-label="Theme selector"
      className={`theme-toggle inline-flex items-center p-0.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xs transition-colors duration-150 ${className}`}
    >
      {/* Light Option Button */}
      <button
        type="button"
        role="radio"
        id="theme-toggle-light"
        aria-label="Switch to Light mode"
        aria-checked={!isDark}
        onClick={(e) => {
          e.stopPropagation();
          setTheme('light');
        }}
        className={`theme-toggle-btn theme-toggle-light flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer select-none whitespace-nowrap shrink-0 ${
          !isDark
            ? 'bg-white text-[var(--text-primary)] shadow-xs border border-[var(--border-color)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
        title="Activate Light Mode"
      >
        <Sun
          className={`w-3.5 h-3.5 transition-transform duration-150 ${
            !isDark ? 'text-amber-500' : 'text-[var(--text-muted)]'
          }`}
        />
        <span>Light</span>
      </button>

      {/* Dark Option Button */}
      <button
        type="button"
        role="radio"
        id="theme-toggle-dark"
        aria-label="Switch to Dark mode"
        aria-checked={isDark}
        onClick={(e) => {
          e.stopPropagation();
          setTheme('dark');
        }}
        className={`theme-toggle-btn theme-toggle-dark flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer select-none whitespace-nowrap shrink-0 ${
          isDark
            ? 'bg-[var(--accent)] text-white shadow-xs'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
        title="Activate Dark Mode"
      >
        <Moon
          className={`w-3.5 h-3.5 transition-transform duration-150 ${
            isDark ? 'text-white' : 'text-[var(--text-muted)]'
          }`}
        />
        <span>Dark</span>
      </button>
    </div>
  );
}
