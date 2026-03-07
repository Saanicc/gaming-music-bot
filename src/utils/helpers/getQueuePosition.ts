import { GuildQueue } from "discord-player";

export const getQueuePosition = (queue: GuildQueue): string => {
  return String(queue.tracks.size > 0 ? queue.tracks.size : 1);
};
