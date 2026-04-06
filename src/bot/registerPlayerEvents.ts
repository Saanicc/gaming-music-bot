import { GuildQueueEvent, Player } from "discord-player";
import { MessageCreateOptions, TextChannel } from "discord.js";
import { musicPlayerMessage } from "../services/musicPlayerMessage";
import { buildMessage } from "../utils/bot-message/buildMessage";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const registerPlayerEvents = (player: Player) => {
  player.events.on(GuildQueueEvent.PlayerStart, async (queue, track) => {
    if (queue.metadata.musicQuiz) return;

    musicPlayerMessage.clearProgressInterval();
    await musicPlayerMessage.delete().catch(() => {});
    musicPlayerMessage.build({
      queue,
      track,
      isPlaying: true,
      shouldUpdateProgress: true,
    });
  });

  player.events.on(GuildQueueEvent.PlayerFinish, async () => {
    musicPlayerMessage.clearProgressInterval();
  });

  player.events.on(GuildQueueEvent.PlayerResume, async (queue) => {
    if (!queue.currentTrack) return;

    musicPlayerMessage.build({
      queue,
      track: queue.currentTrack,
      isPlaying: true,
      shouldUpdateProgress: true,
    });
  });

  player.events.on(GuildQueueEvent.PlayerPause, async (queue) => {
    if (!queue.currentTrack) return;

    musicPlayerMessage.build({
      queue,
      track: queue.currentTrack,
      isPlaying: false,
    });
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
    musicPlayerMessage.buildAndEdit(queue, false);

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
