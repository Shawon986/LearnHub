import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Copy, Gift, UserPlus, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getReferralReward } from "@/lib/settings";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { formatBDT, formatDate } from "@/lib/format";
import { ReferralCopy } from "./referral-copy";
import { ReferralShare } from "./referral-share";

export const metadata: Metadata = { title: "Referrals" };

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/referrals");

  const [profile, referrals, reward] = await Promise.all([
    db.studentProfile.findUnique({ where: { userId: user.id } }),
    db.referral.findMany({
      where: { referrerId: user.id },
      include: { referee: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getReferralReward(),
  ]);

  const rewarded = referrals.filter((r) => r.status === "REWARDED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground">Referrals</h1>
        <p className="mt-1 text-sm text-muted-fg">
          Invite friends — you earn {formatBDT(reward)} for every friend who makes their first purchase.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Friends invited" value={String(referrals.length)} icon={<UserPlus />} tone="brand" />
        <StatCard label="Rewards earned" value={String(rewarded.length)} icon={<Gift />} tone="gold" />
        <StatCard
          label="Referral balance"
          value={formatBDT(profile?.referralBalance ?? 0)}
          icon={<Wallet />}
          tone="accent"
        />
      </div>

      <div className="grid gap-3 rounded-2xl border border-line bg-card p-5 text-[13px] sm:grid-cols-3">
        <div className="flex gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft font-extrabold text-brand-fg">1</span>
          <p className="leading-relaxed text-muted-fg">
            Share your code or invite link with a friend.
          </p>
        </div>
        <div className="flex gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft font-extrabold text-accent">2</span>
          <p className="leading-relaxed text-muted-fg">
            They sign up with your code — the invite stays pending until then.
          </p>
        </div>
        <div className="flex gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-soft font-extrabold text-gold">3</span>
          <p className="leading-relaxed text-muted-fg">
            When they make their first purchase, your reward lands in your referral balance instantly.
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-brand to-accent p-6 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">Your referral code</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="break-all font-mono text-2xl font-extrabold tracking-wider">{user.referralCode}</p>
            <ReferralCopy code={user.referralCode} />
            <ReferralShare code={user.referralCode} />
          </div>
          <p className="mt-2 text-[12px] text-white/80">
            Friends enter this code when they sign up — or just send them the invite link.
          </p>
        </div>
        <CardContent className="space-y-3">
          <h2 className="text-sm font-bold text-foreground">Your invites</h2>
          {referrals.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-5 text-center text-[13px] text-faint-fg">
              No invites yet — share your code to get started.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {referrals.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-fg">
                    <Copy className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-foreground">{r.referee.name}</p>
                    <p className="text-[11px] text-faint-fg">Joined {formatDate(r.createdAt)}</p>
                  </div>
                  <Badge variant={r.status === "REWARDED" ? "success" : r.status === "PENDING" ? "gold" : "neutral"}>
                    {r.status === "REWARDED" ? `+${formatBDT(r.rewardAmount)}` : r.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
