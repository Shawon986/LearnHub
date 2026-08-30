"use client";

import { useEffect, useState } from "react";

import { motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/**
 * Scroll-triggered reveal. Respects prefers-reduced-motion.
 * Use RevealGroup + RevealItem for staggered sequences.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  once = true,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  once?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  // Mount-gated: server renders `false` and the first client render
  // matches, then the real preference lands (no hydration mismatch).
  const [reduceMotionGate, setGate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGate(Boolean(reduceMotion)));
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);

  return (
    <motion.div
      className={className}
      initial={reduceMotionGate ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

const groupVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export function RevealGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  // Mount-gated: server renders `false` and the first client render
  // matches, then the real preference lands (no hydration mismatch).
  const [reduceMotionGate, setGate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGate(Boolean(reduceMotion)));
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);
  if (reduceMotionGate) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={groupVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduceMotion = useReducedMotion();
  // Mount-gated: server renders `false` and the first client render
  // matches, then the real preference lands (no hydration mismatch).
  const [reduceMotionGate, setGate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGate(Boolean(reduceMotion)));
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);
  if (reduceMotionGate) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}
