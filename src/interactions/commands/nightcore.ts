import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { t } from "@/src/ui/translations";

export const data = new SlashCommandBuilder()
  .setName("nightcore")
  .setDescription(t("en-US", "commands.nightcore.description"));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "editReply");

  const isNightcoreEnabled = () => {
    return queue.filters.ffmpeg.filters.includes("nightcore");
  };

  let title = "";

  if (!isNightcoreEnabled()) {
    queue.filters.ffmpeg.setFilters(["nightcore"]);
    title = t("en-US", "commands.nightcore.messages.enabled");
  } else {
    queue.filters.ffmpeg.setFilters(false);
    title = t("en-US", "commands.nightcore.messages.disabled");
  }

  const embedMessage = buildMessage({
    title,
    color: "info",
  });

  await interaction.editReply(embedMessage);
}
