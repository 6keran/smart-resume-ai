'use client';

import React, { useCallback } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive' | 'accent' | 'glass' | 'glass-elevated' | 'liquid' | 'workbench' | 'hero' | 'bento';
  glow?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  glow = false,
  onPointerMove,
  onPointerLeave,
  ...props
}: GlassCardProps) {
  const isInteractive = variant === 'interactive' || variant === 'liquid' || variant === 'workbench' || variant === 'bento';

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'touch') return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
      e.currentTarget.style.setProperty('--mouse-y', `${y}px`);

      if (onPointerMove) {
        onPointerMove(e);
      }
    },
    [onPointerMove]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.style.removeProperty('--mouse-x');
      e.currentTarget.style.removeProperty('--mouse-y');

      if (onPointerLeave) {
        onPointerLeave(e);
      }
    },
    [onPointerLeave]
  );

  const variantStyles = {
    default: 'glass-card',
    elevated: 'glass-card bg-[var(--glass-bg-elevated)]',
    interactive: 'glass-card-interactive',
    liquid: 'liquid-glass-card',
    workbench: 'glass-workbench',
    hero: 'glass-hero',
    accent: 'glass-card border-[var(--accent)]/30',
    glass: 'glass-card',
    'glass-elevated': 'glass-card bg-[var(--glass-bg-elevated)]',
    bento: 'bento-card',
  };

  return (
    <div
      className={cn(
        'relative rounded-2xl p-5 sm:p-6',
        variantStyles[variant],
        glow && 'border-[var(--accent)]/40 shadow-[var(--shadow-glass-hover)]',
        className
      )}
      onPointerMove={isInteractive ? handlePointerMove : onPointerMove}
      onPointerLeave={isInteractive ? handlePointerLeave : onPointerLeave}
      onPointerOut={isInteractive ? handlePointerLeave : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
