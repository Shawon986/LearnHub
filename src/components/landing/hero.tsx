"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  Flame,
  GraduationCap,
  PlayCircle,
  Radio,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { CountUp } from "@/components/ui/count-up";
import { useLanguage } from "@/components/i18n/language-provider";

const HEADLINE = ["Learn", "from", "Bangladesh's", "best", "teachers"];

interface HeroProps {
  stats: { teachers: number; students: number; courses: number; avgRating: number };
}

export function Hero({ stats }: HeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { t } = useLanguage();

  // Mouse parallax (pointer-fine devices only)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 55, damping: 18 });
  const sy = useSpring(my, { stiffness: 55, damping: 18 });
  const layer2X = useTransform(sx, (v) => v * -10);
  const layer2Y = useTransform(sy, (v) => v * -7);
  const layer3X = useTransform(sx, (v) => v * 22);
  const layer3Y = useTransform(sy, (v) => v * 14);

  function onMouseMove(e: React.MouseEvent) {
    if (reduceMotion || !window.matchMedia("(pointer: fine)").matches) return;
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  }

  const animate = !reduceMotion;

  return (
    <section
      ref={sectionRef}
      onMouseMove={onMouseMove}
      className="bg-brand-surface relative overflow-hidden"
      aria-label="LearnHub hero"
    >
      {/* Ambient orbs */}
      <motion.div
        aria-hidden
        className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-brand/20 blur-3xl"
        animate={animate ? { x: [0, 40, 0], y: [0, 24, 0] } : undefined}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -right-24 top-40 h-80 w-80 rounded-full bg-accent/15 blur-3xl"
        animate={animate ? { x: [0, -30, 0], y: [0, 30, 0] } : undefined}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage: "radial-gradient(circle, var(--line-strong) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 30%, black, transparent)",
        }}
      />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-24">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <motion.div
            initial={animate ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <Badge variant="brand" size="md" className="mb-6">
              <Star className="h-3.5 w-3.5 fill-current" />
              {t("Bangladesh's premium education marketplace")}
            </Badge>
          </motion.div>

          <h1 className="font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl xl:text-6xl">
            {HEADLINE.map((word, i) => (
              <motion.span
                key={i}
                className={
                  word === "Bangladesh's" || word === "teachers"
                    ? "text-gradient inline-block"
                    : "inline-block"
                }
                initial={animate ? { opacity: 0, y: 22, filter: "blur(6px)" } : false}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.6, delay: 0.08 + i * 0.09, ease: [0.22, 1, 0.36, 1] }}
              >
                {t(word)}&nbsp;
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-fg sm:text-lg lg:mx-0"
            initial={animate ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.5 }}
          >
            {t("Live classes, recorded courses and 1-on-1 tutoring from verified experts. Pay in bKash, Nagad or Rocket — and learn at your own pace.")}
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
            initial={animate ? { opacity: 0, y: 16 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.62 }}
          >
            {/* Completely fixed buttons: no scale, no shadow pop, no magnetic
                pull — the ONLY hover feedback is the background color, and
                it switches instantly (no transition delay). */}
            <Button
              href="/courses"
              size="lg"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              className="transition-none"
            >
              {t("Explore courses")}
            </Button>
            <Button
              href="/register"
              size="lg"
              variant="secondary"
              leftIcon={<GraduationCap className="h-4 w-4" />}
              className="transition-none"
            >
              {t("Become a Teacher")}
            </Button>
          </motion.div>

          <motion.div
            className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start"
            initial={animate ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <div className="flex -space-x-2">
              {["Ayesha Rahman", "Tanvir Hasan", "Nusrat Jahan", "Rafiul Islam"].map((n) => (
                <Avatar key={n} name={n} size="sm" className="ring-2 ring-background" />
              ))}
            </div>
            <p className="text-[13px] text-muted-fg">
              {t("Trusted by")}{" "}
              <strong className="text-foreground">
                12,000+ {t("learners")}
              </strong>{" "}
              {t("across Bangladesh")}
            </p>
          </motion.div>
        </div>

        {/* Visual composition — theme-native glass stack */}
        <motion.div
          className="relative mx-auto hidden h-[500px] w-full max-w-md lg:block"
          aria-hidden
          initial={animate ? { opacity: 0, scale: 0.96 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          {/* Gradient halo behind the stack */}
          <motion.div
            className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-brand/25 via-accent/15 to-transparent blur-2xl"
            animate={animate ? { scale: [1, 1.08, 1] } : undefined}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Main course-player card */}
          <motion.div
            style={{ x: layer2X, y: layer2Y }}
            className="glass absolute inset-x-6 top-16 overflow-hidden rounded-2xl shadow-lift"
          >
            <div className="relative flex h-52 items-center justify-center bg-gradient-to-br from-brand via-indigo-600 to-accent">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/25 backdrop-blur-md">
                <PlayCircle className="h-9 w-9 fill-white text-white" />
              </span>
              <span className="absolute left-4 top-4 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                Live class
              </span>
              <span className="absolute bottom-4 right-4 rounded-md bg-black/40 px-2 py-1 text-[11px] font-bold text-white">
                42:18
              </span>
              <div className="absolute inset-x-4 bottom-4 pr-16">
                <div className="h-1.5 w-full rounded-full bg-white/25">
                  <div className="h-full w-2/3 rounded-full bg-white" />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="text-[13px] font-bold text-foreground">React Hooks Deep Dive</p>
                <p className="text-[11px] text-faint-fg">Ayesha Rahman · 90 min</p>
              </div>
              <Badge variant="accent">Live</Badge>
            </div>
          </motion.div>

          {/* Floating: live chip */}
          <motion.div
            style={{ x: layer3X, y: layer3Y }}
            className="glass absolute -left-2 top-4 z-10 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 shadow-lift"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-foreground">Live class starting</p>
              <p className="text-[10px] tabular-nums text-faint-fg">in 12:43</p>
            </div>
            <Radio className="h-4 w-4 text-success" />
          </motion.div>

          {/* Floating: booking card */}
          <motion.div
            style={{ x: layer3X, y: layer3Y }}
            className="glass absolute -right-2 bottom-24 z-10 flex items-center gap-3 rounded-xl p-3.5 shadow-lift"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
              <CalendarCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[11px] font-bold text-foreground">Session confirmed</p>
              <p className="text-[10px] text-faint-fg">Tomorrow, 3:00 PM · 60 min</p>
            </div>
            <BadgeCheck className="h-4 w-4 text-accent" />
          </motion.div>

          {/* Floating: progress card */}
          <motion.div
            style={{ x: layer2X, y: layer2Y }}
            className="glass absolute -bottom-1 left-8 z-10 flex items-center gap-3 rounded-xl px-3.5 py-2.5 shadow-lift"
          >
            <BookOpen className="h-4 w-4 text-brand-fg" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-foreground">Continue learning</p>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1 w-24 overflow-hidden rounded-full bg-card-2">
                  <div className="h-full w-[45%] rounded-full bg-brand" />
                </div>
                <span className="text-[10px] font-bold tabular-nums text-faint-fg">45%</span>
              </div>
            </div>
          </motion.div>

          {/* Floating: streak pill */}
          <motion.div
            style={{ x: layer3X, y: layer3Y }}
            className="glass absolute -right-3 top-40 z-10 flex items-center gap-2 rounded-full px-3.5 py-2 shadow-lift"
          >
            <Flame className="h-4 w-4 fill-gold text-gold" />
            <p className="text-[11px] font-bold text-foreground">6-day streak</p>
          </motion.div>

          {/* Floating: stat pill */}
          <motion.div
            style={{ x: layer2X, y: layer2Y }}
            className="glass absolute bottom-32 -left-6 z-10 flex items-center gap-2 rounded-full px-3.5 py-2 shadow-lift"
          >
            <TrendingUp className="h-4 w-4 text-accent" />
            <p className="text-[11px] font-bold text-foreground">+1,240 learners this week</p>
          </motion.div>

          {/* Sparkle accents */}
          <motion.div
            className="absolute right-8 top-8 text-brand-fg"
            animate={animate ? { rotate: [0, 12, 0], scale: [1, 1.15, 1] } : undefined}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Sparkles className="h-5 w-5" />
          </motion.div>
          <motion.div
            className="absolute bottom-10 right-10 text-gold"
            animate={animate ? { rotate: [0, -12, 0], scale: [1, 1.2, 1] } : undefined}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          >
            <Star className="h-4 w-4 fill-current" />
          </motion.div>
        </motion.div>
      </div>

      {/* Stats band */}
      <div className="relative border-t border-line bg-card/60 backdrop-blur-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
          {[
            { value: stats.teachers, format: (n: number) => `${Math.round(n)}+`, label: "Verified teachers" },
            { value: stats.students, format: (n: number) => `${Math.round(n).toLocaleString()}+`, label: "Active students" },
            { value: stats.courses, format: (n: number) => `${Math.round(n)}+`, label: "Courses & live classes" },
            { value: stats.avgRating, format: (n: number) => n.toFixed(1), label: "Average teacher rating" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-display text-2xl font-extrabold text-foreground sm:text-3xl">
                <CountUp value={s.value} format={s.format} />
              </p>
              <p className="mt-1 text-[12px] font-semibold uppercase tracking-wide text-faint-fg">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
