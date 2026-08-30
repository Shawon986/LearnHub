"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STUCK_AFTER_MS = 12_000;
/** Instant navigations show NOTHING — the bar appears only if a route is
 *  genuinely slow. */
const BAR_AFTER_MS = 600;

/**
 * Loading watchdog — the app can NEVER be stuck loading forever, and route
 * changes stay standard: a slim indeterminate bar along the top of the
 * viewport, shown only when a navigation is actually slow (instant page
 * changes render nothing). The branded PageLoader veil (RouteLoaderVeil)
 * only shows for initial entry / hard refresh.
 *
 * If the underlying Suspense boundary is still pending after 12s (stalled
 * server fetch, hung DB, dead network), the bar swaps to an actionable
 * recovery screen instead: Retry (refreshes the pending segment) or Go
 * home. Works on mobile Safari / Chrome Android — plain timers only.
 */
export function LoadingWatchdog() {
  const [stuck, setStuck] = useState(false);
  const [barVisible, setBarVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const router = useRouter();

  useEffect(() => {
    timers.current = [
      setTimeout(() => setBarVisible(true), BAR_AFTER_MS),
      setTimeout(() => setStuck(true), STUCK_AFTER_MS),
    ];
    return () => {
      for (const t of timers.current) clearTimeout(t);
    };
  }, []);

  if (stuck) {
    return (
      <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-background">
        <div className="flex min-h-[55vh] w-full flex-col items-center justify-center gap-4 px-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <div>
            <h1 className="font-display text-lg font-extrabold text-foreground">Still loading…</h1>
            <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-fg">
              This is taking longer than expected. Check your connection and try again.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => {
                setStuck(false);
                router.refresh();
              }}
              leftIcon={<RotateCcw className="h-4 w-4" />}
            >
              Retry
            </Button>
            <Button href="/" variant="secondary">
              Go home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Instant navigations render nothing at all. Only when the route is
  // genuinely slow does the thin indeterminate bar appear (and only when
  // it is truly stuck does the recovery screen take over).
  if (!barVisible) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[140] h-0.5 overflow-hidden bg-transparent"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="pl-sweep h-full w-1/3 rounded-full bg-gradient-to-r from-brand via-accent to-gold" />
    </div>
  );
}
