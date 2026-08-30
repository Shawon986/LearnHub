"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";

/**
 * Animates a number from 0 to `value` when scrolled into view.
 * Falls back to the final value instantly under prefers-reduced-motion.
 */
export function CountUp({
  value,
  duration = 1.6,
  format,
  className,
}: {
  value: number;
  duration?: number;
  /** e.g. (n) => `${Math.round(n).toLocaleString()}+` */
  format?: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduceMotion = useReducedMotion();
  // Mount-gated: server renders `false` and the first client render
  // matches, then the real preference lands (no hydration mismatch).
  const [reduceMotionGate, setGate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGate(Boolean(reduceMotion)));
    return () => cancelAnimationFrame(raf);
  }, [reduceMotion]);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduceMotionGate) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(value * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduceMotionGate]);

  // Under reduced motion show the final value immediately.
  const shown = reduceMotionGate ? value : display;
  const text = format ? format(shown) : Math.round(shown).toLocaleString();

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
