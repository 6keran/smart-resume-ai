'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive' | 'accent' | 'glass' | 'glass-elevated';
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  glow = false,
  ...props
}: GlassCardProps) {
  const isGlassVariant = variant === 'glass' || variant === 'glass-elevated' || variant === 'default' || variant === 'elevated';

  const variantStyles = {
    default: 'glass-card',
    elevated: 'glass-card bg-[var(--glass-bg-elevated)]',
    interactive: 'glass-card-interactive',
    accent: 'glass-card border-[var(--accent)]/30',
    glass: 'glass-card',
    'glass-elevated': 'glass-card bg-[var(--glass-bg-elevated)]',
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl p-5 sm:p-6',
        variantStyles[variant],
        glow && 'border-[var(--accent)]/40 shadow-[0_0_20px_rgba(79,143,247,0.08)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
