import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { emoji } from "@/utils/constants/emojis";

export const pauseButton = new ButtonBuilder()
  .setCustomId("pause")
  .setEmoji(emoji.pause)
  .setStyle(ButtonStyle.Success);

export const execute = async (interaction: ButtonInteraction) => {
  await interaction.deferUpdate();
  const { guild } = interaction;
  if (!guild) return guardReply(interaction, "NO_GUILD");

  const queue = useQueue();

  if (!queue) return;

  queue.node.pause();
};
