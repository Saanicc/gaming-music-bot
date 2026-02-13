import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useQueue } from "discord-player";

export const data = new SlashCommandBuilder()
  .setName("nightcore")
  .setDescription("Turn the nightcore filter on or off");

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

  let title = "Nightcore filter has been ";

  const isNightcoreEnabled = () => {
    return queue.filters.ffmpeg.filters.includes("nightcore");
  };

  if (!isNightcoreEnabled()) {
    queue.filters.ffmpeg.setFilters(["nightcore"]);
    title += "enabled";
  } else {
    queue.filters.ffmpeg.setFilters(false);
    title += "disabled";
  }

  const embedMessage = buildMessage({
    title,
    color: "info",
  });

  await interaction.editReply(embedMessage);
}
