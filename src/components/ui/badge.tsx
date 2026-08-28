import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "neutral" | "brand" | "accent" | "gold" | "success" | "danger" | "outline";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  neutral: "bg-card-2 text-muted-fg border border-line",
  brand: "bg-brand-soft text-brand-fg border border-brand/15",
  accent: "bg-accent-soft text-accent border border-accent/15",
  gold: "bg-gold-soft text-gold border border-gold/15",
  success: "bg-success-soft text-success border border-success/15",
  danger: "bg-danger-soft text-danger border border-danger/15",
  outline: "bg-transparent text-muted-fg border border-line-strong",
};

const SIZES: Record<Size, string> = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

interface BadgeProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  icon?: ReactNode;
}

export function Badge({ children, variant = "neutral", size = "sm", className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold leading-none",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
