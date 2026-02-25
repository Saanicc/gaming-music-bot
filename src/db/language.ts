import { DEFAULT_LANGUAGE, LanguageCode } from "../ui/translations";
import { GuildSettings } from "./schema/GuildSettings";

const guildLanguages: Map<string, LanguageCode> = new Map();

export const saveLanguageToDB = async (
  guildId: string,
  language: LanguageCode
) => {
  await GuildSettings.findOneAndUpdate(
    { guildId },
    { language },
    { upsert: true }
  );
  return language;
};

export const getLanguageFromDB = async (guildId: string) => {
  const cachedLanguage = getBotLanguageFromCache(guildId);
  if (cachedLanguage) {
    return cachedLanguage;
  }

  const guildSettings = await GuildSettings.findOne({ guildId });
  const dbLanguage = guildSettings?.language as LanguageCode | undefined;

  if (!dbLanguage) {
    try {
      const language = await saveLanguageToDB(guildId, DEFAULT_LANGUAGE);
      saveBotLanguageToCache(guildId, language);
      return language;
    } catch (error) {
      console.error("Failed to save language to DB", error);
      return DEFAULT_LANGUAGE;
    }
  }

  saveBotLanguageToCache(guildId, dbLanguage);
  return dbLanguage;
};

export const saveBotLanguageToCache = (
  guildId: string,
  language: LanguageCode
) => {
  guildLanguages.set(guildId, language);
};

export const getBotLanguageFromCache = (guildId: string) => {
  return guildLanguages.get(guildId);
};
