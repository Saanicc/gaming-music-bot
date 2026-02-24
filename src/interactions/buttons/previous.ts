import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { emoji } from "@/utils/constants/emojis";

export const previousButton = new ButtonBuilder()
  .setCustomId("previous")
  .setEmoji(emoji.previous)
  .setStyle(ButtonStyle.Primary);

export async function execute(interaction: ButtonInteraction) {
  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE");
  if (!queue.isPlaying()) return guardReply(interaction, "NO_TRACK_PLAYING");

  await interaction.deferUpdate();
  await queue.history.previous();
  if (queue.node.isPaused()) queue.node.resume();
}
