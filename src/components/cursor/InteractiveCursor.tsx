'use client';

import React, { useEffect, useRef, useState } from 'react';

/**
 * High-performance, zero-rerender Interactive Cursor and Ambient Spotlight.
 *
 * Features:
 * - Ambient cursor-following spotlight glow with organic lerp smoothing.
 * - Precision inner dot for instantaneous feedback.
 * - Fluid morphing outer ring responding to interactive buttons, links, cards, text inputs, and drag handles.
 * - Subtle magnetic attraction on primary action buttons.
 * - Automatically disabled on touch/coarse devices and when prefers-reduced-motion is active.
 * - Strict pointer-events: none to guarantee zero interference with clicks, selections, typing, and drag interactions.
 */
export function InteractiveCursor() {
  const [mounted, setMounted] = useState(false);

  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if touch or coarse pointer device
    if (typeof window === 'undefined') return;
    const isTouch =
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isTouch || prefersReduced) {
      return;
    }

    setMounted(true);

    let targetX = -200;
    let targetY = -200;
    let ringX = -200;
    let ringY = -200;
    let glowX = -200;
    let glowY = -200;

    let isVisible = false;
    let currentMode: 'default' | 'pointer' | 'text' | 'drag' | 'magnetic' = 'default';
    let isMouseDown = false;
    let currentMagneticEl: HTMLElement | null = null;
    let rafId: number | null = null;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const glow = glowRef.current;

    const updateClasses = () => {
      if (!ring) return;
      ring.setAttribute('data-mode', currentMode);
      ring.setAttribute('data-down', isMouseDown ? 'true' : 'false');
      ring.setAttribute('data-visible', isVisible ? 'true' : 'false');
      if (dot) {
        dot.setAttribute('data-mode', currentMode);
        dot.setAttribute('data-visible', isVisible ? 'true' : 'false');
      }
      if (glow) {
        glow.setAttribute('data-visible', isVisible ? 'true' : 'false');
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;

      if (!isVisible) {
        isVisible = true;
        ringX = targetX;
        ringY = targetY;
        glowX = targetX;
        glowY = targetY;
        updateClasses();
      }

      // Check element under cursor for mode
      const target = e.target;
      if (target instanceof Element) {
        // 1. Text input detection
        const textEl = target.closest('input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]), textarea, [contenteditable="true"]');
        if (textEl) {
          if (currentMode !== 'text') {
            currentMode = 'text';
            updateClasses();
          }
          if (currentMagneticEl) {
            currentMagneticEl.style.transform = '';
            currentMagneticEl = null;
          }
          return;
        }

        // 2. Drag handle detection
        const dragEl = target.closest('.cursor-grab, .cursor-grabbing, [data-chat-drag="true"], [draggable="true"]');
        if (dragEl) {
          if (currentMode !== 'drag') {
            currentMode = 'drag';
            updateClasses();
          }
          if (currentMagneticEl) {
            currentMagneticEl.style.transform = '';
            currentMagneticEl = null;
          }
          return;
        }

        // 3. Magnetic primary buttons
        const magneticEl = target.closest('[data-magnetic="true"], .btn-primary, .btn-ink-pill, .landing-primary-button') as HTMLElement | null;
        if (magneticEl) {
          if (currentMode !== 'magnetic') {
            currentMode = 'magnetic';
            updateClasses();
          }
          currentMagneticEl = magneticEl;
          const rect = magneticEl.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const dx = Math.max(-8, Math.min(8, (targetX - centerX) * 0.24));
          const dy = Math.max(-8, Math.min(8, (targetY - centerY) * 0.24));
          magneticEl.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          return;
        } else if (currentMagneticEl) {
          currentMagneticEl.style.transform = '';
          currentMagneticEl = null;
        }

        // 4. General interactive elements
        const interactiveEl = target.closest(
          'a, button, [role="button"], [role="tab"], select, label[for], .btn-secondary, .btn-outline, .btn-ghost, .btn-tertiary, .saas-card-interactive, .cursor-pointer, [data-cursor="pointer"]'
        );
        if (interactiveEl) {
          if (currentMode !== 'pointer') {
            currentMode = 'pointer';
            updateClasses();
          }
          return;
        }

        // 5. Default mode
        if (currentMode !== 'default') {
          currentMode = 'default';
          updateClasses();
        }
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.button === 0) {
        isMouseDown = true;
        updateClasses();
      }
    };

    const handlePointerUp = () => {
      isMouseDown = false;
      updateClasses();
    };

    const handleMouseLeave = () => {
      isVisible = false;
      if (currentMagneticEl) {
        currentMagneticEl.style.transform = '';
        currentMagneticEl = null;
      }
      updateClasses();
    };

    const handleMouseEnter = () => {
      isVisible = true;
      updateClasses();
    };

    // Render loop using lerp for natural organic lag
    const loop = () => {
      // Fluid spring-like smoothing
      ringX += (targetX - ringX) * 0.25;
      ringY += (targetY - ringY) * 0.25;

      // Soft ambient glow lag
      glowX += (targetX - glowX) * 0.08;
      glowY += (targetY - glowY) * 0.08;

      if (dot) {
        dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) translate(-50%, -50%)`;
      }
      if (ring) {
        ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }
      if (glow) {
        glow.style.transform = `translate3d(${glowX}px, ${glowY}px, 0) translate(-50%, -50%)`;
      }

      rafId = window.requestAnimationFrame(loop);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      if (currentMagneticEl) {
        currentMagneticEl.style.transform = '';
      }
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* ── 1. Ambient Follower Spotlight Glow ── */}
      <div
        ref={glowRef}
        data-custom-cursor="glow"
        aria-hidden="true"
        className="fixed top-0 left-0 w-[420px] h-[420px] rounded-full pointer-events-none z-[99990] transition-opacity duration-300 opacity-0 data-[visible=true]:opacity-100 will-change-transform mix-blend-screen dark:mix-blend-lighten"
        style={{
          background:
            'radial-gradient(circle, rgba(79, 131, 241, 0.09) 0%, rgba(79, 131, 241, 0.025) 45%, transparent 70%)',
          userSelect: 'none',
        }}
      />

      {/* ── 2. Fluid Morphing Cursor Ring ── */}
      <div
        ref={ringRef}
        data-custom-cursor="ring"
        aria-hidden="true"
        className="fixed top-0 left-0 pointer-events-none z-[99998] rounded-full will-change-transform border transition-[width,height,border-color,background-color,border-radius,opacity] duration-200 ease-out opacity-0 data-[visible=true]:opacity-100
        w-7 h-7 border-[var(--accent)]/40 bg-[var(--accent)]/5 backdrop-blur-[0.5px]
        data-[mode=pointer]:w-11 data-[mode=pointer]:h-11 data-[mode=pointer]:border-[var(--accent)]/65 data-[mode=pointer]:bg-[var(--accent)]/15 data-[mode=pointer]:shadow-[0_0_16px_rgba(79,131,241,0.25)]
        data-[mode=magnetic]:w-12 data-[mode=magnetic]:h-12 data-[mode=magnetic]:border-[var(--accent)]/80 data-[mode=magnetic]:bg-[var(--accent)]/20 data-[mode=magnetic]:shadow-[0_0_20px_rgba(79,131,241,0.35)]
        data-[mode=text]:w-1 data-[mode=text]:h-5 data-[mode=text]:rounded-sm data-[mode=text]:border-transparent data-[mode=text]:bg-[var(--accent)]
        data-[mode=drag]:w-9 data-[mode=drag]:h-9 data-[mode=drag]:border-amber-400/60 data-[mode=drag]:bg-amber-400/10
        data-[down=true]:scale-90"
        style={{ userSelect: 'none' }}
      />

      {/* ── 3. Crisp Immediate Pointer Dot ── */}
      <div
        ref={dotRef}
        data-custom-cursor="dot"
        aria-hidden="true"
        className="fixed top-0 left-0 pointer-events-none z-[99999] rounded-full will-change-transform transition-[width,height,opacity,background-color] duration-150 ease-out opacity-0 data-[visible=true]:opacity-100
        w-1.5 h-1.5 bg-[var(--accent)] shadow-[0_0_6px_var(--accent)]
        data-[mode=text]:opacity-0
        data-[mode=magnetic]:w-2 data-[mode=magnetic]:h-2 data-[mode=magnetic]:bg-white
        data-[mode=drag]:bg-amber-400 data-[mode=drag]:shadow-[0_0_8px_rgba(251,191,36,0.6)]"
        style={{ userSelect: 'none' }}
      />
    </>
  );
}

