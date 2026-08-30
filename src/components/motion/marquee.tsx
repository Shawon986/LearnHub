"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "motion/react";

/**
 * CSS-driven marquee strip. The content is duplicated once and
 * translated -50% — seamless loop. Static under reducedGate motion.
 */
export function Marquee({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  // Mount-gated: server renders `false` and the first client render
  // matches, then the real preference lands (no hydration mismatch).
  const [reducedGate, setGate] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setGate(Boolean(reduced)));
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  if (reducedGate) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-4">
        {children}
      </div>
    );
  }

  return (
    <div className="mask-fade-x overflow-hidden">
      <div className="flex w-max animate-marquee gap-4">
        <div className="flex shrink-0 gap-4">{children}</div>
        <div className="flex shrink-0 gap-4" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}
