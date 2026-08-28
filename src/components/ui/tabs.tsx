"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  variant?: "pill" | "underline" | "segmented";
  className?: string;
}

export function Tabs({ tabs, value, onChange, variant = "pill", className }: TabsProps) {
  const reduceMotion = useReducedMotion();

  const container = {
    pill: "gap-1",
    underline: "gap-1 border-b border-line",
    segmented: "gap-1 rounded-xl border border-line bg-card-2 p-1",
  }[variant];

  const tabBase = cn(
    "relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap px-3.5 py-2 text-[13px] font-semibold transition-colors",
    variant === "segmented" && "flex-1 rounded-lg",
  );

  return (
    <div role="tablist" className={cn("flex overflow-x-auto no-scrollbar", container, className)}>
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            className={cn(
              tabBase,
              active ? "text-foreground" : "text-muted-fg hover:text-foreground",
            )}
          >
            {active && variant === "segmented" && (
              <motion.span
                layoutId="tabs-segmented-pill"
                className="absolute inset-0 rounded-lg bg-card shadow-soft"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            {active && variant === "underline" && (
              <motion.span
                layoutId="tabs-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            {active && variant === "pill" && (
              <motion.span
                layoutId="tabs-pill"
                className="absolute inset-0 rounded-full bg-card shadow-soft ring-1 ring-line"
                transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && <span className="[&>svg]:h-4 [&>svg]:w-4">{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    active ? "bg-brand-soft text-brand-fg" : "bg-card-2 text-muted-fg",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
