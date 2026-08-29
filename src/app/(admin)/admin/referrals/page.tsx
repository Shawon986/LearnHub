import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getReferralReward, getNumberSetting } from "@/lib/settings";
import { SETTING_KEYS } from "@/lib/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { formatBDT, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Referrals" };

export default async function AdminReferralsPage() {
  const actor = await getCurrentUser();
  if (!actor) redirect("/login?next=/admin/referrals");

  const [referrals, reward, minPurchase, paidOut] = await Promise.all([
    db.referral.findMany({
      include: {
        referrer: { select: { name: true, avatarUrl: true } },
        referee: { select: { name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    getReferralReward(),
    getNumberSetting(SETTING_KEYS.REFERRAL_MIN_PURCHASE, 500),
    db.referral.aggregate({ where: { status: "REWARDED" }, _sum: { rewardAmount: true } }),
  ]);

  const rewarded = referrals.filter((r) => r.status === "REWARDED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Referrals</h1>
        <p className="mt-1 text-sm text-muted-fg">
          {formatBDT(reward)} per successful referral (min purchase {formatBDT(minPurchase)}) ·{" "}
          {formatBDT(paidOut._sum.rewardAmount ?? 0)} paid out across {rewarded.length} rewarded referrals.
        </p>
      </div>

      {referrals.length === 0 ? (
        <EmptyState icon={<UserPlus />} title="No referrals yet" description="Referrals appear as students invite friends." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-150 text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] font-extrabold uppercase tracking-wide text-faint-fg">
                <th className="px-5 py-3">Referrer</th>
                <th className="px-4 py-3">Referee</th>
                <th className="hidden px-4 py-3 md:table-cell">Joined</th>
                <th className="px-4 py-3">Reward</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {referrals.map((r) => (
                <tr key={r.id} className="transition-colors hover:bg-card-2/50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.referrer.name} src={r.referrer.avatarUrl} size="sm" />
                      <span className="text-[13px] font-bold text-foreground">{r.referrer.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.referee.name} src={r.referee.avatarUrl} size="xs" />
                      <span className="text-[13px] font-semibold text-muted-fg">{r.referee.name}</span>
                    </div>
                  </td>
                  <td className="hidden px-4 py-3.5 text-[12px] text-muted-fg md:table-cell">
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 font-display text-[13px] font-extrabold text-foreground">
                    {r.status === "REWARDED" ? formatBDT(r.rewardAmount) : "—"}
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge variant={r.status === "REWARDED" ? "success" : r.status === "PENDING" ? "gold" : "neutral"}>
                      {r.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
