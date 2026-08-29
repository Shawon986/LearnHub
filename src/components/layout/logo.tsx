"use client";

import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export function Logo({
  href = "/",
  size = "md",
  withText = true,
  typewriter = false,
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  /** Type the wordmark on mount (used in the site header). */
  typewriter?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  const sizes = {
    sm: { box: "h-7 w-7 rounded-lg", icon: "h-4 w-4", sparkle: "h-2.5 w-2.5", text: "text-base" },
    md: { box: "h-9 w-9 rounded-xl", icon: "h-5 w-5", sparkle: "h-3 w-3", text: "text-lg" },
    lg: { box: "h-11 w-11 rounded-xl", icon: "h-6 w-6", sparkle: "h-3.5 w-3.5", text: "text-xl" },
  }[size];

  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
      aria-label="LearnHub home"
    >
      <span
        className={cn(
          // Gradient block with an animated sheen sweep + glow; tilts on hover.
          "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand via-violet-600 to-accent text-white shadow-glow transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105",
          sizes.box,
        )}
      >
        {/* Sweeping light */}
        <span
          className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%)] bg-[length:200%_100%]"
          aria-hidden
        />
        {/* Soft breathing halo */}
        <span
          className="pointer-events-none absolute inset-0 animate-pulse-soft bg-white/10"
          aria-hidden
        />
        <GraduationCap
          className={cn("relative transition-transform duration-300 group-hover:scale-110", sizes.icon)}
          aria-hidden
        />
        <Sparkles
          className={cn(
            "absolute -right-0.5 -top-0.5 text-white/90 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
            sizes.sparkle,
          )}
          aria-hidden
        />
      </span>
      {withText && (
        <span
          className={cn(
            "flex items-baseline font-display font-extrabold tracking-tight text-foreground transition-transform duration-300 group-hover:translate-x-0.5",
            sizes.text,
          )}
        >
          {typewriter && !reduceMotion ? (
            // Fixed-width box reserves the wordmark's full space so the
            // typing loop never reflows the nav or action buttons.
            <span className="inline-block w-[8ch] whitespace-nowrap">
              <span className="inline-block w-0 overflow-hidden whitespace-nowrap animate-[logo-typing_5s_infinite]">
                Learn<span className="text-gradient">Hub</span>
                <span
                  className="ml-0.5 inline-block h-[0.9em] w-[3px] animate-[logo-caret_0.9s_step-end_infinite] rounded-full bg-brand"
                  aria-hidden
                />
              </span>
            </span>
          ) : (
            <>
              Learn<span className="text-gradient">Hub</span>
            </>
          )}
        </span>
      )}
    </Link>
  );
}
