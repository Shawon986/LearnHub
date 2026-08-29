"use client";

import { SectionHeading } from "@/components/shared/section-heading";
import { useLanguage } from "@/components/i18n/language-provider";

/** SectionHeading whose eyebrow/title/description resolve through i18n. */
export function TranslatedSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  const { t } = useLanguage();
  return (
    <SectionHeading
      eyebrow={t(eyebrow)}
      title={t(title)}
      description={description ? t(description) : undefined}
    />
  );
}
