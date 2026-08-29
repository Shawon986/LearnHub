"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { PageLoader } from "@/components/ui/page-loader";
import { cn } from "@/lib/utils";

const MIN_VISIBLE_MS = 2200;
const FADE_MS = 400;

/**
 * Keeps the branded page loader on screen long enough to be seen — but only
 * for the moments that matter:
 *   • the FIRST entry into the website (initial page load / full refresh)
 *   • navigating HOME (e.g. clicking the logo)
 * All other page-to-page navigations stay instant (the server-side
 * `loading.tsx` boundary still handles genuinely slow renders).
 */
export function RouteLoaderVeil() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const firstRender = useRef(true);
  const [phase, setPhase] = useState<"hidden" | "show" | "leave">("hidden");

  useEffect(() => {
    const isInitial = firstRender.current;
    firstRender.current = false;
    // Show only on the initial load/refresh or when arriving at the home page.
    if (!isInitial && pathname !== "/") return;

    const min = reduceMotion ? 700 : MIN_VISIBLE_MS;
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;
    const raf = requestAnimationFrame(() => {
      setPhase("show");
      leaveTimer = setTimeout(() => setPhase("leave"), min);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [pathname, reduceMotion]);

  useEffect(() => {
    if (phase !== "leave") return;
    // The logo listens for this and (re)starts its entrance animation
    // exactly as the loader reveals the page.
    window.dispatchEvent(new CustomEvent("learnhub-loader-done"));
    const t = setTimeout(() => setPhase("hidden"), FADE_MS);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[150] flex items-center justify-center bg-background transition-opacity",
        phase === "leave" ? "pointer-events-none opacity-0" : "opacity-100",
      )}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden
    >
      <PageLoader />
    </div>
  );
}
