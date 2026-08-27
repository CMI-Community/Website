import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import type { ProjectLocale } from "../../project-catalog";
import type { ProjectView } from "../../project-module-registry";
import { lannaMessages, type LannaLanguage } from "./messages";

export const languageOptions = [
  { code: "zh", short: "中", label: "中文", nativeLabel: "中文" },
  { code: "th", short: "ไทย", label: "ภาษาไทย", nativeLabel: "ไทย" },
  { code: "en", short: "EN", label: "English", nativeLabel: "English" },
] as const satisfies readonly {
  code: LannaLanguage;
  short: string;
  label: string;
  nativeLabel: string;
}[];

function languageForLocale(locale: ProjectLocale): LannaLanguage {
  return locale === "zh-CN" ? "zh" : locale;
}

function getByPath(object: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (!value || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, object);
}

function interpolate(template: unknown, variables: Record<string, unknown> = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key: string) =>
    variables[key] === undefined ? `{${key}}` : String(variables[key]),
  );
}

interface LannaI18nContextValue {
  language: LannaLanguage;
  view: ProjectView;
  projectHref: string;
  recapHref: string;
  languageHref: (language: LannaLanguage) => string;
  t: (key: string, variables?: Record<string, unknown>) => string;
}

const I18nContext = createContext<LannaI18nContextValue | null>(null);

interface I18nProviderProps {
  children: ReactNode;
  locale: ProjectLocale;
  view: ProjectView;
  hrefFor: (language: LannaLanguage, view: ProjectView) => string;
}

export function I18nProvider({ children, locale, view, hrefFor }: I18nProviderProps) {
  const language = languageForLocale(locale);

  const value = useMemo<LannaI18nContextValue>(() => {
    const t = (key: string, variables?: Record<string, unknown>) => {
      const translated = getByPath(lannaMessages[language], key);
      const fallback = getByPath(lannaMessages.zh, key);
      return interpolate(translated ?? fallback ?? key, variables);
    };
    return {
      language,
      view,
      projectHref: hrefFor(language, "project"),
      recapHref: hrefFor(language, "recap"),
      languageHref: (nextLanguage) => hrefFor(nextLanguage, view),
      t,
    };
  }, [hrefFor, language, view]);

  useEffect(() => {
    const previousLanguage = document.documentElement.lang;
    document.documentElement.dataset.language = language;
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
    window.localStorage.setItem("lanna-site-language", language);
    return () => {
      delete document.documentElement.dataset.language;
      document.documentElement.lang = previousLanguage;
    };
  }, [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
