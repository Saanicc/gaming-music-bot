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
    const document = await GuildSettings.findOneAndUpdate(
      { guildId },
      { language },
      { upsert: true }
    );
    return document?.language as LanguageCode;
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
    await saveLanguageToDB(guildId, DEFAULT_LANGUAGE);
    return DEFAULT_LANGUAGE;
  }

  return dbLanguage;
};
