import type { ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  /** e.g. "+12.4%" — positive if `up` is true */
  delta?: string;
  up?: boolean;
  tone?: "neutral" | "brand" | "accent" | "gold" | "success";
  className?: string;
}

const TONES = {
  neutral: "bg-card-2 text-muted-fg",
  brand: "bg-brand-soft text-brand-fg",
  accent: "bg-accent-soft text-accent",
  gold: "bg-gold-soft text-gold",
  success: "bg-success-soft text-success",
};

export function StatCard({ label, value, icon, delta, up = true, tone = "neutral", className }: StatCardProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-line bg-card p-5 shadow-soft transition-shadow hover:shadow-lift",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5",
            TONES[tone],
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-faint-fg">{label}</p>
        <p className="mt-0.5 font-display text-xl font-bold text-foreground">{value}</p>
      </div>
      {delta && (
        <span
          className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] font-bold",
            up ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
          )}
        >
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </span>
      )}
    </div>
  );
}
