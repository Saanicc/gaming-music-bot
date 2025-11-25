import { queueManager } from "@/services/queueManager";
import { GuildQueue } from "discord-player";

export const savePreviousQueue = async (queue: GuildQueue, guildId: string) => {
  const progress = queue.node.getTimestamp()?.current.value ?? 0;

  const voiceChannel = (queue.metadata as any).voiceChannel;

  queueManager.store(
    guildId,
    queue.tracks.toArray(),
    "normal",
    queue.currentTrack ?? undefined,
    progress,
    voiceChannel
  );
};
