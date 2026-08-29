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
        // Compact on phones (2-col stat grids get ~150px cells); roomier at sm+.
        "flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 shadow-soft transition-shadow hover:shadow-lift sm:gap-4 sm:p-5",
        className,
      )}
    >
      {icon && (
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4 sm:h-11 sm:w-11 sm:rounded-xl sm:[&>svg]:h-5 sm:[&>svg]:w-5",
            TONES[tone],
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-faint-fg sm:text-xs">{label}</p>
        <p className="mt-0.5 break-words font-display text-lg font-bold leading-tight text-foreground sm:text-xl">{value}</p>
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
