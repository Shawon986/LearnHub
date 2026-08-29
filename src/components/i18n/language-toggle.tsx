"use client";

import { useLanguage } from "./language-provider";
import { cn } from "@/lib/utils";

/** EN | বাং pill — switches the whole UI chrome instantly. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-line bg-card p-0.5",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={locale === "en"}
        className={cn(
          "rounded-full px-2.5 py-1.5 text-[11px] font-extrabold transition-colors",
          locale === "en" ? "bg-brand text-white" : "text-muted-fg hover:text-foreground",
        )}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLocale("bn")}
        aria-pressed={locale === "bn"}
        className={cn(
          "rounded-full px-2.5 py-1.5 text-[11px] font-extrabold transition-colors",
          locale === "bn" ? "bg-brand text-white" : "text-muted-fg hover:text-foreground",
        )}
      >
        বাং
      </button>
    </div>
  );
}
