import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { queueManager } from "@/services/queueManager";
import { useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { emoji } from "@/utils/constants/emojis";

export const stopButton = new ButtonBuilder()
  .setCustomId("stop")
  .setEmoji(emoji.stop)
  .setStyle(ButtonStyle.Danger);

export const execute = async (interaction: ButtonInteraction) => {
  const queue = useQueue();

  const { guildId } = interaction;

  if (!guildId) return guardReply(interaction, "NO_GUILD");
  if (!queue) return guardReply(interaction, "NO_QUEUE");

  queue.delete();
  queueManager.clear(guildId);
};
