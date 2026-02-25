import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  MessageCreateOptions,
  TextChannel,
} from "discord.js";
import { queueManager } from "@/services/queueManager";
import { restoreOldQueue } from "@/utils/helpers/restoreOldQueue";
import { delay } from "@/utils/helpers/utils";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { musicPlayerMessage } from "@/services/musicPlayerMessage";
import { useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { emoji } from "@/utils/constants/emojis";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const victoryButton = new ButtonBuilder()
  .setCustomId("victory")
  .setEmoji(emoji.victory)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  const t = useTranslations(interaction.guildId ?? "");
  await interaction.deferUpdate();

  const { guild } = interaction;
  if (!guild) return guardReply(interaction, "NO_GUILD", "followUp");

  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "followUp");

  queue.node.stop();
  (queue.metadata as any).isSwitching = true;
  queue.delete();

  const stored = queueManager.retrieve(guild.id);

  if (!stored) {
    const data = buildMessage({
      title: t("utility.queueManager.nothingToRestore"),
    });
    await musicPlayerMessage.delete();
    queueManager.setQueueType("normal");
    return await (interaction.channel as TextChannel).send(
      data as MessageCreateOptions
    );
  }

  const data = buildMessage({
    title: t("utility.queueManager.restore.title"),
    color: "info",
  });

  const msg = await (interaction.channel as TextChannel).send(
    data as MessageCreateOptions
  );

  await delay(1250);

  await restoreOldQueue({
    guild,
    storedQueue: stored,
    textChannel: interaction.channel ?? undefined,
    voiceChannel: stored.voiceChannel,
  });

  await msg.delete();
};
