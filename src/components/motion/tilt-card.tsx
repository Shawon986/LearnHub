"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

/**
 * Subtle 3D tilt wrapper for cards. Pointer-fine + motion-allowed only;
 * mobile and reduced-motion users get the plain card.
 */
export function TiltCard({ children, max = 6 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 180, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 180, damping: 20 });

  function onMove(e: React.MouseEvent) {
    if (reduced || !window.matchMedia("(pointer: fine)").matches) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }

  function onLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  if (reduced) return <div className="h-full">{children}</div>;

  return (
    <motion.div
      ref={ref}
      className="h-full [perspective:900px]"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <motion.div style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }} className="h-full">
        {children}
      </motion.div>
    </motion.div>
  );
}
