"use client";

import en from "./en.json";
import vi from "./vi.json";
import zh from "./zh.json";
import es from "./es.json";
import ja from "./ja.json";
import pt from "./pt.json";
import { LocaleMode, normalizeLocale, useAppStore } from "@/state-manager/app-store";

export type TranslationData = typeof en;

export interface LocaleOption {
  code: LocaleMode;
  short: string;
  label: string;
  flag: string;
}

export const SUPPORTED_LOCALES: LocaleOption[] = [
  { code: "en", short: "EN", label: "English", flag: "🇺🇸" },
  { code: "vi", short: "VI", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "zh", short: "ZH", label: "中文", flag: "🇨🇳" },
  { code: "es", short: "ES", label: "Español", flag: "🇪🇸" },
  { code: "ja", short: "JA", label: "日本語", flag: "🇯🇵" },
  { code: "pt", short: "PT", label: "Português (BR)", flag: "🇧🇷" },
];

const dictionaries: Record<LocaleMode, TranslationData> = {
  en,
  vi,
  zh,
  es,
  ja,
  pt,
};

export function getTranslation(locale?: string | null): TranslationData {
  return dictionaries[normalizeLocale(locale)] || dictionaries.en;
}

export function formatText(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`
  );
}

export function getWeaponDisplayName(
  weaponId: string,
  fallbackName: string,
  armoryTrans: TranslationData["armory"]
): string {
  const map = armoryTrans.weaponNames as Record<string, string> | undefined;
  return map?.[weaponId] ?? fallbackName;
}

// Hook lấy từ điển theo ngôn ngữ hiện tại (theo pattern useTransClientSide của blog-fe)
export const useTransClientSide = (): TranslationData => {
  const locale = useAppStore((s) => s.locale);
  return dictionaries[locale] || dictionaries.en;
};

export default useTransClientSide;
