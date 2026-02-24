import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GuildQueue, QueueRepeatMode, useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { t } from "@/src/ui/translations";

export const data = new SlashCommandBuilder()
  .setName("autoplay")
  .setDescription(t("en-US", "commands.autoplay.description"));

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
    title = t("en-US", "commands.autoplay.messages.enabled");
  } else {
    queue.setRepeatMode(QueueRepeatMode.OFF);
    title = t("en-US", "commands.autoplay.messages.disabled");
  }

  const embedMessage = buildMessage({
    title,
    color: "info",
  });

  await interaction.editReply(embedMessage);
}
