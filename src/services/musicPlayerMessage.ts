import {
  Message,
  MessageCreateOptions,
  MessageEditOptions,
  MessagePayload,
  TextChannel,
} from "discord.js";
import { GuildQueue, Track } from "discord-player";
import { buildNowPlayingMessage } from "../utils/bot-message/buildNowPlayingMessage";
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

interface SharedState {
  queue: GuildQueue;
  track: Track;
  footerText: string;
  isPlaying: boolean;
}

class MusicPlayerMessageService {
  private nowPlayingMessage?: Message;
  private progressInterval?: NodeJS.Timeout;
  private sharedState?: SharedState;
  private readonly progressUpdateIntervalMs = 2000;

  set(message?: Message) {
    this.nowPlayingMessage = message;
  }

  get() {
    return this.nowPlayingMessage;
  }

  async edit(data: string | MessageEditOptions | MessagePayload) {
    if (!this.nowPlayingMessage) return;

    await this.nowPlayingMessage.edit(data).catch(() => {});
  }

  async delete() {
    if (!this.nowPlayingMessage) return;

    await this.nowPlayingMessage.delete().catch(() => {});
    this.nowPlayingMessage = undefined;
    this.sharedState = undefined;
  }

  async build({
    queue,
    track,
    isPlaying,
    shouldUpdateProgress = false,
  }: BuildParams) {
    const channel = queue.metadata.textChannel as TextChannel;
    if (!channel) return;

    const [isTrackInDB, footerText] = await Promise.all([
      checkIfTrackInDB(queue.guild.id, track),
      getTrackRequestedByFooterText(track.requestedBy, queue.guild.id),
    ]);

    this.sharedState = { queue, track, footerText, isPlaying };

    const messageData = buildNowPlayingMessage({
      track,
      isPlaying,
      queue,
      footerText,
      isTrackInDB,
    });

    if (this.nowPlayingMessage) {
      await this.edit(messageData as MessageEditOptions);
    } else {
      try {
        this.nowPlayingMessage = await channel.send(
          messageData as MessageCreateOptions
        );
      } catch (error) {
        console.error("Failed to send player message:", error);
      }
    }

    this.clearProgressInterval();

    if (shouldUpdateProgress) {
      this.progressInterval = setInterval(async () => {
        await this.buildAndEdit();
      }, this.progressUpdateIntervalMs);
    }
  }

  async buildAndEdit(updatedQueue?: GuildQueue, updatedIsPlaying?: boolean) {
    if (!this.sharedState || !this.nowPlayingMessage) return;

    const { queue, track, isPlaying, footerText } = this.sharedState;

    const messageData = buildNowPlayingMessage({
      track,
      isPlaying: updatedIsPlaying ?? isPlaying,
      queue: updatedQueue ?? queue,
      footerText,
      isTrackInDB: isTrackInCache(queue.guild.id, track.url),
    });

    await this.edit(messageData as MessageEditOptions);
  }

  clearProgressInterval() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = undefined;
    }
  }
}

export const musicPlayerMessage = new MusicPlayerMessageService();
