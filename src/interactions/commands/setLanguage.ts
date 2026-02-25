import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { db } from "@/src/db";
import { LanguageCode, SUPPORTED_LANGUAGES } from "@/src/ui/translations";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { saveBotLanguageToCache } from "@/src/db/language";

const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  "en-US": "English",
  "sv-SE": "Swedish",
};

export const data = new SlashCommandBuilder()
  .setName("set_language")
  .setDescription("Set the language for the bot")
  .addStringOption((option) =>
    option
      .setName("lang")
      .setDescription("The language to set")
      .setRequired(true)
      .addChoices(
        ...SUPPORTED_LANGUAGES.map((code) => ({
          name: LANGUAGE_LABELS[code],
          value: code,
        }))
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const language = interaction.options.getString("lang", true) as LanguageCode;

  const guild = interaction.guild;

  if (!guild) {
    return guardReply(interaction, "NO_GUILD");
  }

  await interaction.deferReply();

  try {
    const savedLanguage = await db.saveLanguageToDB(guild.id, language);
    console.log("Language saved to DB", savedLanguage);
    saveBotLanguageToCache(guild.id, savedLanguage);
  } catch (error) {
    return guardReply(interaction, "DB_SAVE_ERROR", "editReply");
  }

  const t = useTranslations(guild.id);

  const data = buildMessage({
    title: t("commands.setLanguage.message.title"),
    description: t("commands.setLanguage.message.description", { language }),
    color: "info",
  });
  return interaction.editReply(data);
}
