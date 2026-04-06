import {
  Message,
  MessageCreateOptions,
  MessageEditOptions,
  MessagePayload,
  TextChannel,
} from "discord.js";
import { buildNowPlayingMessage } from "../utils/bot-message/buildNowPlayingMessage";
import { GuildQueue, Track } from "discord-player";
import {
  checkIfTrackInDB,
  getTrackRequestedByFooterText,
  isTrackInCache,
} from "../utils/helpers/track";

interface BuildParams {
  queue: GuildQueue;
  track: Track;
  isPlaying: boolean;
  shouldUpdateProgress?: boolean;
}

let nowPlayingMessage: Message | undefined;
let progressInterval: NodeJS.Timeout | null = null;
let sharedState: {
  queue: GuildQueue;
  track: Track;
  footerText: string;
  isPlaying: boolean;
} | null = null;

export const musicPlayerMessage = {
  async set(message: typeof nowPlayingMessage) {
    nowPlayingMessage = message;
  },

  get() {
    return nowPlayingMessage;
  },

  async edit(data: string | MessageEditOptions | MessagePayload) {
    if (nowPlayingMessage) return await nowPlayingMessage.edit(data);
  },

  async delete() {
    if (!nowPlayingMessage) return;

    await nowPlayingMessage.delete();
    nowPlayingMessage = undefined;
    return;
  },

  async build({
    queue,
    track,
    isPlaying,
    shouldUpdateProgress = false,
  }: BuildParams) {
    const channel = queue.metadata.textChannel as TextChannel;

    const inDB = await checkIfTrackInDB(queue.guild.id, track);

    const footerText = await getTrackRequestedByFooterText(
      track.requestedBy,
      queue.guild.id
    );

    sharedState = { queue, track, footerText, isPlaying };

    const data = buildNowPlayingMessage({
      track,
      isPlaying,
      queue,
      footerText,
      isTrackInDB: inDB,
    });

    let msg: Message;
    if (this.get()) {
      await this.edit(data as MessageEditOptions);
    } else {
      msg = await channel.send(data as MessageCreateOptions);
      this.set(msg);
    }

    if (!shouldUpdateProgress) {
      this.clearProgressInterval();
      return;
    }

    const INTERVAL_MS = 2000;

    this.setProgressInterval(
      setInterval(async () => {
        await this.buildAndEdit();
      }, INTERVAL_MS)
    );
  },

  async buildAndEdit() {
    if (!sharedState) return;
    if (!this.get()) return;

    const updateData = buildNowPlayingMessage({
      track: sharedState.track,
      isPlaying: sharedState.isPlaying,
      queue: sharedState.queue,
      footerText: sharedState.footerText,
      isTrackInDB: isTrackInCache(
        sharedState.queue.guild.id,
        sharedState.track.url
      ),
    });

    await this.edit(updateData as MessageEditOptions).catch(() => {});
  },

  clearProgressInterval() {
    if (progressInterval) clearInterval(progressInterval);
  },

  setProgressInterval(interval: NodeJS.Timeout) {
    progressInterval = interval;
  },
};
