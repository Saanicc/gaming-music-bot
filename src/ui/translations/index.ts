import enUS from "./locales/en-US.json";

export const SUPPORTED_LANGUAGES = ["en-US"] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = "en-US";

export const locales: Record<LanguageCode, typeof enUS> = {
  "en-US": enUS,
};

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

  if (!vars) return value;
  return Object.entries(vars).reduce(
    (str, [k, v]) => str.replace(`{{${k}}}`, v),
    value
  );
}
