import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import { queueManager } from "@/src/services/queueManager";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { t } from "@/src/ui/translations";

export const data = new SlashCommandBuilder()
  .setName("stop")
  .setDescription(t("en-US", "commands.stop.description"));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const queue = useQueue();

  const { guildId } = interaction;

  if (!guildId) return guardReply(interaction, "NO_GUILD", "editReply");
  if (!queue) return guardReply(interaction, "PLEASE_ADD_TRACKS", "editReply");

  queue.delete();
  queueManager.clear(guildId);

  return interaction.deleteReply();
}
