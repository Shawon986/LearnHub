"use client";

import { useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/**
 * Magnetic CTA: the button leans toward the cursor within a radius,
 * then springs back. Pointer-fine devices + motion-allowed only.
 */
export function MagneticButton({ children, strength = 0.22 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });
  const [hovering, setHovering] = useState(false);

  function onMove(e: React.MouseEvent) {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
  }

  function onLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      ref={ref}
      className="inline-block"
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        onLeave();
      }}
      whileHover={reduced ? undefined : { scale: 1.03 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      data-magnetic={hovering}
    >
      {children}
    </motion.div>
  );
}
