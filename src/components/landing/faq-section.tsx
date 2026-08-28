"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "How do I pay for courses?",
    a: "You can pay with bKash, Nagad or Rocket — and international cards via Stripe. Payments are verified server-side, and you get a transaction receipt for every purchase.",
  },
  {
    q: "How much commission does LearnHub take from teachers?",
    a: "A flat 15% platform commission on every sale by default (configurable per teacher or course by the admin). Teachers keep 85% of the course price, credited to their wallet instantly after payment.",
  },
  {
    q: "Can I get a refund?",
    a: "Yes. If a class is cancelled or a course doesn't match its description, you can open a dispute from your dashboard. Our team reviews every case and issues refunds within 3–5 working days.",
  },
  {
    q: "How does teacher verification work?",
    a: "Teachers submit their identity documents, education and experience. Our team reviews each application — approved teachers get a verified badge on their profile.",
  },
  {
    q: "Do I get a certificate?",
    a: "Yes! Complete a course and you'll receive a shareable certificate with a unique ID and QR code. Anyone can verify its authenticity on our public verification page.",
  },
  {
    q: "Can I watch recorded classes on my phone?",
    a: "Absolutely. The whole platform is responsive — recorded classes resume where you left off on any device, with playback speed, captions and note-taking built in.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <div className="mx-auto max-w-3xl space-y-3">
      {FAQS.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div
            key={faq.q}
            className={cn(
              "overflow-hidden rounded-2xl border bg-card transition-colors",
              isOpen ? "border-brand/40 shadow-soft" : "border-line",
            )}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-[14px] font-bold text-foreground">{faq.q}</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-faint-fg transition-transform duration-200",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={reduceMotion ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="px-5 pb-5 text-[13px] leading-relaxed text-muted-fg">{faq.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
