"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * Route-transition template: every navigation inside the marketing
 * group fades + slides in. Instant under prefers-reduced-motion.
 */
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
