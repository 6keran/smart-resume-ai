'use client';

import type { Variants, Transition } from 'framer-motion';

// ─── Easing presets ───────────────────────────────────────────────────
export const ease = {
  /** Smooth deceleration – hero entrances, modals, cards */
  out: [0.16, 1, 0.3, 1] as const,
  /** Snappy – micro-interactions, hover feedback */
  outQuint: [0.22, 1, 0.36, 1] as const,
  /** Balanced in-out – ambient breathing */
  inOut: [0.4, 0, 0.2, 1] as const,
  /** Spring-like – cards, badges */
  spring: { type: 'spring' as const, stiffness: 260, damping: 24 },
  /** Gentle spring – page-level reveals */
  gentleSpring: { type: 'spring' as const, stiffness: 120, damping: 20 },
};

// ─── Duration tokens (seconds) ──────────────────────────────────────
export const duration = {
  micro: 0.16,      // 160ms: hover, tap, icon shifts
  fast: 0.22,       // 220ms: dropdowns, tabs, tooltips
  normal: 0.32,     // 320ms: cards, panels, popovers
  panel: 0.28,      // 280ms: small panels, tabs
  dialog: 0.32,     // 320ms: dialogs, modals
  drawer: 0.30,     // 300ms: side drawers, slide-overs
  slow: 0.45,       // 450ms: larger container transitions
  hero: 0.55,       // 550ms: hero entrances
  stagger: 0.06,    // 60ms: between list/grid items
  heroStagger: 0.07,// 70ms: between hero elements
};

// ─── Shared transition presets ──────────────────────────────────────
export const transition = {
  default: { duration: duration.normal, ease: ease.out } as Transition,
  micro: { duration: duration.micro, ease: ease.outQuint } as Transition,
  fast: { duration: duration.fast, ease: ease.outQuint } as Transition,
  slow: { duration: duration.slow, ease: ease.out } as Transition,
  hero: { duration: duration.hero, ease: ease.out } as Transition,
  spring: ease.spring as Transition,
  gentleSpring: ease.gentleSpring as Transition,
};

// ─── Variant factories ──────────────────────────────────────────────

/** Fade + slide up – general-purpose entrance */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transition.default,
  },
};

/** Fade + slide down */
export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transition.default,
  },
};

/** Fade in from left */
export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: -18 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transition.default,
  },
};

/** Fade in from right */
export const fadeRight: Variants = {
  hidden: { opacity: 0, x: 18 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transition.default,
  },
};

/** Scale + fade – modals, dialogs, popovers */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.dialog, ease: ease.out },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: duration.fast, ease: ease.out },
  },
};

/** Stagger container – wraps children for sequential reveals */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: duration.stagger,
      delayChildren: 0.05,
    },
  },
};

/** Hero stagger container */
export const heroStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: duration.heroStagger,
      delayChildren: 0.08,
    },
  },
};

/** Feature items stagger container */
export const featureListStagger: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.16,
    },
  },
};

/** Individual stagger child variant */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transition.default,
  },
};

/** Feature item subtle slide & fade */
export const featureCardItem: Variants = {
  hidden: { opacity: 0, y: 10, x: -4 },
  visible: {
    opacity: 1,
    y: 0,
    x: 0,
    transition: { duration: 0.38, ease: ease.out },
  },
};

/** Card hover interaction */
export const cardHover: Variants = {
  rest: { scale: 1, y: 0 },
  hover: {
    scale: 1.012,
    y: -2.5,
    transition: { duration: duration.micro, ease: ease.outQuint },
  },
  tap: {
    scale: 0.985,
    transition: { duration: 0.08 },
  },
};

/** Button press micro-interaction */
export const buttonPress: Variants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.015,
    transition: { duration: 0.15, ease: ease.outQuint },
  },
  tap: {
    scale: 0.975,
    transition: { duration: 0.08 },
  },
};

/** Slide-in drawer from left */
export const drawerLeft: Variants = {
  hidden: { x: '-100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: duration.drawer, ease: ease.out },
  },
  exit: {
    x: '-100%',
    opacity: 0,
    transition: { duration: 0.2, ease: ease.out },
  },
};

/** Slide-in drawer from right (e.g., chat, side inspectors) */
export const drawerRight: Variants = {
  hidden: { x: '100%', opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: duration.drawer, ease: ease.out },
  },
  exit: {
    x: '100%',
    opacity: 0,
    transition: { duration: 0.2, ease: ease.out },
  },
};

/** Overlay backdrop */
export const overlay: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Tab panel crossfade */
export const tabPanel: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: ease.out },
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12 },
  },
};

/** Ambient breathing halo behind showcase */
export const ambientBreathing: Variants = {
  animate: {
    opacity: [0.65, 0.88, 0.65],
    scale: [1, 1.025, 1],
    transition: {
      duration: 8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/** Radial gauge circular progress drawing */
export const gaugeDraw: Variants = {
  hidden: { strokeDashoffset: 201 },
  visible: {
    strokeDashoffset: 16,
    transition: { duration: 0.85, delay: 0.45, ease: ease.out },
  },
};

/** Counter / number ticker spring */
export const numberSpring = {
  type: 'spring' as const,
  stiffness: 100,
  damping: 15,
  mass: 1,
};

/** Tooltip */
export const tooltip: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.12, ease: ease.outQuint },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.08 },
  },
};

// ─── Reduced-motion helper ──────────────────────────────────────────
/** Returns identity variants when user prefers reduced motion */
export function getReducedMotionVariants(variants: Variants): Variants {
  const reduced: Variants = {};
  for (const key of Object.keys(variants)) {
    const isHiddenOrExit = key === 'hidden' || key === 'exit';
    reduced[key] = {
      opacity: isHiddenOrExit ? 0 : 1,
      y: 0,
      x: 0,
      scale: 1,
      strokeDashoffset: 16,
      transition: { duration: 0 },
    };
  }
  return reduced;
}
