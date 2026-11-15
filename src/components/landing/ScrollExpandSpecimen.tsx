'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ScrollExpandSpecimenProps {
  children: React.ReactNode;
  id?: string;
}

export default function ScrollExpandSpecimen({ children, id }: ScrollExpandSpecimenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'center center'],
  });

  // Smooth kinetic expansion transformations without any scroll hijacking
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1.0]);
  const opacity = useTransform(scrollYProgress, [0, 0.4], [0.85, 1.0]);
  const y = useTransform(scrollYProgress, [0, 1], [30, 0]);

  if (prefersReducedMotion) {
    return (
      <div id={id} className="w-full">
        {children}
      </div>
    );
  }

  return (
    <div ref={containerRef} id={id} className="w-full relative">
      <motion.div
        style={{
          scale,
          opacity,
          y,
        }}
        className="w-full origin-top transition-shadow duration-300"
      >
        {children}
      </motion.div>
    </div>
  );
}

