import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GuildQueue, QueueRepeatMode, useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";

export const data = new SlashCommandBuilder()
  .setName("autoplay")
  .setDescription(
    "Play related songs automatically based on your existing queue"
  );

const isAutoplayEnabled = (queue: GuildQueue) => {
  return queue.repeatMode === QueueRepeatMode.AUTOPLAY;
};

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "editReply");

  let title: string;

  if (!isAutoplayEnabled(queue)) {
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
