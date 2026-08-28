"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, FlaskConical } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { startPayment, cancelPayment } from "@/lib/actions/payment";

interface Method {
  key: string;
  label: string;
  dev: boolean;
}

export function CheckoutClient({
  paymentId,
  amount,
  methods,
  status,
}: {
  paymentId: string;
  amount: number;
  methods: Method[];
  status: string;
}) {
  const [method, setMethod] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function pay() {
    if (!method) return;
    startTransition(async () => {
      const result = await startPayment(paymentId, method);
      if (!result.ok) {
        toast({ title: result.error, variant: "error" });
      } else {
        router.push(result.redirectUrl);
      }
    });
  }

  function cancel() {
    startTransition(async () => {
      const result = await cancelPayment(paymentId);
      if (result.ok) {
        toast({ title: "Order cancelled", variant: "info" });
        router.push("/dashboard");
        router.refresh();
      }
    });
  }

  if (status !== "PENDING") {
    return (
      <p className="rounded-2xl border border-dashed border-line p-6 text-center text-[13px] text-faint-fg">
        This order is no longer open for payment.
      </p>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-display text-[15px] font-bold text-foreground">Choose a payment method</h2>
      <p className="mt-0.5 text-[12px] text-muted-fg">
        You&apos;ll be redirected to the gateway and returned here after payment.
      </p>

      <div className="mt-4 space-y-2" role="radiogroup" aria-label="Payment methods">
        {methods.map((m) => (
          <label
            key={m.key}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors",
              method === m.key
                ? "border-brand bg-brand-soft"
                : "border-line hover:border-line-strong hover:bg-card-2",
            )}
          >
            <input
              type="radio"
              name="method"
              checked={method === m.key}
              onChange={() => setMethod(m.key)}
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span className="flex-1 text-[14px] font-bold text-foreground">{m.label}</span>
            {m.dev && (
              <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-gold">
                <FlaskConical className="h-3 w-3" /> Sandbox
              </span>
            )}
            <ArrowRight className="h-4 w-4 text-faint-fg" />
          </label>
        ))}
      </div>

      {methods.length === 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-line p-4 text-center text-[13px] text-faint-fg">
          No payment methods are configured. Set PAYMENT_PROVIDERS in your environment.
        </p>
      )}

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={cancel}>
          Cancel order
        </Button>
        <Button size="lg" loading={pending} disabled={!method} onClick={pay}>
          Pay {amount.toLocaleString()}৳ →
        </Button>
      </div>
    </Card>
  );
}
