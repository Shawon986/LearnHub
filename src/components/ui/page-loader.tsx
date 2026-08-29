import {
  BookOpen,
  Brain,
  GraduationCap,
  Lightbulb,
  PenLine,
  Sparkles,
} from "lucide-react";

/**
 * Branded page loader — a "neural knowledge cosmos":
 * a breathing brain at the center with neurons firing around it, three
 * tilted orbital rings carrying learning icons (book, idea, spark, cap,
 * pen), a pulsing glow, a slowly rotating particle backdrop and a
 * shimmering progress bar. Pure CSS transforms — runs on the server
 * render (loading.tsx) with zero client JavaScript. Every animation is
 * disabled automatically under prefers-reduced-motion (globals.css).
 */

interface Orbit {
  ringClass: string;
  ringInset: string;
  spinClass: string;
  icon: { Cmp: typeof BookOpen; color: string; size: string };
}

const ORBITS: Orbit[] = [
  {
    ringClass: "border-brand/25",
    ringInset: "8%",
    spinClass: "pl-orbit-a",
    icon: { Cmp: BookOpen, color: "text-brand", size: "h-6 w-6" },
  },
  {
    ringClass: "border-accent/30",
    ringInset: "22%",
    spinClass: "pl-orbit-b",
    icon: { Cmp: Lightbulb, color: "text-gold", size: "h-5 w-5" },
  },
  {
    ringClass: "border-gold/30",
    ringInset: "34%",
    spinClass: "pl-orbit-c",
    icon: { Cmp: Sparkles, color: "text-accent", size: "h-4 w-4" },
  },
];

const SYNAPSES = 8;

export function PageLoader({ label = "Loading your learning space…" }: { label?: string }) {
  return (
    <div
      className="relative flex min-h-[70vh] w-full flex-col items-center justify-center gap-10 overflow-hidden"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {/* Slowly rotating particle backdrop (two counter-rotating layers). */}
      <div
        className="pl-spin pointer-events-none absolute inset-0 opacity-60 will-change-transform [background-image:radial-gradient(circle,rgb(37_99_235/0.28)_1px,transparent_1px)] [background-size:26px_26px]"
        aria-hidden
      />
      <div
        className="pl-spin-rev pointer-events-none absolute inset-0 opacity-40 will-change-transform [background-image:radial-gradient(circle,rgb(13_148_136/0.25)_1px,transparent_1px)] [background-size:44px_44px]"
        aria-hidden
      />

      {/* Stage: brain + orbits + synapses (perspective gives the rings depth). */}
      <div className="relative h-72 w-72 [perspective:900px] sm:h-80 sm:w-80">
        {/* Soft pulsing glow behind the brain. */}
        <span
          className="pl-pulse absolute inset-0 m-auto h-40 w-40 rounded-full bg-brand/25 blur-3xl"
          aria-hidden
        />

        {/* Orbital rings. */}
        {ORBITS.map((o) => (
          <span key={o.spinClass} className={`absolute inset-0 ${o.spinClass}`} aria-hidden>
            <span
              className={`absolute rounded-full border ${o.ringClass}`}
              style={{ inset: o.ringInset }}
            />
          </span>
        ))}

        {/* Icons riding the rings — separate wrappers with the SAME spin
            animation, so each icon stays pinned to its ring's top edge. */}
        {ORBITS.map((o) => (
          <span key={`${o.spinClass}-icon`} className={`absolute inset-0 ${o.spinClass}`} aria-hidden>
            <span className="absolute left-1/2" style={{ top: o.ringInset }}>
              <o.icon.Cmp className={`-translate-x-1/2 -translate-y-1/2 ${o.icon.color} ${o.icon.size}`} />
            </span>
          </span>
        ))}

        {/* Two extra knowledge symbols on their own flat orbits. */}
        {[
          { Cmp: GraduationCap, color: "text-brand", spin: "pl-orbit-c-fast", size: "h-5 w-5" },
          { Cmp: PenLine, color: "text-accent", spin: "pl-orbit-c-slow", size: "h-5 w-5" },
        ].map(({ Cmp, color, spin, size }) => (
          <span key={spin} className={`absolute inset-0 ${spin}`} aria-hidden>
            <span className="absolute left-1/2" style={{ top: "14%" }}>
              <Cmp className={`-translate-x-1/2 -translate-y-1/2 ${color} ${size}`} />
            </span>
          </span>
        ))}

        {/* The brain — line-art outline, gently breathing. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Brain
            className="pl-breathe h-24 w-24 text-brand drop-shadow-[0_0_18px_rgba(37,99,235,0.45)] sm:h-28 sm:w-28"
            strokeWidth={1.1}
            aria-hidden
          />
        </div>

        {/* Neurons firing in sequence around the brain. */}
        {Array.from({ length: SYNAPSES }).map((_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `rotate(${i * 45}deg) translateY(-62px)` }}
            aria-hidden
          >
            <span
              className="pl-synapse block h-1.5 w-1.5 rounded-full bg-brand"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          </span>
        ))}
      </div>

      {/* Wordmark + indeterminate shimmer bar. */}
      <div className="text-center">
        <p className="font-display text-lg font-extrabold tracking-tight text-foreground">
          Learn<span className="text-gradient">Hub</span>
        </p>
        <p className="mt-1.5 text-[12px] font-semibold text-faint-fg">{label}</p>
        <div className="mx-auto mt-4 h-1 w-56 overflow-hidden rounded-full bg-line">
          <div className="pl-sweep h-full w-1/3 rounded-full bg-gradient-to-r from-brand via-accent to-gold" />
        </div>
      </div>
    </div>
  );
}
