import {
  DEFAULT_LANGUAGE,
  getBotLanguageFromCache,
  LanguageCode,
} from "../ui/translations";
import { GuildSettings } from "./schema/GuildSettings";

export const saveLanguageToDB = async (
  guildId: string,
  language: LanguageCode
) => {
  try {
    await GuildSettings.findOneAndUpdate(
      { guildId },
      { language },
      { upsert: true }
    );
    return language;
  } catch (error) {
    throw error;
  }
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
      return await saveLanguageToDB(guildId, DEFAULT_LANGUAGE);
    } catch (error) {
      console.error("Failed to save language to DB", error);
      return DEFAULT_LANGUAGE;
    }
  }

  return dbLanguage;
};
