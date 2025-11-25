import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";

export const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip the currently playing song");

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

  queue.node.skip();
  if (queue.node.isPaused()) queue.node.resume();

  const data = buildMessage({
    title: "Skipped to the next track in queue.",
    color: "info",
  });
  return interaction.reply(data);
}
