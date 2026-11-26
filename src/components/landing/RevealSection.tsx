import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface RevealSectionProps {
  id?: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Framer Motion scroll-triggered reveal wrapper.
 * Never hides content at opacity 0 (prevents blank gaps on fast scroll, anchor jumps,
 * or full-page inspection) while still delivering smooth compositor slide-up motion.
 */
export function RevealSection({
  id,
  children,
  className = '',
  delay = 0,
}: RevealSectionProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div id={id} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      id={id}
      initial={{ opacity: 0.94, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.04 }}
      transition={{
        duration: 0.48,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
