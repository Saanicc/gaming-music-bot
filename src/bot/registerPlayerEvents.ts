import { GuildQueueEvent, Player } from "discord-player";
import {
  MessageCreateOptions,
  MessageEditOptions,
  TextChannel,
} from "discord.js";
import { buildNowPlayingMessage } from "../utils/bot-message/buildNowPlayingMessage";
import { musicPlayerMessage } from "../services/musicPlayerMessage";
import { buildMessage } from "../utils/bot-message/buildMessage";
import {
  getTrackRequestedByFooterText,
  checkIfTrackInDB,
  isTrackInCache,
} from "../utils/helpers/track";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const registerPlayerEvents = (player: Player) => {
  player.events.on(GuildQueueEvent.PlayerStart, async (queue, track) => {
    if (queue.metadata.musicQuiz) return;
    const channel = queue.metadata.textChannel as TextChannel;

    musicPlayerMessage.clearProgressInterval();
    await musicPlayerMessage.delete().catch(() => {});

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

        await musicPlayerMessage
          .edit(updateData as MessageEditOptions)
          .catch(() => {});
      }, 1000)
    );
  });

  player.events.on(GuildQueueEvent.PlayerFinish, async () => {
    musicPlayerMessage.clearProgressInterval();
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
    musicPlayerMessage.clearProgressInterval();
    if (queue.metadata.isSwitching) return;

    const t = useTranslations(queue.guild.id);

    await musicPlayerMessage.delete();
    musicPlayerMessage.set(undefined);

    const data = buildMessage({
      title: t("common.leftVoiceChat"),
      color: "default",
    });

    const channel = queue.metadata.textChannel;
    await channel.send(data as MessageCreateOptions);
  });

  player.events.on(GuildQueueEvent.EmptyQueue, async (queue) => {
    if (queue.metadata.musicQuiz) return;
    musicPlayerMessage.clearProgressInterval();

    const t = useTranslations(queue.guild.id);

    const channel = queue.metadata.textChannel as TextChannel;

    queue.history.clear();

    const data = buildMessage({
      title: t("common.emptyQueue"),
      color: "info",
    });

    await channel.send(data as MessageCreateOptions);
  });

  player.events.on(GuildQueueEvent.PlayerError, async (queue, error, track) => {
    musicPlayerMessage.clearProgressInterval();
    const t = useTranslations(queue.guild.id);
    const channel = queue.metadata.textChannel as TextChannel;

    let message;

    if (error.message === "Could not extract stream for this track") {
      message = buildMessage({
        title: t("player.error.extractStream"),
        color: "error",
      });
    } else {
      message = buildMessage({
        title: error.name,
        description: error.message,
        color: "error",
      });
    }

    const msg = await channel.send(message as MessageCreateOptions);
    setTimeout(() => msg.delete(), 5000);
  });

  player.events.on(GuildQueueEvent.Error, async (queue, error) => {
    musicPlayerMessage.clearProgressInterval();
    const channel = queue.metadata.textChannel as TextChannel;

    const embed = buildMessage({
      title: `⚠️ ${error.name} ⚠️`,
      titleFontSize: "md",
      description: error.message,
      color: "error",
    });

    await channel.send(embed as MessageCreateOptions);
  });
};
