import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { QueueRepeatMode, useQueue } from "discord-player";

export const data = new SlashCommandBuilder()
  .setName("loop_all")
  .setDescription("loops the whole queue");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const queue = useQueue();

  if (!queue) {
    const data = buildMessage({
      title: "This server does not have an active player session.",
      ephemeral: true,
      color: "info",
    });
    return interaction.editReply(data);
  }

  queue.setRepeatMode(QueueRepeatMode.QUEUE);

  const embedMessage = buildMessage({
    title: "Now looping the queue",
    color: "info",
  });

  await interaction.editReply(embedMessage);
}
