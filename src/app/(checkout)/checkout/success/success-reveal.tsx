"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function SuccessReveal({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success-soft [&>svg]:mx-auto [&>svg]:h-16 [&>svg]:w-16"
      initial={reduceMotion ? false : { scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
    >
      {children}
    </motion.div>
  );
}
