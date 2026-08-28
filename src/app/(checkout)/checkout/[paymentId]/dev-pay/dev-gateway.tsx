"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { completeDevPayment } from "@/lib/actions/payment";

/**
 * Simulated gateway UI. Completion goes through the exact same engine
 * path real webhooks use (completeDevPayment → handlePaymentSuccess).
 */
export function DevGateway({ paymentId }: { paymentId: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function complete(outcome: "success" | "cancel") {
    startTransition(async () => {
      const result = await completeDevPayment(paymentId, outcome);
      if (result.ok) {
        if (outcome === "success") {
          router.push(`/checkout/success?payment=${paymentId}`);
        } else {
          toast({ title: "Payment cancelled", variant: "info" });
          router.push("/dashboard/payments");
        }
        router.refresh();
      } else {
        toast({ title: result.error ?? "Could not complete the sandbox payment.", variant: "error" });
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        size="lg"
        loading={pending}
        leftIcon={<CheckCircle2 className="h-4 w-4" />}
        onClick={() => complete("success")}
      >
        Simulate successful payment
      </Button>
      <Button
        className="w-full"
        variant="outline"
        leftIcon={<XCircle className="h-4 w-4" />}
        onClick={() => complete("cancel")}
      >
        Simulate failed payment
      </Button>
      <p className="text-center text-[11px] leading-relaxed text-faint-fg">
        Development only — this path is hard-blocked in production builds and never
        marks real money. Production payments are verified via signed gateway webhooks.
      </p>
    </div>
  );
}
