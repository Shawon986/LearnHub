"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { resolveDispute } from "@/lib/actions/dispute";

export function ResolveDispute({ disputeId, hasPayment }: { disputeId: string; hasPayment: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState("RESOLVED_REFUNDED");
  const router = useRouter();
  const { toast } = useToast();

  function submit() {
    const resolution = (
      document.getElementById("dispute-resolution") as HTMLTextAreaElement
    )?.value;
    if (!resolution || resolution.trim().length < 5) {
      setError("Explain the resolution (min 5 characters).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await resolveDispute(disputeId, { outcome, resolution });
      if (r.ok) {
        toast({ title: "Dispute resolved", variant: "success" });
        router.refresh();
      } else setError(r.error ?? "Could not resolve the dispute.");
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resolve this dispute</CardTitle>
        <CardDescription>
          Refunding runs the payment engine — commission, wallet and enrollment are reversed atomically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select
          label="Outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          options={[
            ...(hasPayment ? [{ value: "RESOLVED_REFUNDED", label: "Refund the student" }] : []),
            { value: "RESOLVED_RELEASED", label: "Release payment to teacher" },
            { value: "CLOSED", label: "Close without action" },
          ]}
        />
        <Textarea
          id="dispute-resolution"
          label="Resolution (shown to both parties)"
          rows={4}
          placeholder="e.g. The course content didn't match its description — issuing a full refund."
        />
        {error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
            {error}
          </p>
        )}
        <Button className="w-full" loading={pending} onClick={submit}>
          {outcome === "RESOLVED_REFUNDED" ? "Refund & resolve" : "Resolve dispute"}
        </Button>
      </CardContent>
    </Card>
  );
}
