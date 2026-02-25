import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { QueueRepeatMode, useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";

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
  const t = useTranslations(interaction.guildId ?? "");

  const subcommand = interaction.options.getSubcommand(true);
  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "reply");

  await interaction.deferReply();

  const modeMap: Record<string, { mode: QueueRepeatMode; title: string }> = {
    all: {
      mode: QueueRepeatMode.QUEUE,
      title: t("commands.loop.all.title"),
    },
    current: {
      mode: QueueRepeatMode.TRACK,
      title: t("commands.loop.current.title"),
    },
    disable: {
      mode: QueueRepeatMode.OFF,
      title: t("commands.loop.disable.title"),
    },
  };

  const entry = modeMap[subcommand];
  if (!entry) return;

  queue.setRepeatMode(entry.mode);

  await interaction.editReply(
    buildMessage({ title: entry.title, color: "info" })
  );
}
