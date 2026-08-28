"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Percent, Gift, Wallet, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { savePlatformSettings } from "@/lib/actions/admin";

interface InitialValues {
  commissionRate: number;
  referralReward: number;
  referralMinPurchase: number;
  withdrawalMin: number;
  withdrawalFeePercent: number;
  platformName: string;
  platformTagline: string;
  contactEmail: string;
}

export function PlatformSettingsForm({ initial }: { initial: InitialValues }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await savePlatformSettings({
        commissionRate: Number(form.get("commissionRate")),
        referralReward: Number(form.get("referralReward")),
        referralMinPurchase: Number(form.get("referralMinPurchase")),
        withdrawalMin: Number(form.get("withdrawalMin")),
        withdrawalFeePercent: Number(form.get("withdrawalFeePercent")),
        platformName: String(form.get("platformName")),
        platformTagline: String(form.get("platformTagline")),
        contactEmail: String(form.get("contactEmail")),
      });
      if (result.ok) {
        toast({ title: "Settings saved", description: "New values apply immediately.", variant: "success" });
        router.refresh();
      } else {
        setError(result.error ?? "Could not save settings.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-brand-fg" /> Commission & money
          </CardTitle>
          <CardDescription>How the marketplace splits every sale.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Platform commission (%)"
            name="commissionRate"
            type="number"
            min={0}
            max={90}
            step="0.1"
            defaultValue={initial.commissionRate}
            hint="Teachers receive 100% minus this rate."
          />
          <Input
            label="Withdrawal fee (%)"
            name="withdrawalFeePercent"
            type="number"
            min={0}
            max={20}
            step="0.1"
            defaultValue={initial.withdrawalFeePercent}
          />
          <Input
            label="Minimum withdrawal (৳)"
            name="withdrawalMin"
            type="number"
            min={0}
            defaultValue={initial.withdrawalMin}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-brand-fg" /> Referrals
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Reward per referred purchase (৳)"
            name="referralReward"
            type="number"
            min={0}
            defaultValue={initial.referralReward}
          />
          <Input
            label="Minimum purchase to trigger reward (৳)"
            name="referralMinPurchase"
            type="number"
            min={0}
            defaultValue={initial.referralMinPurchase}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-fg" /> Branding
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Platform name" name="platformName" defaultValue={initial.platformName} />
          <Input label="Tagline" name="platformTagline" defaultValue={initial.platformTagline} />
          <Input label="Contact email" name="contactEmail" type="email" defaultValue={initial.contactEmail} />
        </CardContent>
      </Card>

      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={pending} leftIcon={<Wallet className="h-4 w-4" />}>
          Save platform settings
        </Button>
      </div>
    </form>
  );
}
