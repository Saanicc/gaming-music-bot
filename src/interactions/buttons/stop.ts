import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { queueManager } from "@/services/queueManager";
import { useQueue } from "discord-player";
import { emoji } from "@/utils/constants/emojis";

export const stopButton = new ButtonBuilder()
  .setCustomId("stop")
  .setEmoji(emoji.stop)
  .setStyle(ButtonStyle.Danger);

export const execute = async (interaction: ButtonInteraction) => {
  const queue = useQueue();

  const { guildId } = interaction;

  if (!guildId) {
    return interaction.reply("⚠️ No guild was found.");
  }

  if (!queue) {
    return interaction.reply("⚠️ No active music queue.");
  }

  queue.delete();
  queueManager.clear(guildId);
};
