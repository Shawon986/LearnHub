"use client";

import Link from "next/link";
import { ArrowUpRight, Mic, Mountain, Sparkles, Waves, Zap, type LucideIcon } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SignatureCourse {
  name: string;
  exam: string;
  tagline: string;
  meta: string;
  icon: LucideIcon;
  /** Tailwind gradient stops for the card's glow/icon chip. */
  gradient: string;
  glow: string;
  chipText: string;
}

const COURSES: SignatureCourse[] = [
  {
    name: "ELLT Ascend",
    exam: "ELLT",
    tagline: "Climb every band of Oxford's English Level Test — reading, listening, writing, speaking.",
    meta: "8 weeks · B1 → C1",
    icon: Mountain,
    gradient: "from-blue-500 to-indigo-500",
    glow: "bg-blue-500/25",
    chipText: "text-blue-300",
  },
  {
    name: "DuoScore Sprint",
    exam: "Duolingo English Test",
    tagline: "A 30-day adaptive sprint to 120+ — train exactly the question types Duolingo throws at you.",
    meta: "30 days · 120+ target",
    icon: Zap,
    gradient: "from-lime-400 to-emerald-500",
    glow: "bg-lime-400/20",
    chipText: "text-lime-300",
  },
  {
    name: "PTE FlowState",
    exam: "PTE",
    tagline: "Machine-scored fluency drills for Pearson PTE — speak and write at AI-grader speed.",
    meta: "10 weeks · 79+ target",
    icon: Waves,
    gradient: "from-violet-500 to-fuchsia-500",
    glow: "bg-violet-500/25",
    chipText: "text-violet-300",
  },
  {
    name: "SpeakBand 9",
    exam: "IELTS Speaking",
    tagline: "A clinic for IELTS Speaking — from 6.0 to 9.0 with live mocks for Parts 1, 2 and 3.",
    meta: "6 weeks · Band 9 clinic",
    icon: Mic,
    gradient: "from-amber-400 to-orange-500",
    glow: "bg-amber-400/20",
    chipText: "text-amber-300",
  },
  {
    name: "Fluent Street",
    exam: "Spoken English",
    tagline: "Everyday English that flows — conversation-first practice for the street, campus and office.",
    meta: "8 weeks · conversation-first",
    icon: Sparkles,
    gradient: "from-teal-400 to-cyan-500",
    glow: "bg-teal-400/20",
    chipText: "text-teal-300",
  },
];

/** Deterministic star field — identical on server and client (SSR safe). */
const STARS = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 53 + 7) % 100}%`,
  size: 2 + ((i * 13) % 3),
  delay: `${((i * 29) % 10) / 3}s`,
  duration: `${2.5 + ((i * 17) % 5) * 0.7}s`,
}));

/**
 * The landing page's main attraction — the signature programs stage.
 * A dark cosmic set: rotating aurora conic, drifting gradient orbs, a
 * twinkling star field, a slow dashed orbit ring and floating icon chips —
 * all pure CSS transforms gated behind prefers-reduced-motion.
 */
export function SpecialCourses() {
  return (
    <section
      id="signature"
      className="relative scroll-mt-24 overflow-hidden bg-[#070c1b] text-white"
      aria-label="Signature programs"
    >
      {/* ---------- Animated stage (all pointer-events-none) ---------- */}
      {/* Deep base glow so the stage never looks flat. */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 0%, rgba(59,91,219,0.28), transparent 60%), radial-gradient(ellipse 70% 60% at 85% 90%, rgba(14,165,233,0.16), transparent 65%), radial-gradient(ellipse 60% 55% at 12% 80%, rgba(168,85,247,0.14), transparent 60%)",
        }}
      />

      {/* Rotating aurora conic sweep — the big slow mover. */}
      <div
        className="sc-aurora pointer-events-none absolute left-1/2 top-1/2 h-[140vmin] w-[140vmin] -translate-x-1/2 -translate-y-1/2 opacity-40 blur-2xl"
        aria-hidden
        style={{
          background:
            "conic-gradient(from 0deg, rgba(37,99,235,0.5), rgba(16,185,129,0.28), rgba(217,119,6,0.3), rgba(124,58,237,0.35), rgba(37,99,235,0.5))",
        }}
      />

      {/* Drifting gradient orbs. */}
      <div className="sc-orb pointer-events-none absolute -left-24 top-10 h-80 w-80 rounded-full bg-brand/40 blur-3xl" aria-hidden />
      <div className="sc-orb-b pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-amber-400/25 blur-3xl" aria-hidden />
      <div className="sc-orb-c pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-teal-400/20 blur-3xl" aria-hidden />

      {/* Twinkling star field. */}
      {STARS.map((s, i) => (
        <span
          key={i}
          className="sc-twinkle pointer-events-none absolute rounded-full bg-white/80"
          aria-hidden
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            "--d": s.duration,
            animationDelay: s.delay,
          } as React.CSSProperties}
        />
      ))}

      {/* Slow dashed orbit ring behind the cards. */}
      <div
        className="sc-ring-spin pointer-events-none absolute left-1/2 top-1/2 h-[110vmin] w-[110vmin] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/10"
        aria-hidden
      />

      {/* Soft horizontal beam sweeping the top edge. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />

      {/* ---------- Content ---------- */}
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:py-28">
        <RevealGroup className="mx-auto max-w-2xl text-center">
          <RevealItem>
            <Badge variant="outline" className="border-white/20 bg-white/5 text-white">
              <Sparkles className="mr-1 h-3 w-3" /> Signature programs
            </Badge>
          </RevealItem>
          <RevealItem>
            <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
              Master the tests the world{" "}
              <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                actually judges you by
              </span>
            </h2>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 text-[15px] leading-relaxed text-white/70">
              Five flagship programs, engineered by verified teachers — exam-ready pipelines
              with live mocks, AI-graded practice and 1-on-1 coaching.
            </p>
          </RevealItem>
        </RevealGroup>

        <RevealGroup className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {COURSES.map((c, i) => (
            <RevealItem key={c.name} className="h-full">
              <Link
                href="/courses"
                className={cn(
                  "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10",
                  "bg-white/[0.04] p-5 backdrop-blur-md transition-all duration-300",
                  "hover:-translate-y-1.5 hover:border-white/25 hover:bg-white/[0.08] hover:shadow-[0_18px_50px_-12px_rgba(37,99,235,0.45)]",
                )}
              >
                {/* Colored halo behind the card. */}
                <span
                  className={cn(
                    "pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full opacity-60 blur-3xl transition-opacity duration-300 group-hover:opacity-100",
                    c.glow,
                  )}
                  aria-hidden
                />
                {/* Sweeping shine on hover. */}
                <span
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden
                >
                  <span className="sc-shine absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                </span>

                {/* Floating icon chip. */}
                <span className="sc-card-float relative inline-flex" style={{ "--d": `${5.5 + i * 0.6}s` } as React.CSSProperties}>
                  <span
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg",
                      c.gradient,
                    )}
                  >
                    <c.icon className="h-6 w-6" aria-hidden />
                  </span>
                </span>

                <p className={cn("relative mt-4 text-[10px] font-extrabold uppercase tracking-[0.18em]", c.chipText)}>
                  {c.exam}
                </p>
                <h3 className="relative mt-1 font-display text-lg font-extrabold text-white">
                  {c.name}
                </h3>
                <p className="relative mt-2 flex-1 text-[12px] leading-relaxed text-white/65">
                  {c.tagline}
                </p>
                <p className="relative mt-3 text-[11px] font-bold text-white/80">{c.meta}</p>

                <span className="relative mt-4 inline-flex items-center gap-1 text-[12px] font-bold text-white/90 transition-colors group-hover:text-white">
                  Explore program
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
                </span>
              </Link>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
