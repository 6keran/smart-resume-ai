'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CompanionState } from '@/components/assistant/companionMotion';

const GREETING_KEY = 'sra_nimbus_greeting_shown';
const OWN_SURFACES = '[data-assistant-mode], [data-nimbus-greeting]';

type PresentationOptions = {
  enabled: boolean;
  open: boolean;
  pending: boolean;
  typing: boolean;
  welcome: boolean;
  dragging: boolean;
  replyId?: string;
  copiedId: string | null;
  error: string | null;
  placement: { x: number; y: number } | null;
  launcherRef: RefObject<HTMLDivElement | null>;
};

// Presentation observes existing UI signals; it never sends requests or edits chat messages.
export function useAssistantPresentation({ enabled, open, pending, typing, welcome, dragging, replyId, copiedId, error, placement, launcherRef }: PresentationOptions) {
  const [blocked, setBlocked] = useState(false);
  const [overlayReady, setOverlayReady] = useState(false);
  const [greeting, setGreeting] = useState(false);
  const [feedback, setFeedback] = useState<CompanionState>('idle');
  const [bubble, setBubble] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ left: 16, top: 16, width: 280 });
  const greeted = useRef(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flash = useCallback((state: CompanionState, duration: number) => {
    clearTimeout(feedbackTimer.current);
    setFeedback(state);
    if (duration) feedbackTimer.current = setTimeout(() => setFeedback('idle'), duration);
  }, []);

  useEffect(() => () => clearTimeout(feedbackTimer.current), []);
  useEffect(() => {
    if (replyId && !replyId.startsWith('welcome')) flash('answering', 1600);
    else flash('idle', 0);
  }, [replyId, flash]);
  useEffect(() => {
    if (copiedId) flash('success', 1900);
  }, [copiedId, flash]);
  useEffect(() => {
    if (error) flash('error', 1500);
  }, [error, flash]);

  useEffect(() => {
    if (!open) { setGreeting(false); return; }
    if (greeted.current) return;
    greeted.current = true;
    setGreeting(true);
    const timer = setTimeout(() => setGreeting(false), 1600);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!enabled) { setOverlayReady(false); setBubble(false); return; }
    let frame = 0;
    const scan = () => {
      frame = 0;
      const candidates = document.querySelectorAll<HTMLElement>('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"], [class*="fixed"][class*="inset-0"]');
      setBlocked(Array.from(candidates).some((element) => {
        if (element.closest(OWN_SURFACES)) return false;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (!box.width || !box.height || style.visibility === 'hidden' || style.display === 'none') return false;
        return element.matches('dialog[open], [role="dialog"], [role="alertdialog"], [aria-modal="true"]') || (Number(style.zIndex) >= 50 && style.pointerEvents !== 'none');
      }));
      setOverlayReady(true);
    };
    const observer = new MutationObserver((records) => {
      if (!frame && records.some((record) => !(record.target instanceof Element && record.target.closest(OWN_SURFACES)))) frame = requestAnimationFrame(scan);
    });
    scan();
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'open', 'aria-hidden', 'aria-modal'] });
    window.addEventListener('resize', scan);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', scan); };
  }, [enabled]);

  useEffect(() => {
    if (open || blocked || dragging) { setBubble(false); return; }
    if (!enabled || !overlayReady || !launcherRef.current) return;
    try {
      if (localStorage.getItem(GREETING_KEY)) return;
      // Persist before display so a blocked storage implementation cannot cause repeated greetings.
      localStorage.setItem(GREETING_KEY, '1');
      setBubble(true);
    } catch {
      setBubble(false);
    }
  }, [enabled, overlayReady, open, blocked, dragging, launcherRef]);

  useEffect(() => {
    if (!bubble) return;
    const place = () => {
      const box = launcherRef.current?.getBoundingClientRect();
      if (!box) return;
      const width = Math.min(280, window.innerWidth - 32);
      const top = box.top > 140 ? box.top - 124 : box.bottom + 12;
      setBubblePosition({
        width,
        left: Math.max(16, Math.min(box.right - width, window.innerWidth - width - 16)),
        top: Math.max(16, Math.min(top, window.innerHeight - 128)),
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [bubble, launcherRef, placement?.x, placement?.y]);

  const dismissBubble = () => {
    setBubble(false);
    launcherRef.current?.querySelector('button')?.focus();
  };
  const state: CompanionState = pending ? 'thinking' : feedback !== 'idle' ? feedback : typing ? 'listening' : greeting && welcome ? 'greeting' : 'idle';
  return { state, blocked, bubble: bubble && enabled && !open && !blocked && !dragging, bubblePosition, dismissBubble };
}
