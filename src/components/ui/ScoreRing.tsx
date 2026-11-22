'use client';

import React, { useEffect, useState } from 'react';

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subLabel?: string;
  showPercentage?: boolean;
  className?: string;
}

export function ScoreRing({
  score,
  maxScore = 100,
  size = 120,
  strokeWidth = 9,
  label,
  subLabel,
  showPercentage = false,
  className = '',
}: ScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let animFrame: number;
    const startVal = 0;
    const endVal = score;
    const durationMs = 850;
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(startVal + (endVal - startVal) * eased);
      if (progress < 1) {
        animFrame = requestAnimationFrame(update);
      }
    };

    animFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animFrame);
  }, [score]);

  const percentage = Math.min(Math.max((animatedScore / maxScore) * 100, 0), 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = () => {
    if (score >= 80) return { stroke: 'var(--color-success)', text: 'text-[var(--color-success)]' };
    if (score >= 60) return { stroke: 'var(--color-warning)', text: 'text-[var(--color-warning)]' };
    return { stroke: 'var(--color-error)', text: 'text-[var(--color-error)]' };
  };

  const { stroke, text } = getColor();

  return (
    <div className={`relative inline-flex flex-col items-center justify-center ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border-color)"
            strokeOpacity={0.6}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{
              transition: 'stroke-dashoffset 1s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
          <span className={`font-bold tracking-tight ${size > 100 ? 'text-3xl' : 'text-xl'} ${text}`}>
            {Math.round(animatedScore)}
            {showPercentage && <span className="text-sm font-normal">%</span>}
          </span>
          {subLabel && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-secondary)] opacity-80">
              {subLabel}
            </span>
          )}
        </div>
      </div>

      {label && (
        <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          {label}
        </span>
      )}
    </div>
  );
}
