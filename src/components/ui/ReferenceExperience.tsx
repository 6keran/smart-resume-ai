'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** One observer per route; document previews and examination controls stay untouched. */
export function ReferenceExperience({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const root = useRef<HTMLDivElement>(null);
  const kind = pathname === '/' ? 'home'
    : pathname?.startsWith('/skills/certificate/') ? 'document'
    : pathname?.startsWith('/skills/assess/') ? 'assessment'
    : pathname === '/login' || pathname === '/register' || pathname === '/admin/login' ? 'auth'
    : pathname?.startsWith('/admin') ? 'operations'
    : pathname?.startsWith('/dashboard') ? 'records' : 'workspace';

  useEffect(() => {
    const element = root.current;
    if (!element || kind === 'document' || kind === 'assessment' || kind === 'home') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer: IntersectionObserver | undefined;
    const revealed = new WeakSet<Element>();
    const tracked = new Set<HTMLElement>();
    const animations = new Set<Animation>();
    const pending = new Set<HTMLElement>();
    let scanFrame = 0;
    const reset = () => {
      observer?.disconnect();
      animations.forEach((animation) => animation.cancel());
      animations.clear();
      tracked.clear();
      pending.clear();
      cancelAnimationFrame(scanFrame);
      scanFrame = 0;
    };
    const start = () => {
      reset();
      if (preference.matches || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const item = entry.target as HTMLElement;
          // Web Animations does not mutate React-owned attributes during streamed hydration.
          const animation = item.animate([
            { opacity: 0, translate: '0 18px' },
            { opacity: 1, translate: '0 0' },
          ], { duration: 540, easing: 'cubic-bezier(.16, 1, .3, 1)' });
          animations.add(animation);
          animation.onfinish = () => animations.delete(animation);
          revealed.add(item);
          tracked.delete(item);
          observer?.unobserve(item);
        });
      }, { threshold: 0.06 });
      scan(element);
    };
    const scan = (subtree: HTMLElement) => {
      if (!observer || preference.matches) return;
      const selector = 'h1, .reference-panel, [data-reference-panel]';
      const candidates = Array.from(subtree.querySelectorAll<HTMLElement>(selector));
      if (subtree.matches(selector)) candidates.unshift(subtree);
      candidates.forEach((item) => {
        if (item.matches('input, textarea, select, button') || revealed.has(item) || tracked.has(item) || item.closest('[role="dialog"], .a4-sheet, .resume-preview-viewport, [data-resume-document], .reference-panel .reference-panel')) return;
        // Transform only small content surfaces: never ancestors of fixed/sticky controls.
        if (item.querySelector('.fixed, .sticky, [role="dialog"]')) return;
        tracked.add(item);
        observer?.observe(item);
      });
    };
    start();
    const mutations = new MutationObserver((records) => {
      if (!observer || preference.matches) return;
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof HTMLElement) pending.add(node);
      }));
      if (!pending.size || scanFrame) return;
      scanFrame = requestAnimationFrame(() => {
        scanFrame = 0;
        pending.forEach((subtree) => { if (subtree.isConnected) scan(subtree); });
        pending.clear();
      });
    });
    mutations.observe(element, { childList: true, subtree: true });
    preference.addEventListener('change', start);
    return () => {
      reset();
      mutations.disconnect();
      preference.removeEventListener('change', start);
    };
  }, [pathname, kind]);

  return <div ref={root} className={`reference-experience reference-experience--${kind}`}>{children}</div>;
}
