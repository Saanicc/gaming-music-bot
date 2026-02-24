import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { QueueRepeatMode, useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";

export const loopTrackButton = new ButtonBuilder()
  .setCustomId("loopTrack")
  .setEmoji("🔂")
  .setStyle(ButtonStyle.Secondary);

export async function execute(interaction: ButtonInteraction) {
  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE");
  if (!queue.isPlaying()) return guardReply(interaction, "NO_TRACK_PLAYING");

  await interaction.deferUpdate();

  if (queue.repeatMode === QueueRepeatMode.TRACK) {
    queue.setRepeatMode(QueueRepeatMode.OFF);
  } else {
    queue.setRepeatMode(QueueRepeatMode.TRACK);
  }
}
