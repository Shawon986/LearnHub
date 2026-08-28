"use client";

import { motion, useReducedMotion } from "motion/react";
import { clamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

/* ---- Linear progress bar -------------------------------------- */

export function ProgressBar({
  value,
  className,
  barClassName,
  color = "brand",
}: {
  value: number;
  className?: string;
  barClassName?: string;
  color?: "brand" | "accent" | "gold" | "success";
}) {
  const pct = clamp(value, 0, 100);
  const colors = {
    brand: "bg-brand",
    accent: "bg-accent",
    gold: "bg-gold",
    success: "bg-success",
  };

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-card-2", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          colors[color],
          barClassName,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ---- Circular progress ring ------------------------------------ */

export function ProgressRing({
  value,
  size = 64,
  strokeWidth = 6,
  color = "brand",
  label,
  className,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: "brand" | "accent" | "gold" | "success";
  label?: string;
  className?: string;
}) {
  const pct = clamp(value, 0, 100);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offsetTarget = circumference - (pct / 100) * circumference;
  const reduceMotion = useReducedMotion();

  const colors = {
    brand: "stroke-brand",
    accent: "stroke-accent",
    gold: "stroke-gold",
    success: "stroke-success",
  };

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-card-2"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          className={colors[color]}
          initial={false}
          animate={{ strokeDashoffset: offsetTarget }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 1, ease: [0.22, 1, 0.36, 1] }
          }
        />
      </svg>
      <span className="absolute text-xs font-bold text-foreground">{Math.round(pct)}%</span>
    </div>
  );
}
