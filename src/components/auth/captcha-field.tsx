"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Challenge {
  id: string;
  a: number;
  b: number;
}

/**
 * Free built-in human check: fetches a one-time arithmetic challenge from
 * /api/captcha and submits it through hidden form fields (captchaId +
 * captchaAnswer), so any plain <form> picks it up via FormData.
 * `refreshKey` changes force a new challenge (e.g. after a failed submit).
 */
export function CaptchaField({ refreshKey = 0 }: { refreshKey?: number }) {
  const [ch, setCh] = useState<Challenge | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/captcha")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setCh(d as Challenge | null);
      })
      .catch(() => {
        if (!cancelled) setCh(null);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div>
      <input type="hidden" name="captchaId" value={ch?.id ?? ""} />
      <Input
        label={ch ? `Human check — what is ${ch.a} + ${ch.b}?` : "Human check — loading…"}
        name="captchaAnswer"
        inputMode="numeric"
        autoComplete="off"
        required
        disabled={!ch}
        placeholder={ch ? "Answer" : "…"}
      />
      <button
        type="button"
        onClick={() => {
          setCh(null);
          fetch("/api/captcha")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => setCh(d as Challenge | null))
            .catch(() => setCh(null));
        }}
        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-muted-fg transition-colors hover:text-foreground"
      >
        <RefreshCw className="h-3 w-3" /> New challenge
      </button>
    </div>
  );
}
