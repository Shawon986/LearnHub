import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-card/60 text-center",
        compact ? "gap-2 px-6 py-8" : "gap-3 px-6 py-16",
        className,
      )}
    >
      {icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand-fg [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </div>
      )}
      <h3 className="font-display text-[15px] font-bold text-foreground">{title}</h3>
      {description && <p className="max-w-sm text-[13px] text-muted-fg">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
