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
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView || reduceMotion) return;
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
  }, [inView, value, duration, reduceMotion]);

  // Under reduced motion show the final value immediately.
  const shown = reduceMotion ? value : display;
  const text = format ? format(shown) : Math.round(shown).toLocaleString();

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
