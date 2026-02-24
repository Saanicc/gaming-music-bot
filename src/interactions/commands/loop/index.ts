import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { QueueRepeatMode, useQueue } from "discord-player";

export const data = new SlashCommandBuilder()
  .setName("loop")
  .setDescription("Change the loop settings on the player")

  .addSubcommand((subcommand) =>
    subcommand.setName("all").setDescription("Loops the whole queue")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("current").setDescription("Loops the current track")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("disable")
      .setDescription("Disables the loop mode for this playback")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const subcommand = interaction.options.getSubcommand(true);

  const queue = useQueue();

  if (!queue) {
    const data = buildMessage({
      title: "This server does not have an active player session.",
      ephemeral: true,
      color: "info",
    });
    return interaction.followUp(data);
  }

  let title = "";

  if (subcommand === "all") {
    queue.setRepeatMode(QueueRepeatMode.QUEUE);
    title = "Now looping the queue";
  } else if (subcommand === "current") {
    queue.setRepeatMode(QueueRepeatMode.TRACK);
    title = "Now looping the current track";
  } else if (subcommand === "disable") {
    queue.setRepeatMode(QueueRepeatMode.OFF);
    title = "Looping has been disabled";
  }

  const embedMessage = buildMessage({
    title,
    color: "info",
  });

  await interaction.followUp(embedMessage);
}
