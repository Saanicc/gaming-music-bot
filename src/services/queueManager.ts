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

interface StoreOptions {
  tracks: Track[];
  queueType: QueueType;
  currentTrack?: Track;
  position?: number;
  voiceChannel?: VoiceChannel;
  textChannel?: TextChannel;
}

const storedQueues = new Map<string, StoredQueue>();
let queueType: QueueType = "normal";

export const queueManager = {
  store(guildId: string, options: StoreOptions) {
    storedQueues.set(guildId, { ...options });
  },

  retrieve(guildId: string): StoredQueue | undefined {
    return storedQueues.get(guildId);
  },

  clear(guildId: string) {
    storedQueues.delete(guildId);
    this.setQueueType("normal");
  },

  setQueueType(type: QueueType) {
    queueType = type;
  },

  getQueueType() {
    return queueType;
  },
};
