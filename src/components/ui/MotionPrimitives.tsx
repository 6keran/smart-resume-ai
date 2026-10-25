'use client';

import React, { useRef, useEffect, useState, type ReactNode, type CSSProperties } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  useReducedMotion,
  type Variants,
  type UseInViewOptions,
} from 'framer-motion';
import {
  fadeUp,
  fadeDown,
  fadeLeft,
  fadeRight,
  scaleIn,
  staggerContainer,
  heroStagger,
  staggerItem,
  cardHover,
  drawerLeft,
  overlay,
  tabPanel,
  duration,
  transition as motionTransition,
  getReducedMotionVariants,
} from '@/lib/motion';

// ─── ScrollReveal ───────────────────────────────────────────────────
// Reveals children when they enter the viewport. Uses IntersectionObserver.
interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Which direction to animate from */
  direction?: 'up' | 'down' | 'left' | 'right';
  /** Delay before animation starts (seconds) */
  delay?: number;
  /** IntersectionObserver margin */
  margin?: UseInViewOptions['margin'];
  /** Only animate once? */
  once?: boolean;
  /** Viewport fraction that must be visible (0–1) */
  amount?: number;
}

export function ScrollReveal({
  children,
  className,
  style,
  direction = 'up',
  delay = 0,
  margin = '0px',
  once = true,
  amount = 0.08,
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin, amount });
  const prefersReduced = useReducedMotion();

  const dirVariants: Record<string, Variants> = {
    up: fadeUp,
    down: fadeDown,
    left: fadeLeft,
    right: fadeRight,
  };
  const variants = prefersReduced
    ? getReducedMotionVariants(dirVariants[direction])
    : dirVariants[direction];

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      className={className}
      style={style}
      transition={{ ...motionTransition.default, delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerGroup ───────────────────────────────────────────────────
// Wraps children and staggers their entrance when in view.
interface StaggerGroupProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Use hero-mode (longer stagger delay) */
  hero?: boolean;
  /** Only animate once */
  once?: boolean;
  margin?: UseInViewOptions['margin'];
}

export function StaggerGroup({
  children,
  className,
  style,
  hero = false,
  once = true,
  margin = '0px',
}: StaggerGroupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin, amount: 0.08 });
  const prefersReduced = useReducedMotion();

  const variants = prefersReduced
    ? getReducedMotionVariants(hero ? heroStagger : staggerContainer)
    : (hero ? heroStagger : staggerContainer);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={variants}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// ─── StaggerChild ───────────────────────────────────────────────────
// Individual child inside a StaggerGroup.
interface StaggerChildProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function StaggerChild({ children, className, style }: StaggerChildProps) {
  const prefersReduced = useReducedMotion();
  const variants = prefersReduced
    ? getReducedMotionVariants(staggerItem)
    : staggerItem;

  return (
    <motion.div variants={variants} className={className} style={style}>
      {children}
    </motion.div>
  );
}

// ─── AnimatedCard ───────────────────────────────────────────────────
// Card with hover lift + tap interaction.
interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'article' | 'section';
  onClick?: () => void;
}

export function AnimatedCard({
  children,
  className,
  style,
  onClick,
}: AnimatedCardProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div className={className} style={style} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={cardHover}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// ─── ModalOverlay + ModalContent ────────────────────────────────────
// Animated modal with overlay, scroll locking, and Escape key dismissal.
interface ModalOverlayProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export function ModalOverlay({
  children,
  isOpen,
  onClose,
  className,
}: ModalOverlayProps) {
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          data-no-print="true"
          className={`no-print fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm ${className || ''}`}
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── AnimatedDrawer ─────────────────────────────────────────────────
// Slide-in drawer with backdrop, scroll locking, and Escape key dismissal.
interface AnimatedDrawerProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  containerClassName?: string;
}

export function AnimatedDrawer({
  children,
  isOpen,
  onClose,
  className,
  containerClassName,
}: AnimatedDrawerProps) {
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = prev;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          data-no-print="true"
          className={`no-print fixed inset-0 z-50 flex ${containerClassName || ''}`}
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
        >
          <motion.div
            className={`h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] shadow-2xl ${className || ''}`}
            variants={drawerLeft}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {children}
          </motion.div>
          <motion.div
            className="flex-1 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── AnimatedTabPanel ───────────────────────────────────────────────
// Crossfade panel for tab content.
interface AnimatedTabPanelProps {
  children: ReactNode;
  tabKey: string;
  className?: string;
}

export function AnimatedTabPanel({
  children,
  tabKey,
  className,
}: AnimatedTabPanelProps) {
  const prefersReduced = useReducedMotion();
  const variants = prefersReduced
    ? getReducedMotionVariants(tabPanel)
    : tabPanel;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tabKey}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─── AnimatedCounter ────────────────────────────────────────────────
// Animated number counter that starts with actual value and smoothly animates without layout shift.
interface AnimatedCounterProps {
  value: number;
  className?: string;
  suffix?: string;
  /** Duration in ms */
  duration?: number;
}

export function AnimatedCounter({
  value,
  className,
  suffix = '',
  duration: durationMs = 350,
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.1 });
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (!isInView || prefersReduced) {
      setDisplayValue(value);
      return;
    }

    const startTime = performance.now();
    const startValue = 0;
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + eased * (value - startValue));
      setDisplayValue(current);
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [isInView, value, durationMs, prefersReduced]);

  return (
    <span ref={ref} className={className}>
      {displayValue}{suffix}
    </span>
  );
}

// ─── PageTransition ─────────────────────────────────────────────────
// Wraps page content with an entrance animation.
interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export function PageTransition({ children, className }: PageTransitionProps) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={motionTransition.default}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── TextReveal ─────────────────────────────────────────────────────
// Animates text character by character or word by word.
interface TextRevealProps {
  text: string;
  className?: string;
  /** Split by 'word' or 'char' */
  splitBy?: 'word' | 'char';
  delay?: number;
}

export function TextReveal({
  text,
  className,
  splitBy = 'word',
  delay = 0,
}: TextRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const prefersReduced = useReducedMotion();

  const parts = splitBy === 'word' ? text.split(' ') : text.split('');

  if (prefersReduced) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span ref={ref} className={className} aria-label={text}>
      {parts.map((part, i) => (
        <motion.span
          key={`${part}-${i}`}
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{
            duration: 0.4,
            delay: delay + i * 0.04,
            ease: [0.16, 1, 0.3, 1],
          }}
          style={{ display: 'inline-block', whiteSpace: 'pre' }}
          aria-hidden
        >
          {part}{splitBy === 'word' && i < parts.length - 1 ? ' ' : ''}
        </motion.span>
      ))}
    </span>
  );
}

// ─── ProgressBar ────────────────────────────────────────────────────
// Animated progress bar that fills to the target percentage.
interface ProgressBarProps {
  value: number;
  max?: number;
  className?: string;
  barClassName?: string;
}

export function AnimatedProgressBar({
  value,
  max = 100,
  className,
  barClassName,
}: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const percent = Math.min((value / max) * 100, 100);

  return (
    <div ref={ref} className={`w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden ${className || ''}`}>
      <motion.div
        className={`h-full rounded-full ${barClassName || 'bg-[var(--accent)]'}`}
        initial={{ width: '0%' }}
        animate={isInView ? { width: `${percent}%` } : { width: '0%' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
      />
    </div>
  );
}
