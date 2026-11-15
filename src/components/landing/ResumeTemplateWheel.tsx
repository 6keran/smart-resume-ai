'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Layers,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { RESUME_TEMPLATES } from '@/lib/templates';
import type { ResumeTemplateInfo } from '@/types/resume';

const STEP = 28; // Degrees between cards on the 3D drum
const DRUM_RADIUS = 380; // Distance in Z-space
const PERSPECTIVE = 1100;

export default function ResumeTemplateWheel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [turn, setTurn] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartTurn, setDragStartTurn] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const templates = RESUME_TEMPLATES.slice(0, 12);
  const total = templates.length;

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Update target turn when currentIndex changes via controls
  const rotateTo = useCallback((index: number) => {
    const normalized = (index + total) % total;
    setCurrentIndex(normalized);
    setTurn(normalized * STEP);
  }, [total]);

  const handlePrev = useCallback(() => {
    rotateTo(currentIndex - 1);
  }, [currentIndex, rotateTo]);

  const handleNext = useCallback(() => {
    rotateTo(currentIndex + 1);
  }, [currentIndex, rotateTo]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      }
    },
    [handleNext, handlePrev]
  );

  // Wheel listener inside container (passive, without hijacking whole window)
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaY) > 25) {
      if (e.deltaY > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
  };

  // Pointer drag gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartY(e.clientY);
    setDragStartTurn(turn);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = dragStartY - e.clientY;
    const newTurn = dragStartTurn + deltaY * 0.35;
    setTurn(newTurn);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    // Snap to closest step
    const nearestIndex = Math.round(turn / STEP);
    rotateTo(nearestIndex);
  };

  const currentTemplate = templates[currentIndex] || templates[0];

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="3D Resume Template Carousel"
      className="relative rounded-2xl border border-[var(--border-color)] bg-[var(--bg-secondary)] overflow-hidden shadow-xs select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      {/* ── Top HUD Header ── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/80 backdrop-blur-xs text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          <span className="font-bold text-[var(--text-primary)] uppercase tracking-wider">
            3D TEMPLATE ENGINE
          </span>
          <span className="text-[var(--text-muted)]">
            [{String(currentIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}]
          </span>
        </div>

        {/* Carousel Arrow Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrev}
            className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
            aria-label="Previous template"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer"
            aria-label="Next template"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Reduced Motion Fallback Grid ── */}
      {prefersReducedMotion ? (
        <div className="p-6 max-h-[460px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="p-5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)]">
                  {t.category}
                </span>
                <span className="text-[10px] font-mono text-emerald-600 font-bold">
                  ATS Verified
                </span>
              </div>
              <h4 className="font-bold text-sm text-[var(--text-primary)]">{t.name}</h4>
              <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{t.description}</p>
              <Link
                href={`/builder?template=${t.id}`}
                className="btn-primary text-xs py-1.5 px-3 rounded-lg inline-flex items-center gap-1.5"
              >
                <span>Use Template</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          ))}
        </div>
      ) : (
        /* ── 3D Interactive Drum Reel ── */
        <div
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative h-[420px] sm:h-[460px] flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing touch-pan-x"
          style={{ perspective: `${PERSPECTIVE}px` }}
        >
          {/* Subtle Ambient Depth Lighting */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,rgba(49,87,200,0.04)_0%,transparent_70%)]" />

          {/* 3D Wheel Drum Container */}
          <div
            className="relative w-full h-full flex items-center justify-center pointer-events-none"
            style={{
              transformStyle: 'preserve-3d',
              transition: isDragging ? 'none' : 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {templates.map((template, idx) => {
              // Calculate relative rotational offset from current turn
              const cardAngle = idx * STEP - turn;
              // Wrap angle to [-180, 180] for continuous looping
              const wrappedAngle = ((((cardAngle + 180) % 360) + 360) % 360) - 180;
              const isFront = Math.abs(wrappedAngle) < STEP / 2;
              const distanceFactor = Math.abs(wrappedAngle) / 90;

              // Cull cards that are on the far back side of the drum
              if (Math.abs(wrappedAngle) > 85) return null;

              const opacity = Math.max(0.15, 1 - distanceFactor * 0.7);
              const scale = Math.max(0.85, 1 - distanceFactor * 0.15);

              return (
                <div
                  key={template.id}
                  onClick={() => rotateTo(idx)}
                  className={`group absolute w-[290px] sm:w-[330px] rounded-xl border transition-all duration-300 pointer-events-auto [backface-visibility:hidden] cursor-pointer ${
                    isFront
                      ? 'bg-[var(--bg-card)] border-[var(--accent)] shadow-xl ring-2 ring-[var(--accent)]/15 z-30'
                      : 'bg-[var(--bg-card)]/90 border-[var(--border-color)] shadow-sm hover:border-[var(--accent)]/50 z-10'
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${-wrappedAngle}deg) translateZ(${DRUM_RADIUS}px) scale(${scale})`,
                    opacity,
                  }}
                >
                  <div className="p-5 space-y-3.5">
                    {/* Card Header: Category & ATS Score */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] border border-[var(--accent)]/20">
                        {template.category}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ATS Verified</span>
                      </div>
                    </div>

                    {/* Template Name & Intended Role */}
                    <div>
                      <h4 className="font-bold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {template.name}
                      </h4>
                      <p className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 truncate">
                        {template.intendedUse}
                      </p>
                    </div>

                    {/* Structural Description */}
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                      {template.description}
                    </p>

                    {/* Formatting Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(template.tags || []).slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] font-medium text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded border border-[var(--border-color)]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[var(--text-muted)]">
                        Strict A4 Geometry
                      </span>
                      <Link
                        href={`/builder?template=${template.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] inline-flex items-center gap-1"
                      >
                        <span>Preview in Builder</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Bottom Status Strip & Quick Category Selector ── */}
      <div className="px-5 py-3 border-t border-[var(--border-color)] bg-[var(--bg-primary)]/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-[var(--text-muted)]">ACTIVE SELECTION:</span>
          <span className="font-bold text-[var(--text-primary)]">{currentTemplate.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/builder?template=${currentTemplate.id}`}
            className="btn-primary text-xs py-1.5 px-4 rounded-lg inline-flex items-center gap-1.5 shadow-xs"
          >
            <span>Load in Builder</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
