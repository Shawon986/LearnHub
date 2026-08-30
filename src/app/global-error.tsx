"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Root error boundary — a crash anywhere in the tree lands here instead of
 * a blank screen. Rendered inside <html>/<body>, so it must carry its own
 * styles. Never shows sensitive details to users.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Safe production logging hook (swap for Sentry/etc. when wired).
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#0b0e14", color: "#eef0f6", fontFamily: "system-ui, sans-serif" }}>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            padding: "24px",
            textAlign: "center",
          }}
        >
          <AlertTriangle size={40} color="#f59e0b" />
          <h1 style={{ margin: 0, fontSize: "22px" }}>Something went wrong</h1>
          <p style={{ margin: 0, opacity: 0.7, maxWidth: 420 }}>
            The page hit an unexpected error. Your data is safe — try again.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              onClick={() => reset()}
              style={{
                background: "#4f46e5",
                color: "#fff",
                border: 0,
                borderRadius: 10,
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Retry
            </button>
            <Link
              href="/"
              style={{
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                borderRadius: 10,
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
