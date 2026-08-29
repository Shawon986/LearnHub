import { Quote } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { RevealGroup, RevealItem } from "@/components/ui/reveal";

export interface TestimonialData {
  id: string;
  authorName: string;
  rating: number;
  content: string;
  context: string; // e.g. "on React & Next.js Masterclass"
}

export function TestimonialsSection({ testimonials }: { testimonials: TestimonialData[] }) {
  return (
    /* Mobile: swipeable snap carousel · md+: classic 3-column grid. */
    <RevealGroup className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
      {testimonials.map((t) => (
        <RevealItem key={t.id} className="w-[85%] shrink-0 snap-center sm:w-[60%] md:w-auto md:shrink">
          <figure className="relative flex h-full flex-col rounded-2xl border border-line bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
            <Quote className="h-6 w-6 text-brand-soft" aria-hidden />
            <blockquote className="mt-3 flex-1 text-[13px] leading-relaxed text-muted-fg">
              “{t.content}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
              <Avatar name={t.authorName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-bold text-foreground">{t.authorName}</p>
                <div className="flex items-center gap-1.5">
                  <Rating value={t.rating} size={11} />
                  <span className="truncate text-[11px] text-faint-fg">{t.context}</span>
                </div>
              </div>
            </figcaption>
          </figure>
        </RevealItem>
      ))}
    </RevealGroup>
  );
}
