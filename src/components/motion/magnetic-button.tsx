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
  // Critically damped springs — no bounce/jitter while following the cursor.
  const sx = useSpring(x, { stiffness: 300, damping: 30, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 300, damping: 30, mass: 0.6 });
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
      className="inline-block will-change-transform"
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false);
        onLeave();
      }}
      data-magnetic={hovering}
    >
      {children}
    </motion.div>
  );
}
