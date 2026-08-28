"use client";

import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight CSS tooltip (hover + focus).
 * The child must accept a ref/aria props — pass a button or span.
 */
export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}) {
  const positions = {
    top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
    bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
    left: "right-full top-1/2 mr-2 -translate-y-1/2",
    right: "left-full top-1/2 ml-2 -translate-y-1/2",
  };

  const bubble = (
    <span
      role="tooltip"
      className={cn(
        "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-semibold text-background opacity-0 shadow-lift transition-opacity duration-150",
        "group-hover:opacity-100 group-focus-within:opacity-100",
        positions[side],
        className,
      )}
    >
      {label}
    </span>
  );

  if (isValidElement<{ className?: string }>(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return (
      <span className="group relative inline-flex">
        {cloneElement(child, { className: cn(child.props.className) })}
        {bubble}
      </span>
    );
  }

  return (
    <span className="group relative inline-flex">
      {children}
      {bubble}
    </span>
  );
}
