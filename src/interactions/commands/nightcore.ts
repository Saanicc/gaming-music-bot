import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const data = new SlashCommandBuilder()
  .setName("nightcore")
  .setDescription("Toggle the nightcore filter on or off");

export async function execute(interaction: ChatInputCommandInteraction) {
  const t = useTranslations(interaction.guildId ?? "");

  await interaction.deferReply();

  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "editReply");

  const isNightcoreEnabled = () => {
    return queue.filters.ffmpeg.filters.includes("nightcore");
  };

  let title = "";

  if (!isNightcoreEnabled()) {
    queue.filters.ffmpeg.setFilters(["nightcore"]);
    title = t("commands.nightcore.messages.enabled");
  } else {
    queue.filters.ffmpeg.setFilters(false);
    title = t("commands.nightcore.messages.disabled");
  }

  const embedMessage = buildMessage({
    title,
    color: "info",
  });

  await interaction.editReply(embedMessage);
}
