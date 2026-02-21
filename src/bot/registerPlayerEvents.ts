import { GuildQueueEvent, Player } from "discord-player";
import {
  MessageCreateOptions,
  MessageEditOptions,
  TextChannel,
} from "discord.js";
import { buildNowPlayingMessage } from "../utils/bot-message/buildNowPlayingMessage";
import { musicPlayerMessage } from "../services/musicPlayerMessage";
import { buildMessage } from "../utils/bot-message/buildMessage";
import { getTrackRequestedByFooterText } from "../utils/helpers/getTrackRequestedByText";
import {
  checkIfTrackInDB,
  isTrackInCache,
} from "../utils/helpers/isTrackInCache";

export const registerPlayerEvents = (player: Player) => {
  player.events.on(GuildQueueEvent.PlayerStart, async (queue, track) => {
    if (queue.metadata.musicQuiz) return;
    const channel = queue.metadata.channel as TextChannel;

    musicPlayerMessage.clearProgressInterval();
    try {
      await musicPlayerMessage.delete();
    } catch (error) {
      console.error(error);
    }

    const inDB = await checkIfTrackInDB(queue.guild.id, track);

    const footerText = await getTrackRequestedByFooterText(
      track.requestedBy,
      queue.guild.id
    );

    const data = buildNowPlayingMessage({
      track,
      isPlaying: true,
      queue,
      footerText,
      isTrackInDB: inDB,
    });
    const msg = await channel.send(data as MessageCreateOptions);
    musicPlayerMessage.set(msg);

    musicPlayerMessage.setProgressInterval(
      setInterval(async () => {
        if (!queue.node.isPlaying()) return;
        if (
          !musicPlayerMessage.get() ||
          musicPlayerMessage.get()?.id !== msg.id
        )
          return;

        const updateData = buildNowPlayingMessage({
          track,
          isPlaying: true,
          queue,
          footerText,
          isTrackInDB: isTrackInCache(queue.guild.id, track.url),
        });
        try {
          await musicPlayerMessage.edit(updateData as MessageEditOptions);
        } catch (err) {
          console.error("Failed to update progress:", err);
        }
      }, 1000)
    );
  });

  player.events.on(GuildQueueEvent.PlayerPause, async (queue) => {
    if (!queue.currentTrack) return;

    const footerText = await getTrackRequestedByFooterText(
      queue.currentTrack.requestedBy,
      queue.guild.id
    );

    await checkIfTrackInDB(queue.guild.id, queue.currentTrack);

    const data = buildNowPlayingMessage({
      track: queue.currentTrack,
      isPlaying: false,
      queue,
      footerText,
      isTrackInDB: isTrackInCache(queue.guild.id, queue.currentTrack.url),
    });

    await musicPlayerMessage.edit(data as MessageEditOptions);
  });

  player.events.on(GuildQueueEvent.QueueDelete, async (queue) => {
    if (queue.metadata.isSwitching) return;

    await musicPlayerMessage.delete();
    musicPlayerMessage.set(undefined);

    const data = buildMessage({
      title: "Left the voice channel",
      color: "default",
    });

    const channel = queue.metadata.channel;
    await channel.send(data as MessageCreateOptions);
  });

  player.events.on(GuildQueueEvent.EmptyQueue, async (queue) => {
    if (queue.metadata.musicQuiz) return;

    const channel = queue.metadata.channel as TextChannel;

    queue.history.clear();

    const data = buildMessage({
      title:
        "Reached the end of the queue. Please queue new track(s) to continue playback.",
      color: "info",
    });

    await channel.send(data as MessageCreateOptions);
  });

  player.events.on(GuildQueueEvent.PlayerError, async (queue, error, track) => {
    const channel = queue.metadata.channel as TextChannel;

    const extractorName = track.extractor?.identifier ?? "Unknown";
    const streamUrl =
      track.raw?.source?.url || track.raw?.url || track.url || "N/A";

    const data = buildMessage({
      title: `⚠️ ${error.name} ⚠️`,
      titleFontSize: "md",
      description: `
        **Message:** ${error.message}

        🎵 **Track:** ${track.title}
        🔗 **URL:** [Open Track](${track.url})
        🧩 **Extractor:** ${extractorName}
        📡 **Stream:** ${streamUrl}
      `,
      color: "error",
    });

    await channel.send(data as MessageCreateOptions);
  });

  player.events.on(GuildQueueEvent.Error, async (queue, error) => {
    const channel = queue.metadata.channel as TextChannel;

    const embed = buildMessage({
      title: `⚠️ ${error.name} ⚠️`,
      titleFontSize: "md",
      description: error.message,
      color: "error",
    });

    await channel.send(embed as MessageCreateOptions);
  });
};
