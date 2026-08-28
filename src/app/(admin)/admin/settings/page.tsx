import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getSetting } from "@/lib/settings";
import { PlatformSettingsForm } from "./platform-settings-form";

export const metadata: Metadata = { title: "Platform Settings" };

export default async function AdminSettingsPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/settings");

  const [commissionRate, referralReward, referralMinPurchase, withdrawalMin, withdrawalFee, platformName, platformTagline, contactEmail] =
    await Promise.all([
      getSetting("commission.ratePercent"),
      getSetting("referral.rewardAmountBdt"),
      getSetting("referral.minPurchaseBdt"),
      getSetting("withdrawal.minAmountBdt"),
      getSetting("withdrawal.feePercent"),
      getSetting("platform.name"),
      getSetting("platform.tagline"),
      getSetting("platform.contactEmail"),
    ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Platform Settings</h1>
        <p className="mt-1 text-sm text-muted-fg">
          These values drive commissions, referrals, withdrawals and the public brand. Changes are
          audit-logged.
        </p>
      </div>

      <PlatformSettingsForm
        initial={{
          commissionRate: Number(commissionRate ?? 15),
          referralReward: Number(referralReward ?? 100),
          referralMinPurchase: Number(referralMinPurchase ?? 500),
          withdrawalMin: Number(withdrawalMin ?? 500),
          withdrawalFeePercent: Number(withdrawalFee ?? 0),
          platformName: String(platformName ?? "LearnHub"),
          platformTagline: String(platformTagline ?? "Bangladesh's premium education marketplace"),
          contactEmail: String(contactEmail ?? "support@learnhub.example"),
        }}
      />
    </div>
  );
}
