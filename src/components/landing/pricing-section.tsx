import { CircleDollarSign, ShieldCheck, Sparkles } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";

const CARDS = [
  {
    icon: Sparkles,
    tone: "bg-brand-soft text-brand-fg",
    title: "For students",
    badge: "0% fees",
    items: ["Pay only the course price", "bKash · Nagad · Rocket · Stripe", "Refunds via dispute system", "Free certificates included"],
  },
  {
    icon: CircleDollarSign,
    tone: "bg-accent-soft text-accent",
    title: "For teachers",
    badge: "15% commission",
    items: ["Keep 85% of every sale", "Instant wallet credit", "Withdraw to bKash/Nagad/bank", "Commission configurable per course"],
  },
  {
    icon: ShieldCheck,
    tone: "bg-gold-soft text-gold",
    title: "1-on-1 tutoring",
    badge: "Transparent",
    items: ["You set your hourly rate", "Students pay before sessions", "Automatic payouts after completion", "Ratings build your reputation"],
  },
];

export function PricingSection() {
  return (
    <RevealGroup className="grid gap-5 md:grid-cols-3">
      {CARDS.map((card, i) => (
        <RevealItem key={card.title}>
          <div
            className={`relative flex h-full flex-col rounded-2xl border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
              i === 1 ? "border-brand/40" : "border-line"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.tone} [&>svg]:h-5 [&>svg]:w-5`}>
                <card.icon />
              </span>
              <Badge variant={i === 1 ? "brand" : "neutral"}>{card.badge}</Badge>
            </div>
            <h3 className="mt-4 font-display text-lg font-extrabold text-foreground">{card.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {card.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-muted-fg">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
