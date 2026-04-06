import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { QueueRepeatMode, useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactions";
import { musicPlayerMessage } from "../../services/musicPlayerMessage";

export const loopQueueButton = new ButtonBuilder()
  .setCustomId("loopQueue")
  .setEmoji("🔁")
  .setStyle(ButtonStyle.Secondary);

export async function execute(interaction: ButtonInteraction) {
  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE");
  if (!queue.isPlaying()) return guardReply(interaction, "NO_TRACK_PLAYING");

  await interaction.deferUpdate();

  if (queue.repeatMode === QueueRepeatMode.QUEUE) {
    queue.setRepeatMode(QueueRepeatMode.OFF);
  } else {
    queue.setRepeatMode(QueueRepeatMode.QUEUE);
  }

  musicPlayerMessage.buildAndEdit();
}
