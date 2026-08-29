import { CalendarDays, GraduationCap, Search, Video } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";

const STEPS = [
  {
    icon: Search,
    title: "Discover",
    description:
      "Search verified teachers and courses across every subject — filter by rating, price, language and availability.",
  },
  {
    icon: CalendarDays,
    title: "Book & pay",
    description:
      "Enroll in courses or book 1-on-1 sessions. Pay securely with bKash, Nagad, Rocket or card.",
  },
  {
    icon: Video,
    title: "Learn live or on-demand",
    description:
      "Join live sessions over your favourite meeting app — or watch recorded classes at your own pace.",
  },
  {
    icon: GraduationCap,
    title: "Get certified",
    description:
      "Complete courses, earn certificates with QR verification, and grow your skills with XP, streaks and badges.",
  },
];

export function HowItWorks() {
  return (
    <div className="relative">
      {/* Connecting line (desktop) */}
      <div className="absolute left-0 right-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-line-strong to-transparent lg:block" aria-hidden />
      <RevealGroup className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <RevealItem key={step.title} className="relative">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="relative">
                <span className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-line bg-card shadow-soft [&>svg]:h-7 [&>svg]:w-7 [&>svg]:text-brand">
                  <step.icon />
                </span>
                <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[11px] font-extrabold text-white shadow-soft">
                  {i + 1}
                </span>
              </div>
              <div>
                <h3 className="font-display text-[15px] font-bold text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-fg">{step.description}</p>
              </div>
            </div>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
