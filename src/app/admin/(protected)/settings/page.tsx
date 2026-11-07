'use client';

import React from 'react';
import { Settings } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { ThemeSelector } from '@/components/theme/ThemeSelector';

export default function AdminSettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 text-left">
      <header className="border-b border-[var(--border-color)] pb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20 mb-2">
          <Settings className="w-3.5 h-3.5" />
          <span>Settings</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
          Appearance
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Choose how the admin console looks in this browser.
        </p>
      </header>

      <GlassCard className="p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Color theme</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Select light, dark, or follow your device preference.
          </p>
        </div>
        <ThemeSelector />
      </GlassCard>
    </div>
  );
}
