'use client';

import React from 'react';
import { SkillStatus, SupportedSkill } from '@/types/skills';
import { CheckCircle2, Clock, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SkillBadge({
  skill,
  status,
  score,
  onClick,
  className = '',
}: {
  skill: SupportedSkill | string;
  status: SkillStatus;
  score?: number;
  onClick?: () => void;
  className?: string;
}) {
  const config = {
    verified: {
      label: 'Verified',
      icon: CheckCircle2,
      badgeClass:
        'bg-[#16845B]/10 text-[#16845B] border-[#16845B]/30 hover:border-[#16845B]/60 shadow-xs',
      iconClass: 'text-[#16845B]',
    },
    claimed: {
      label: 'Claimed',
      icon: Clock,
      badgeClass:
        'bg-[#A96812]/10 text-[#A96812] border-[#A96812]/30 hover:border-[#A96812]/60 shadow-xs',
      iconClass: 'text-[#A96812]',
    },
    'not-verified': {
      label: 'Not Verified',
      icon: HelpCircle,
      badgeClass:
        'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--border-hover)]',
      iconClass: 'text-[var(--text-secondary)]',
    },
  }[status];

  const Icon = config.icon;

  return (
    <div
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 select-none',
        config.badgeClass,
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
    >
      <Icon className={cn('w-3.5 h-3.5', config.iconClass)} />
      <span className="font-semibold text-[var(--text-primary)]">{skill}</span>
      <span className="opacity-80">·</span>
      <span className="text-[11px] uppercase tracking-wider">{config.label}</span>
      {score !== undefined && status === 'verified' && (
        <span className="ml-1 px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-[10px] font-bold">
          {score}/10
        </span>
      )}
    </div>
  );
}
