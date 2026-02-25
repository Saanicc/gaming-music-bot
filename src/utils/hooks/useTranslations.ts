import {
  DEFAULT_LANGUAGE,
  locales,
  getBotLanguageFromCache,
} from "@/ui/translations";

export function useTranslations(guildId: string) {
  const lang = getBotLanguageFromCache(guildId) ?? DEFAULT_LANGUAGE;

  console.log("Language from cache", lang);

  return function t(key: string, vars?: Record<string, string>): string {
    const translations = locales[lang] ?? locales[DEFAULT_LANGUAGE];
    const value =
      key.split(".").reduce((obj: any, k) => obj?.[k], translations) ??
      key
        .split(".")
        .reduce((obj: any, k) => obj?.[k], locales[DEFAULT_LANGUAGE]) ??
      key;

    if (!vars) return value;
    return Object.entries(vars).reduce(
      (str, [k, v]) => str.replace(`{{${k}}}`, v),
      value
    );
  };
}
