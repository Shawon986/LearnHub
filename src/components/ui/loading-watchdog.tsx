"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const STUCK_AFTER_MS = 12_000;

/**
 * Loading watchdog — the app can NEVER be stuck loading forever, and route
 * changes stay standard: a slim indeterminate bar along the top of the
 * viewport (nothing covers the page). Only the branded PageLoader veil
 * (RouteLoaderVeil) still shows for initial entry / navigating home.
 *
 * If the underlying Suspense boundary is still pending after 12s (stalled
 * server fetch, hung DB, dead network), the bar swaps to an actionable
 * recovery screen instead: Retry (refreshes the pending segment) or Go
 * home. Works on mobile Safari / Chrome Android — plain timers only.
 */
export function LoadingWatchdog() {
  const [stuck, setStuck] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    timer.current = setTimeout(() => setStuck(true), STUCK_AFTER_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
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

  // Standard loading state: a thin indeterminate bar pinned to the top of
  // the viewport. It never blocks interaction and disappears the moment
  // the route resolves.
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
