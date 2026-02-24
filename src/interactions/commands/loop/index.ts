import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { QueueRepeatMode, useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";

export const data = new SlashCommandBuilder()
  .setName("loop")
  .setDescription("Change the loop settings on the player")

  .addSubcommand((subcommand) =>
    subcommand.setName("all").setDescription("Loops the whole queue")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("current").setDescription("Loops the current track")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("disable")
      .setDescription("Disables the loop mode for this playback")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const subcommand = interaction.options.getSubcommand(true);

  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "editReply");

  const modeMap: Record<string, { mode: QueueRepeatMode; title: string }> = {
    all: { mode: QueueRepeatMode.QUEUE, title: "Now looping the queue" },
    current: {
      mode: QueueRepeatMode.TRACK,
      title: "Now looping the current track",
    },
    disable: { mode: QueueRepeatMode.OFF, title: "Looping has been disabled" },
  };

  const entry = modeMap[subcommand];
  if (!entry) return;

  queue.setRepeatMode(entry.mode);

  await interaction.editReply(
    buildMessage({ title: entry.title, color: "info" })
  );
}
