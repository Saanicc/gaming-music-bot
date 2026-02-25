import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip the currently playing track");

export async function execute(interaction: ChatInputCommandInteraction) {
  const t = useTranslations(interaction.guildId ?? "");
  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE");
  if (!queue.isPlaying()) return guardReply(interaction, "NO_TRACK_PLAYING");

  queue.node.skip();
  if (queue.node.isPaused()) queue.node.resume();

  const data = buildMessage({
    title: t("commands.skip.message.title"),
    color: "info",
  });
  return interaction.reply(data);
}
