import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { useQueue } from "discord-player";
import { queueManager } from "@/src/services/queueManager";
import { buildMessage } from "@/utils/bot-message/buildMessage";

export const data = new SlashCommandBuilder()
  .setName("stop")
  .setDescription("Stops and disconnects the player");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const queue = useQueue();

  const { guildId } = interaction;

  if (!guildId) {
    const message = buildMessage({
      title: "No guild was found",
    });
    return interaction.followUp(message);
  }

  if (!queue) {
    const message = buildMessage({
      title: "Please add some tracks first",
    });
    return interaction.followUp(message);
  }

  queue.delete();
  queueManager.clear(guildId);

  return interaction.deleteReply();
}
