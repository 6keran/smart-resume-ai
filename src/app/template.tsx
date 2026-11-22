'use client';

import React, { type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * App-wide smooth page transition template.
 * Inspired by Linear, Arc, and Notion:
 * - Subtle fade + translate (opacity 0 -> 1, y: 6 -> 0)
 * - 220ms duration with smooth physical deceleration
 * - Automatically respects user's prefers-reduced-motion preference
 * - Preserves native scroll restoration across navigations
 */
export default function RootTemplate({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <>{children}</>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="w-full flex-1 flex flex-col min-h-0"
    >
      {children}
    </motion.div>
  );
}
