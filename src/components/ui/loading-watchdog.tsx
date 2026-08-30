"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { Button } from "@/components/ui/button";

const STUCK_AFTER_MS = 12_000;

/**
 * Loading watchdog — the app can NEVER be stuck on "Loading your learning
 * space…" forever. The branded loader shows normally; if the underlying
 * Suspense boundary is still pending after 12s (stalled server fetch,
 * hung DB, dead network), this component swaps in an actionable recovery
 * screen instead: Retry (refreshes the pending segment) or Go home.
 * Works on mobile Safari / Chrome Android — plain timers only.
 *
 * The loader is pinned to the viewport with the exact geometry of
 * RouteLoaderVeil (fixed inset-0, centered, opaque background). Without
 * this, a refresh showed the in-flow fallback below the header first and
 * the centered veil second — the loader visibly "changed position".
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

  return (
    // Same geometry as RouteLoaderVeil's overlay (fixed, centered, opaque),
    // so the loader stays in one place through the whole refresh cycle.
    <div className="fixed inset-0 z-[140] flex items-center justify-center overflow-hidden bg-background">
      {stuck ? (
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
      ) : (
        <PageLoader />
      )}
    </div>
  );
}
