import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { emoji } from "@/utils/constants/emojis";

export const resumeButton = new ButtonBuilder()
  .setCustomId("resume")
  .setEmoji(emoji.play)
  .setStyle(ButtonStyle.Success);

export const execute = async (interaction: ButtonInteraction) => {
  await interaction.deferUpdate();
  const { guild } = interaction;
  if (!guild) return guardReply(interaction, "NO_GUILD", "followUp");

  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "followUp");

  queue.node.resume();
};
