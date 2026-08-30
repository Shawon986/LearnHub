"use client";

import { useEffect, useState } from "react";

import { motion, useReducedMotion } from "motion/react";

/**
 * Route-transition template: every navigation inside the marketing
 * group fades + slides in. Instant under prefers-reducedGate-motion.
 */
export default function MarketingTemplate({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  // Mount-gated: server renders `false` and the first client render
  // matches, then the real preference lands (no hydration mismatch).
  const [reducedGate, setGate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGate(Boolean(reduced)));
    return () => cancelAnimationFrame(raf);
  }, [reduced]);
  if (reducedGate) return <>{children}</>;

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
