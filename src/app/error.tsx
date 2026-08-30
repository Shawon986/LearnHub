"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Route error boundary: a render/data error in any page shows this instead
 * of crashing the whole app. Retry re-renders the failed segment; Go Home
 * is the escape hatch. Errors are logged, never shown to the user.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft text-gold">
        <AlertTriangle className="h-7 w-7" />
      </span>
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Something went wrong</h1>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-fg">
          {error.message && error.message.includes("Network")
            ? "Connection problem. Check your network and retry."
            : error.message && error.message.includes("session")
              ? "Your session has expired. Sign in again."
              : "Something went wrong. Retry, or go back to the homepage."}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={() => reset()} leftIcon={<RotateCcw className="h-4 w-4" />}>
          Retry
        </Button>
        <Button href="/" variant="secondary">
          Go home
        </Button>
      </div>
    </div>
  );
}
