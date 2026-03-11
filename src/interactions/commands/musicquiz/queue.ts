import {
  VoiceBasedChannel,
  PublicThreadChannel,
  ChatInputCommandInteraction,
  Guild,
  TextChannel,
  MessageCreateOptions,
} from "discord.js";
import { Player, useQueue } from "discord-player";
import { savePreviousQueue, restoreOldQueue } from "@/utils/helpers/queue";
import { queueManager, StoredQueue } from "@/src/services/queueManager";
import { musicPlayerMessage } from "@/src/services/musicPlayerMessage";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { delay } from "@/utils/helpers/utils";

export const savePreviousAndCreateNewQueue = async (
  voiceChannel: VoiceBasedChannel,
  player: Player,
  thread: PublicThreadChannel
) => {
  const guildId = voiceChannel.guild.id;
  const queue = useQueue(guildId);

  if (queue) {
    await savePreviousQueue(queue, guildId);
    (queue.metadata as any).isSwitching = true;
    queue.delete();
  }

  const newQueue = player.nodes.create(voiceChannel.guild, {
    metadata: { textChannel: thread, isSwitching: true, musicQuiz: true },
    leaveOnEmpty: false,
    leaveOnEnd: false,
    volume: 100,
  });

  return newQueue;
};

export const getPreviousQueue = async (
  guild: Guild,
  interaction: ChatInputCommandInteraction,
  thread: PublicThreadChannel,
  t: ReturnType<typeof useTranslations>
) => {
  const stored = queueManager.retrieve(guild.id);
  if (!stored) {
    const data = buildMessage({
      title: t("utility.queueManager.nothingToRestore"),
    });
    await musicPlayerMessage.delete().catch(() => {});
    queueManager.setQueueType("normal");
    const channel = (interaction.channel ?? thread) as TextChannel;
    await channel.send(data as MessageCreateOptions);
    return;
  }

  return stored;
};

export const restorePreviousQueue = async (
  storedQueue: StoredQueue,
  interaction: ChatInputCommandInteraction,
  guild: Guild,
  thread: PublicThreadChannel,
  t: ReturnType<typeof useTranslations>
) => {
  const data = buildMessage({
    title: t("utility.queueManager.restore.title"),
    color: "info",
  });

  const channel = (interaction.channel ?? thread) as TextChannel;
  const msg = await channel.send(data as MessageCreateOptions);

  await delay(1250);

  await restoreOldQueue({
    guild,
    storedQueue,
    textChannel: storedQueue.textChannel,
    voiceChannel: storedQueue.voiceChannel,
  });

  await msg.delete().catch(() => {});
};
