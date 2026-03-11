import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { guardReply } from "@/utils/helpers/interactions";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const data = new SlashCommandBuilder()
  .setName("remove")
  .setDescription("Remove a track from the queue")
  .addIntegerOption((option) =>
    option
      .setName("at")
      .setDescription("Where in the queue to remove")
      .setRequired(true)
      .setMinValue(1)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const t = useTranslations(interaction.guildId ?? "");
  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE");

  if (queue.tracks.data.length === 0)
    return guardReply(interaction, "NO_TRACKS_IN_QUEUE");

  const at = interaction.options.getInteger("at", true);

  if (at > queue.tracks.data.length)
    return guardReply(interaction, "INVALID_REMOVE_POSITION");

  queue.node.remove(at - 1);

  const title = t("commands.remove.message.title", { at: at.toString() });

  const message = buildMessage({
    title,
    color: "info",
  });
  return interaction.reply(message);
}
