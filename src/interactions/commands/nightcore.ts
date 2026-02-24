import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";

export const data = new SlashCommandBuilder()
  .setName("nightcore")
  .setDescription("Turn the nightcore filter on or off");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "editReply");

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
