import { BookOpenCheck, Compass, GraduationCap, MessagesSquare, Sparkles } from "lucide-react";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  {
    icon: Compass,
    title: "AI teacher matching",
    description: "Tell us what you want to learn — our AI recommends the perfect teachers for your goals and level.",
  },
  {
    icon: BookOpenCheck,
    title: "Personalized recommendations",
    description: "Course suggestions tuned to your history, interests and progress across the platform.",
  },
  {
    icon: MessagesSquare,
    title: "AI study assistant",
    description: "Stuck on a concept? Ask questions any time and get clear, step-by-step explanations.",
  },
  {
    icon: GraduationCap,
    title: "AI teacher assistant",
    description: "Generate lesson outlines, quizzes, assignments and course descriptions in seconds.",
  },
];

export function AiSection() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand via-violet-700 to-accent p-8 sm:p-12">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />
      <div className="relative">
        <div className="mb-10 flex flex-col items-center gap-3 text-center">
          <Badge variant="neutral" size="md" className="border-white/20 bg-white/15 text-white">
            <Sparkles className="h-3.5 w-3.5" />
            Powered by AI
          </Badge>
          <h2 className="max-w-xl font-display text-2xl font-extrabold text-white sm:text-3xl">
            Smarter learning, built into every step
          </h2>
          <p className="max-w-lg text-sm leading-relaxed text-white/80">
            LearnHub&apos;s AI engine personalizes discovery, answers your questions and helps
            teachers create better content — modular and provider-agnostic under the hood.
          </p>
        </div>

        <RevealGroup className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <RevealItem key={f.title}>
              <div className="flex h-full gap-4 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-md transition-colors duration-300 hover:bg-white/15">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white [&>svg]:h-5 [&>svg]:w-5">
                  <f.icon />
                </span>
                <div>
                  <h3 className="text-[14px] font-bold text-white">{f.title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-white/75">{f.description}</p>
                </div>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </div>
  );
}
