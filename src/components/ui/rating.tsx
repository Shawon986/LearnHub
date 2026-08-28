"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { clamp } from "@/lib/utils";
import { cn } from "@/lib/utils";

/* ---- Read-only star rating (supports fractional fill) ---------- */

export function Rating({
  value,
  size = 15,
  className,
  showValue = false,
  count,
}: {
  value: number;
  size?: number;
  className?: string;
  showValue?: boolean;
  count?: number;
}) {
  const pct = clamp(value, 0, 5) / 5;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="relative inline-flex" aria-label={`Rated ${value.toFixed(1)} out of 5`}>
        <span className="flex text-line-strong">
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} style={{ width: size, height: size }} fill="currentColor" strokeWidth={0} />
          ))}
        </span>
        <span
          className="absolute inset-0 flex overflow-hidden text-gold"
          style={{ width: `${pct * 100}%` }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <Star
              key={i}
              style={{ width: size, height: size, minWidth: size }}
              fill="currentColor"
              strokeWidth={0}
            />
          ))}
        </span>
      </span>
      {showValue && <span className="text-xs font-semibold text-muted-fg">{value.toFixed(1)}</span>}
      {count !== undefined && (
        <span className="text-xs text-faint-fg">({count})</span>
      )}
    </span>
  );
}

/* ---- Interactive rating input ----------------------------------- */

export function RatingInput({
  value,
  onChange,
  size = 26,
  disabled = false,
}: {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const active = hover || value;

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rate from 1 to 5 stars">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={cn(
            "transition-transform duration-150",
            !disabled && "hover:scale-110 active:scale-95",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <Star
            style={{ width: size, height: size }}
            className={cn(
              "transition-colors",
              star <= active ? "text-gold" : "text-line-strong",
            )}
            fill={star <= active ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}
