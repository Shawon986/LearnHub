import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 space-y-3",
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl text-left",
        className,
      )}
    >
      {eyebrow && (
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand-fg">{eyebrow}</p>
      )}
      <h2 className="font-display text-2xl font-extrabold leading-tight text-foreground sm:text-3xl md:text-4xl">
        {title}
      </h2>
      {description && <p className="text-[15px] leading-relaxed text-muted-fg">{description}</p>}
    </div>
  );
}
