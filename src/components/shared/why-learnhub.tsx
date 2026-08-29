"use client";

import { MonitorPlay, ShieldCheck, Users, Zap } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";

const WHY = [
  {
    icon: ShieldCheck,
    title: "Verified teachers",
    description: "Every teacher passes identity and credential verification before teaching.",
  },
  {
    icon: Zap,
    title: "Instant enrollment",
    description: "Pay with bKash, Nagad or Rocket and start learning in under a minute.",
  },
  {
    icon: MonitorPlay,
    title: "Live + on-demand",
    description: "Scheduled live sessions over Zoom or Meet, plus recorded classes 24/7.",
  },
  {
    icon: Users,
    title: "Real community",
    description: "Messages, reviews, streaks and leaderboards keep you motivated every day.",
  },
];

export function WhyLearnHub() {
  const { t } = useLanguage();
  return (
    <RevealGroup className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {WHY.map((w) => (
        <RevealItem key={w.title}>
          <div className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand-fg [&>svg]:h-5 [&>svg]:w-5">
              <w.icon />
            </span>
            <h3 className="font-display text-[15px] font-bold text-foreground">{t(w.title)}</h3>
            <p className="text-[13px] leading-relaxed text-muted-fg">{t(w.description)}</p>
          </div>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
