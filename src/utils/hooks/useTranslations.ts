import { getBotLanguageFromCache } from "@/src/db/language";
import { DEFAULT_LANGUAGE, locales, LanguageCode } from "@/ui/translations";

export function t(
  lang: LanguageCode,
  key: string,
  vars?: Record<string, string>
): string {
  const translations = locales[lang] ?? locales[DEFAULT_LANGUAGE];
  const value =
    key.split(".").reduce((obj: any, k) => obj?.[k], translations) ??
    key
      .split(".")
      .reduce((obj: any, k) => obj?.[k], locales[DEFAULT_LANGUAGE]) ??
    key;

  if (typeof value !== "string") return key;
  if (!vars) return value;

  return Object.entries(vars).reduce(
    (str, [k, v]) => str.split(`{{${k}}}`).join(v),
    value
  );
}

export function useTranslations(guildId: string) {
  const lang = getBotLanguageFromCache(guildId) ?? DEFAULT_LANGUAGE;
  return (key: string, vars?: Record<string, string>) => t(lang, key, vars);
}
