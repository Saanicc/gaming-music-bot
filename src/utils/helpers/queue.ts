import { queueManager, StoredQueue } from "@/services/queueManager";
import {
  Guild,
  TextBasedChannel,
  TextChannel,
  VoiceBasedChannel,
} from "discord.js";
import { Player, Track, useMainPlayer, GuildQueue } from "discord-player";
import { joinVoiceChannel } from "./system";
import { getSearchEngine } from "./utils";

const reSearch = async (track: Track, player: Player) => {
  try {
    const query = track.url ?? track.title;
    const result = await player.search(query, {
      requestedBy: track.requestedBy ?? undefined,
      searchEngine: getSearchEngine(query),
    });
    if (result.tracks.length) return result.tracks[0];
  } catch (err) {
    console.warn(`Failed to restore track: ${track.title}`, err);
  }
};

export const restoreOldQueue = async ({
  guild,
  storedQueue,
  textChannel,
  voiceChannel,
}: {
  guild: Guild;
  storedQueue: StoredQueue;
  textChannel?: TextBasedChannel;
  voiceChannel?: VoiceBasedChannel;
}) => {
  const guildId = guild.id;

  if (!voiceChannel || !voiceChannel.isVoiceBased()) {
    console.warn(`No valid voice channel to restore queue for ${guildId}.`);
    return;
  }

  const player = useMainPlayer();

  const newQueue = player.nodes.create(guild, {
    metadata: { textChannel, voiceChannel },
    leaveOnEnd: false,
    leaveOnEmpty: true,
    leaveOnEmptyCooldown: 15000,
  });

  let currentTrack = undefined;
  if (storedQueue.currentTrack) {
    currentTrack = await reSearch(storedQueue.currentTrack, player);
  }

  for (const track of storedQueue.tracks) {
    const rebuilt = await reSearch(track, player);
    if (rebuilt) newQueue.addTrack(rebuilt);
  }

  await joinVoiceChannel({
    queue: newQueue,
    voiceChannel,
    textChannel: textChannel as TextChannel,
  });

  if (!newQueue.connection) return;

  if (currentTrack && storedQueue.position)
    await newQueue.node.play(currentTrack, { seek: storedQueue.position });
  else {
    await newQueue.node.play();
  }

  queueManager.clear(guildId);
};

export const savePreviousQueue = async (queue: GuildQueue, guildId: string) => {
  const position = queue.node.getTimestamp()?.current.value ?? 0;
  const voiceChannel = (queue.metadata as any).voiceChannel;
  const textChannel = (queue.metadata as any).textChannel;

  queueManager.store(guildId, {
    tracks: queue.tracks.toArray(),
    queueType: "normal",
    currentTrack: queue.currentTrack ?? undefined,
    position,
    voiceChannel,
    textChannel,
  });
};

/**
 * Wraps an async operation with the queue's built-in tasksQueue (AsyncQueue)
 * to serialize track-adding + play operations across concurrent commands.
 *
 * @see https://discord-player.js.org/docs/common-actions/common_actions#playing-a-new-track
 */
export async function withTasksQueue<T>(
  queue: GuildQueue,
  fn: () => Promise<T>
): Promise<T> {
  const entry = queue.tasksQueue.acquire();
  await entry.getTask();
  try {
    return await fn();
  } finally {
    queue.tasksQueue.release();
  }
}

export const getQueuePosition = (queue: GuildQueue): string => {
  return String(queue.tracks.size > 0 ? queue.tracks.size : 1);
};
