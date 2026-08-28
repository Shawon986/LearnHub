"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const RANGES = [
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
];

/** One-row date-range filter (dataviz interaction spec). */
export function RangePicker({ range, basePath }: { range: string; basePath: string }) {
  return (
    <div className="flex gap-1 rounded-xl border border-line bg-card p-1" role="tablist" aria-label="Date range">
      {RANGES.map((r) => (
        <Link
          key={r.value}
          href={`${basePath}?range=${r.value}`}
          role="tab"
          aria-selected={range === r.value}
          className={cn(
            "rounded-lg px-3 py-1.5 text-[12px] font-bold transition-colors",
            range === r.value ? "bg-brand text-white" : "text-muted-fg hover:text-foreground",
          )}
        >
          {r.label}
        </Link>
      ))}
    </div>
  );
}
