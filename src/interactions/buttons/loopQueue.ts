import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { QueueRepeatMode, useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";

export const loopQueueButton = new ButtonBuilder()
  .setCustomId("loopQueue")
  .setEmoji("🔁")
  .setStyle(ButtonStyle.Secondary);

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

  if (queue.repeatMode === QueueRepeatMode.QUEUE) {
    queue.setRepeatMode(QueueRepeatMode.OFF);
  } else {
    queue.setRepeatMode(QueueRepeatMode.QUEUE);
  }
}
