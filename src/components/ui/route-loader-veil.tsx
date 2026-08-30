"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
 *
 * Rendered through a portal onto <body> so no ancestor (transform, filter,
 * backdrop-blur…) can trap `position: fixed` and make the loader scroll or
 * shift with the page — it stays glued to the viewport.
 */
export function RouteLoaderVeil() {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const firstRender = useRef(true);
  const [phase, setPhase] = useState<"hidden" | "show" | "shown" | "leave">("hidden");

  useEffect(() => {
    firstRender.current = false;
    // Show on EVERY navigation — refresh, login, logout, page changes —
    // pinned to the viewport via the portal so it can never shift.
    const min = reduceMotion ? 700 : MIN_VISIBLE_MS;
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;
    const raf = requestAnimationFrame(() => {
      // Two-phase: paint at opacity-0 first, then fade IN smoothly
      // (avoids the harsh instant-cover pop on refresh).
      setPhase("show");
      requestAnimationFrame(() => {
        setPhase("shown");
        leaveTimer = setTimeout(() => setPhase("leave"), min);
      });
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

  const overlay = (
    <div
      className={cn(
        // inset-0 alone pins the veil to the viewport (stable — dvh units
        // jump when the mobile URL bar collapses, which made the loader
        // "move" on refresh). Clipped and centered.
        "fixed inset-0 z-[150] flex items-center justify-center overflow-hidden bg-background transition-opacity",
        phase === "shown" ? "opacity-100" : "opacity-0",
        phase === "leave" && "pointer-events-none",
      )}
      style={{ transitionDuration: phase === "leave" ? `${FADE_MS}ms` : "250ms" }}
      aria-hidden
    >
      <PageLoader />
    </div>
  );

  return createPortal(overlay, document.body);
}
