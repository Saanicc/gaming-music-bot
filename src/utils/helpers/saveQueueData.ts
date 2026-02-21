import { queueManager } from "@/services/queueManager";
import { GuildQueue } from "discord-player";

export const savePreviousQueue = async (queue: GuildQueue, guildId: string) => {
  const position = queue.node.getTimestamp()?.current.value ?? 0;
  const voiceChannel = (queue.metadata as any).voiceChannel;
  const textChannel = (queue.metadata as any).channel;

  queueManager.store(guildId, {
    tracks: queue.tracks.toArray(),
    queueType: "normal",
    currentTrack: queue.currentTrack ?? undefined,
    position,
    voiceChannel,
    textChannel,
  });
};
