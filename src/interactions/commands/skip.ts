import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const data = new SlashCommandBuilder()
  .setName("skip")
  .setDescription("Skip to the next track or multiple tracks in queue")
  .addIntegerOption((option) =>
    option
      .setName("to")
      .setDescription("Where in the queue to skip to")
      .setRequired(false)
      .setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const t = useTranslations(interaction.guildId ?? "");
  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE");

  if (queue.tracks.data.length === 0)
    return guardReply(interaction, "NO_TRACKS_IN_QUEUE");

  const to = interaction.options.getInteger("to");

  if (to) {
    queue.node.skipTo(to - 1);
  } else {
    queue.node.skip();
  }

  if (queue.node.isPaused()) queue.node.resume();

  const title = to
    ? t("commands.skip.message.toTitle", { to: to.toString() })
    : t("commands.skip.message.title");

  const data = buildMessage({
    title,
    color: "info",
  });
  return interaction.reply(data);
}
