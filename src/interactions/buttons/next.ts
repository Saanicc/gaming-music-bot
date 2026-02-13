import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { emoji } from "@/utils/constants/emojis";

export const nextButton = new ButtonBuilder()
  .setCustomId("next")
  .setEmoji(emoji.next)
  .setStyle(ButtonStyle.Primary);

export async function execute(interaction: ButtonInteraction) {
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

  await interaction.deferUpdate();
  queue.history.next();
  if (queue.node.isPaused()) queue.node.resume();
}
