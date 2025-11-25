import {
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
} from "discord.js";
import { useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { emoji } from "@/utils/constants/emojis";

export const previousButton = new ButtonBuilder()
  .setCustomId("previous")
  .setEmoji(emoji.previous)
  .setStyle(ButtonStyle.Primary);

export async function execute(interaction: ChatInputCommandInteraction) {
  const queue = useQueue();

  if (!queue) {
    const data = buildMessage({
      title: "This server does not have an active player session.",
      ephemeral: true,
      color: "info",
    });
    return interaction.reply(data);
  }

  if (!queue.isPlaying()) {
    const data = buildMessage({
      title: "There is no track playing.",
      ephemeral: true,
      color: "info",
    });
    await interaction.reply(data);
    return;
  }

  queue.history.previous();
  if (queue.node.isPaused()) queue.node.resume();
}
