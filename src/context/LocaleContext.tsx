"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import en from "@/locales/en.json";
import zh from "@/locales/zh.json";
import es from "@/locales/es.json";

export type Locale = "en" | "zh" | "es";

const translations: Record<Locale, Record<string, unknown>> = { en, zh, es };

const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  zh: "中",
  es: "ES",
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  localeLabels: Record<Locale, string>;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key: string) => key,
  localeLabels: LOCALE_LABELS,
});

// Flatten nested JSON to dot-notation keys
function flattenMessages(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === "object" && obj[key] !== null) {
      Object.assign(result, flattenMessages(obj[key] as Record<string, unknown>, fullKey));
    } else {
      result[fullKey] = String(obj[key]);
    }
  }
  return result;
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const saved = localStorage.getItem("locale") as Locale | null;
  if (saved && translations[saved]) return saved;
  const browserLang = navigator.language.slice(0, 2);
  if (browserLang === "zh") return "zh";
  if (browserLang === "es") return "es";
  return "en";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());
  const [mounted, setMounted] = useState(false);
  const [flat, setFlat] = useState<Record<string, string>>(() =>
    flattenMessages(translations[getInitialLocale()] as unknown as Record<string, unknown>)
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setFlat(flattenMessages(translations[newLocale] as unknown as Record<string, unknown>));
    localStorage.setItem("locale", newLocale);
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback((key: string): string => {
    return flat[key] || key;
  }, [flat]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, localeLabels: LOCALE_LABELS }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);
