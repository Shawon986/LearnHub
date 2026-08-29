"use client";

import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { useLanguage } from "@/components/i18n/language-provider";

export function CtaSection() {
  const { t } = useLanguage();
  return (
    <Reveal>
      <div className="bg-brand-surface relative overflow-hidden rounded-3xl border border-line p-10 text-center sm:p-14">
        <div
          className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
          aria-hidden
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            {t("Your next skill is one class away")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted-fg">
            {t(
              "Join thousands of learners and hundreds of verified teachers building the future of education in Bangladesh.",
            )}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/register" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
              {t("Start learning free")}
            </Button>
            <Button
              href="/register"
              size="lg"
              variant="secondary"
              leftIcon={<GraduationCap className="h-4 w-4" />}
            >
              {t("Start teaching")}
            </Button>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
