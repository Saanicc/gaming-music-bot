import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { execute as showQueue, renderQueue } from "../commands/queue";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { emoji } from "@/utils/constants/emojis";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const queueButton = new ButtonBuilder()
  .setCustomId("queue")
  .setEmoji(emoji.queue)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  const t = useTranslations(interaction.guild?.id ?? "");

  const { guild } = interaction;
  if (!guild) return guardReply(interaction, "NO_GUILD");

  const customId = interaction.customId;

  if (customId === "queue") {
    return showQueue(interaction);
  }

  const parts = customId.split(":");
  const action = parts[1];

  if (action === "stop") {
    return interaction.message.delete();
  }

  const targetPage = parseInt(parts[2], 10) || 1;
  await renderQueue(interaction, targetPage, "update", t);
};
