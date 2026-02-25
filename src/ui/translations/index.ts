import enUS from "./locales/en-US.json";
import svSE from "./locales/sv-SE.json";

const guildLanguages: Map<string, LanguageCode> = new Map();

export const SUPPORTED_LANGUAGES = ["en-US", "sv-SE"] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = "en-US";

export const locales: Record<LanguageCode, typeof enUS> = {
  "en-US": enUS,
  "sv-SE": svSE,
};
