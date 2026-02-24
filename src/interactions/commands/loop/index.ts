import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { QueueRepeatMode, useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { t } from "@/src/ui/translations";

export const data = new SlashCommandBuilder()
  .setName("loop")
  .setDescription(t("en-US", "commands.loop.description"))

  .addSubcommand((subcommand) =>
    subcommand
      .setName("all")
      .setDescription(t("en-US", "commands.loop.all.description"))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("current")
      .setDescription(t("en-US", "commands.loop.current.description"))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("disable")
      .setDescription(t("en-US", "commands.loop.disable.description"))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand(true);
  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "reply");

  await interaction.deferReply();

  const modeMap: Record<string, { mode: QueueRepeatMode; title: string }> = {
    all: {
      mode: QueueRepeatMode.QUEUE,
      title: t("en-US", "commands.loop.all.title"),
    },
    current: {
      mode: QueueRepeatMode.TRACK,
      title: t("en-US", "commands.loop.current.title"),
    },
    disable: {
      mode: QueueRepeatMode.OFF,
      title: t("en-US", "commands.loop.disable.title"),
    },
  };

  const entry = modeMap[subcommand];
  if (!entry) return;

  queue.setRepeatMode(entry.mode);

  await interaction.editReply(
    buildMessage({ title: entry.title, color: "info" })
  );
}
