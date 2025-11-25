import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { QueueRepeatMode, useQueue } from "discord-player";

export const data = new SlashCommandBuilder()
  .setName("autoplay")
  .setDescription(
    "Play related songs automatically based on your existing queue"
  )
  .addBooleanOption((option) =>
    option
      .setName("enabled")
      .setDescription("If the autoplay should be enabled or disabled")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const enabled = interaction.options.getBoolean("enabled") ?? true;

  const queue = useQueue();

  if (!queue) {
    const data = buildMessage({
      title: "This server does not have an active player session.",
      ephemeral: true,
      color: "info",
    });
    return interaction.editReply(data);
  }

  let title: string;

  if (enabled) {
    queue.setRepeatMode(QueueRepeatMode.AUTOPLAY);
    title = "Autoplay has been turned on";
  } else {
    queue.setRepeatMode(QueueRepeatMode.OFF);
    title = "Autoplay has been turned off";
  }

  const embedMessage = buildMessage({
    title,
    color: "info",
  });

  await interaction.editReply(embedMessage);
}
