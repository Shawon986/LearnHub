"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { dictionaries, type Locale } from "@/lib/i18n/dict";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Translate a UI-chrome string; falls back to the key itself. */
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem("locale", next);
    } catch {
      /* non-critical */
    }
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const t = useCallback(
    (key: string) => dictionaries[locale]?.[key] ?? key,
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside <LanguageProvider>");
  return ctx;
}
