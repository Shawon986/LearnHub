"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { GraduationCap, Sparkles } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

const WORD = "Learn";

/**
 * Particle assembly — the logo arrives from outside the display while a
 * swarm of tiny particles (knowledge dust) flies in from far off-screen
 * and converges on it, particle by particle. A few particles linger as a
 * slow drifting aura. Deterministic data (no runtime randomness) so the
 * server and client render identically.
 */
interface Particle {
  px: number; // start X offset (outside the display)
  py: number; // start Y offset
  size: number;
  color: string;
  delay: string;
  drift?: { dx: number; dy: number };
}

const PARTICLES: Particle[] = [
  { px: -620, py: -160, size: 3, color: "#4f46e5", delay: "0s", drift: { dx: -8, dy: 5 } },
  { px: -560, py: 60, size: 2, color: "#b45309", delay: "0.06s" },
  { px: -580, py: -60, size: 2, color: "#d97706", delay: "0.1s", drift: { dx: 6, dy: -7 } },
  { px: -520, py: 160, size: 3, color: "#ffffff", delay: "0.14s" },
  { px: -500, py: -220, size: 2, color: "#4f46e5", delay: "0.18s", drift: { dx: 9, dy: 4 } },
  { px: -460, py: -20, size: 2, color: "#b45309", delay: "0.22s" },
  { px: -440, py: 200, size: 2, color: "#d97706", delay: "0.26s" },
  { px: -400, py: -140, size: 3, color: "#4f46e5", delay: "0.3s", drift: { dx: -6, dy: -8 } },
  { px: -360, py: 80, size: 2, color: "#ffffff", delay: "0.34s" },
  { px: -320, py: -240, size: 2, color: "#b45309", delay: "0.38s" },
  { px: -280, py: 20, size: 2, color: "#4f46e5", delay: "0.42s", drift: { dx: 7, dy: 6 } },
  { px: -240, py: 140, size: 3, color: "#d97706", delay: "0.46s" },
  { px: 240, py: -180, size: 2, color: "#4f46e5", delay: "0.5s" },
  { px: 300, py: 40, size: 2, color: "#ffffff", delay: "0.54s", drift: { dx: -5, dy: 7 } },
  { px: 360, py: -80, size: 3, color: "#b45309", delay: "0.58s" },
  { px: 420, py: 120, size: 2, color: "#4f46e5", delay: "0.62s" },
  { px: 480, py: -220, size: 2, color: "#d97706", delay: "0.66s", drift: { dx: 8, dy: -6 } },
  { px: 540, py: 60, size: 2, color: "#4f46e5", delay: "0.7s" },
  { px: 600, py: -140, size: 3, color: "#ffffff", delay: "0.74s" },
  { px: 620, py: 180, size: 2, color: "#b45309", delay: "0.78s", drift: { dx: -7, dy: -5 } },
  { px: -80, py: -300, size: 2, color: "#4f46e5", delay: "0.5s" },
  { px: 80, py: -320, size: 2, color: "#d97706", delay: "0.6s" },
  { px: -140, py: 280, size: 2, color: "#b45309", delay: "0.7s" },
  { px: 140, py: 300, size: 2, color: "#4f46e5", delay: "0.8s" },
];

export function Logo({
  href = "/",
  size = "md",
  withText = true,
  animated = true,
  className,
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  withText?: boolean;
  /** Orbit ring + particle-assembly animation; disabled for reduced motion. */
  animated?: boolean;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const animate = animated && !reduceMotion;
  // The page-loader veil fires this event as it fades out; re-keying
  // restarts the entrance + particle loop so the logo assembles itself
  // right when the page is revealed (and repeats on its own cycle).
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    const handler = () => setReplayKey((k) => k + 1);
    window.addEventListener("learnhub-loader-done", handler);
    return () => window.removeEventListener("learnhub-loader-done", handler);
  }, []);

  const sizes = {
    sm: { box: "h-7 w-7 rounded-lg", ring: "rounded-lg", icon: "h-4 w-4", sparkle: "h-2.5 w-2.5", text: "text-base" },
    md: { box: "h-9 w-9 rounded-xl", ring: "rounded-xl", icon: "h-5 w-5", sparkle: "h-3 w-3", text: "text-lg" },
    lg: { box: "h-11 w-11 rounded-xl", ring: "rounded-xl", icon: "h-6 w-6", sparkle: "h-3.5 w-3.5", text: "text-xl" },
  }[size];

  return (
    <Link
      href={href}
      className={cn("group relative inline-flex items-center gap-2.5", className)}
      aria-label="LearnHub home"
    >
      {/* Knowledge dust: particles fly in from outside the display and
          assemble the logo, particle by particle. Re-keyed when the page
          loader finishes so the assembly starts exactly at reveal time. */}
      <Fragment key={replayKey}>
      {animate && (
        <span
          className="pointer-events-none absolute left-1/2 top-1/2"
          aria-hidden
        >
          {PARTICLES.map((p, i) => (
            <span
              key={i}
              className={cn(
                "absolute rounded-full",
                p.drift ? "logo-particle-drift" : "logo-particle",
              )}
              style={
                {
                  "--px": `${p.px}px`,
                  "--py": `${p.py}px`,
                  "--d": p.delay,
                  ...(p.drift
                    ? { "--dx": `${p.drift.dx}px`, "--dy": `${p.drift.dy}px` }
                    : {}),
                  // Radial-gradient dots are cheaper to paint than box-shadows.
                  width: p.size * 2,
                  height: p.size * 2,
                  left: -p.size,
                  top: -p.size,
                  background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}

      {/* Content — arrives from outside the display with an overshoot. */}
      <span className={cn("relative flex items-center gap-2.5", animate && "logo-enter")}>
        {/* Knowledge orbit: spinning gradient ring + orbiting sparkles + bobbing cap */}
        <span className="relative shrink-0">
          {animate && (
            <>
              <span
                className={cn(
                  "pointer-events-none absolute -inset-[3px] animate-[logo-spin_4s_linear_infinite]",
                  sizes.ring,
                  "[background:conic-gradient(from_0deg,#4f46e5,#b45309,#a5b4fc,#4f46e5)]",
                  "[mask:radial-gradient(farthest-side,transparent_calc(100%_-_2.5px),#000_calc(100%_-_2.5px))]",
                )}
                aria-hidden
              />
              <span className="pointer-events-none absolute inset-0 animate-[logo-spin_4s_linear_infinite]" aria-hidden>
                <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand shadow-glow" />
              </span>
              <span className="pointer-events-none absolute inset-0 animate-[logo-spin-rev_5s_linear_infinite]" aria-hidden>
                <span className="absolute bottom-0 left-1/2 h-1 w-1 -translate-x-1/2 translate-y-1/2 rounded-full bg-accent" />
              </span>
            </>
          )}

          <span
            className={cn(
              "relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand via-indigo-600 to-accent text-white shadow-glow transition-transform duration-300 group-hover:scale-105",
              sizes.box,
              animate && "animate-[logo-bob_3s_ease-in-out_infinite]",
            )}
          >
            <span
              className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%)] bg-[length:200%_100%]"
              aria-hidden
            />
            <GraduationCap
              className={cn("relative transition-transform duration-300 group-hover:scale-110", sizes.icon)}
              aria-hidden
            />
          </span>

          <Sparkles
            className={cn(
              "absolute -right-1 -top-1 text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100",
              sizes.sparkle,
            )}
            aria-hidden
          />
        </span>

        {withText && (
          <span
            className={cn(
              "relative flex items-baseline font-display font-extrabold tracking-tight text-foreground transition-transform duration-300 group-hover:translate-x-0.5",
              sizes.text,
            )}
          >
            {WORD.split("").map((ch, i) => (
              <span
                key={i}
                className={cn(
                  "inline-block",
                  animate && "animate-[logo-wave_2.6s_ease-in-out_infinite]",
                )}
                style={animate ? { animationDelay: `${i * 0.12}s` } : undefined}
              >
                {ch}
              </span>
            ))}
            <span
              className={cn("text-gradient", animate && "animate-gradient-x")}
              style={animate ? { backgroundSize: "200% auto" } : undefined}
            >
              Hub
            </span>
          </span>
        )}
      </span>
      </Fragment>
    </Link>
  );
}
