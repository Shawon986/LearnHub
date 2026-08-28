"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { requestWithdrawal } from "@/lib/actions/teacher";
import { applyWithdrawalFee } from "@/lib/earnings";
import { formatBDT } from "@/lib/format";

export function WithdrawalForm({
  availableBalance,
  minimum,
  feePercent,
}: {
  availableBalance: number;
  minimum: number;
  feePercent: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const router = useRouter();
  const { toast } = useToast();

  const fee = applyWithdrawalFee(amount || 0, feePercent);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await requestWithdrawal({
        amount: Number(form.get("amount")),
        method: String(form.get("method")),
        accountDetails: {
          accountNumber: String(form.get("accountNumber")),
          accountHolder: String(form.get("accountHolder")),
          note: String(form.get("note") ?? ""),
        },
      });
      if (result.ok) {
        toast({
          title: "Withdrawal requested",
          description: "Our team will review it within 2–3 working days.",
          variant: "success",
        });
        router.refresh();
      } else {
        setError(result.error ?? "Could not submit the request.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h2 className="font-display text-[15px] font-bold text-foreground">Request withdrawal</h2>
        <p className="mt-0.5 text-[12px] text-muted-fg">
          Minimum {formatBDT(minimum)} · {feePercent > 0 ? `${feePercent}% processing fee` : "no processing fee"} ·
          reviewed by the admin team.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount (৳)"
          name="amount"
          type="number"
          min={minimum}
          max={availableBalance}
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          required
        />
        <Select
          label="Method"
          name="method"
          defaultValue="BKASH"
          options={[
            { value: "BKASH", label: "bKash" },
            { value: "NAGAD", label: "Nagad" },
            { value: "ROCKET", label: "Rocket" },
            { value: "BANK", label: "Bank transfer" },
          ]}
        />
      </div>
      <Input label="Account number" name="accountNumber" placeholder="e.g. 017XXXXXXXX" required />
      <Input label="Account holder name" name="accountHolder" required />

      <div className="flex items-center justify-between rounded-xl border border-line bg-card-2 px-4 py-3 text-[13px]">
        <span className="font-semibold text-muted-fg">You receive</span>
        <span className="font-display font-extrabold text-success">{formatBDT(fee.net)}</span>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full"
        loading={pending}
        disabled={availableBalance < minimum}
        leftIcon={<ArrowUpRight className="h-4 w-4" />}
      >
        {availableBalance < minimum
          ? `Need ${formatBDT(minimum - availableBalance)} more to withdraw`
          : "Request withdrawal"}
      </Button>
    </form>
  );
}
