"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { applyCouponToPayment } from "@/lib/actions/payment";
import { formatBDT } from "@/lib/format";

export function CouponField({ paymentId, applied }: { paymentId: string; applied: boolean }) {
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(
    applied ? "Coupon applied ✓" : null,
  );
  const router = useRouter();
  const { toast } = useToast();

  function apply() {
    if (!code.trim()) return;
    startTransition(async () => {
      const result = await applyCouponToPayment(paymentId, code);
      if (!result.ok) {
        setMessage(result.error ?? "Invalid coupon.");
        return;
      }
      toast({
        title: "Coupon applied!",
        description: `You save ${formatBDT(result.discountAmount ?? 0)}.`,
        variant: "success",
      });
      setMessage(`Applied — you save ${formatBDT(result.discountAmount ?? 0)}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tags className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint-fg" />
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), apply())}
            placeholder="Coupon code"
            aria-label="Coupon code"
            className="h-9 w-full rounded-xl border border-line bg-card pl-9 pr-3 text-[13px] font-mono uppercase placeholder:font-sans placeholder:text-faint-fg focus:border-brand focus:outline-none"
          />
        </div>
        <Button size="sm" variant="secondary" loading={pending} onClick={apply} disabled={applied}>
          Apply
        </Button>
      </div>
      {message && (
        <p className={applied || message.startsWith("Applied") ? "text-[11px] font-bold text-success" : "text-[11px] font-bold text-danger"}>
          {message}
        </p>
      )}
    </div>
  );
}
