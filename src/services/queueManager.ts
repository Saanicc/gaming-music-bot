import { Track } from "discord-player";
import { TextChannel, VoiceChannel } from "discord.js";

export type QueueType = "normal" | "boss";

export interface StoredQueue {
  tracks: Track[];
  queueType: QueueType;
  currentTrack?: Track;
  position?: number;
  voiceChannel?: VoiceChannel;
  textChannel?: TextChannel;
}

const storedQueues = new Map<string, StoredQueue>();
const guildQueueType = new Map<string, QueueType>();

export const queueManager = {
  store(guildId: string, options: StoredQueue) {
    storedQueues.set(guildId, options);
  },

  retrieve(guildId: string): StoredQueue | undefined {
    return storedQueues.get(guildId);
  },

  clear(guildId: string) {
    storedQueues.delete(guildId);
    this.setGuildQueueType(guildId, "normal");
  },

  setGuildQueueType(guildId: string, type: QueueType) {
    guildQueueType.set(guildId, type);
  },

  getGuildQueueType(guildId: string) {
    return guildQueueType.get(guildId);
  },
};
