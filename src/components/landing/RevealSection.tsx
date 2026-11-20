import React from 'react';
import { motion, useReducedMotion } from 'motion/react';

interface RevealSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * Framer Motion scroll-triggered reveal wrapper.
 * Uses smooth spring-eased compositor transform/opacity and renders immediately
 * with zero motion when prefers-reduced-motion is enabled.
 */
export function RevealSection({
  children,
  className = '',
  delay = 0,
}: RevealSectionProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.08 }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
