import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { useQueue } from "discord-player";
import { emoji } from "@/utils/constants/emojis";

export const resumeButton = new ButtonBuilder()
  .setCustomId("resume")
  .setEmoji(emoji.play)
  .setStyle(ButtonStyle.Success);

export const execute = async (interaction: ButtonInteraction) => {
  await interaction.deferUpdate();
  const { guild } = interaction;
  if (!guild) {
    return interaction.followUp("⚠️ No guild was found.");
  }

  const queue = useQueue();

  if (!queue) {
    return interaction.followUp("⚠️ No queue was found.");
  }

  queue.node.resume();
};
