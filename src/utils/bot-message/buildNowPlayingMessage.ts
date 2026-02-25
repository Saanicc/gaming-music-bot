import { GuildQueue, QueueRepeatMode, Track } from "discord-player";

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageCreateOptions,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";
import { victoryButton } from "@/interactions/buttons/victory";
import { bossMusicButton } from "@/interactions/buttons/playBossMusic";
import { stopButton } from "@/interactions/buttons/stop";
import { colors } from "../constants/colors";
import { queueManager } from "@/services/queueManager";
import { pauseButton } from "@/interactions/buttons/pause";
import { resumeButton } from "@/interactions/buttons/resume";
import { getFormattedTrackDescription } from "../helpers/getFormattedTrackDescription";
import { queueButton } from "@/interactions/buttons/queue";
import { nextButton } from "@/interactions/buttons/next";
import { previousButton } from "@/interactions/buttons/previous";
import { emoji } from "../constants/emojis";
import { getThumbnail } from "../helpers/utils";
import { addTrackButton } from "@/interactions/buttons/addTrack";
import { loopTrackButton } from "@/interactions/buttons/loopTrack";
import { loopQueueButton } from "@/interactions/buttons/loopQueue";
import { useTranslations } from "@/utils/hooks/useTranslations";

type NowPlayingMessageProps = {
  track: Track;
  isPlaying: boolean;
  queue: GuildQueue;
  footerText: string;
  isTrackInDB: boolean;
};

const createProgressBar = (queue: GuildQueue, size = 16) => {
  return queue.node.createProgressBar({
    indicator: "▰",
    leftChar: "▰",
    rightChar: "▱",
    length: size,
    timecodes: false,
  });
};

export const buildNowPlayingMessage = ({
  track,
  isPlaying,
  queue,
  footerText,
  isTrackInDB,
}: NowPlayingMessageProps): MessageCreateOptions => {
  const t = useTranslations(queue.guild.id ?? "");

  const isBossQueue =
    (isPlaying || !isPlaying) && queueManager.getQueueType() === "boss";

  const repeatMode = queue.repeatMode;

  const loopTrack = loopTrackButton
    .setDisabled(!isPlaying)
    .setStyle(
      repeatMode === QueueRepeatMode.TRACK
        ? ButtonStyle.Primary
        : ButtonStyle.Secondary
    );

  const loopQueue = loopQueueButton
    .setDisabled(!isPlaying)
    .setStyle(
      repeatMode === QueueRepeatMode.QUEUE
        ? ButtonStyle.Primary
        : ButtonStyle.Secondary
    );

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    isPlaying ? pauseButton : resumeButton,
    previousButton.setDisabled(queue?.history.previousTrack ? false : true),
    nextButton.setDisabled(queue?.history.nextTrack ? false : true),
    stopButton,
    queueButton
  );
  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    isBossQueue ? victoryButton : bossMusicButton,
    loopTrack,
    loopQueue,
    addTrackButton.setDisabled(isTrackInDB)
  );

  const progressBar = queue ? createProgressBar(queue) : "N/A";

  const container = new ContainerBuilder();

  const trackInfoText = new TextDisplayBuilder().setContent(`
### ${isPlaying ? t("player.nowPlaying", { emoji: emoji.play }) : t("player.paused", { emoji: emoji.pause })}  
${getFormattedTrackDescription(track, queue)}

**${t("player.progress")}**
${progressBar}
`);

  const requestedByText = new TextDisplayBuilder().setContent(
    `-# ${footerText}`
  );

  const thumbnail = new ThumbnailBuilder().setURL(getThumbnail(track));

  const headerSection = new SectionBuilder()
    .addTextDisplayComponents(trackInfoText)
    .setThumbnailAccessory(thumbnail);

  container.addSectionComponents(headerSection);

  if (queue) {
    const currentTrackNumber = queue.history.tracks.size + 1;
    const totalQueueNumber = queue.tracks.size + currentTrackNumber;

    const queueText = new TextDisplayBuilder().setContent(`
${t("player.track")}
${t("player.trackNumber", { current: currentTrackNumber.toString(), total: totalQueueNumber.toString() })}
    `);

    container.addTextDisplayComponents(queueText);
  }

  const separator = new SeparatorBuilder();

  container.addSeparatorComponents(separator);
  container.addActionRowComponents(row, row2);
  container.addSeparatorComponents(separator);
  container.addTextDisplayComponents(requestedByText);
  container.setAccentColor(
    isPlaying && !isBossQueue
      ? colors.nowPlaying
      : isPlaying && isBossQueue
        ? colors.bossMode
        : colors.paused
  );

  return {
    flags: MessageFlags.IsComponentsV2,
    components: [container],
    allowedMentions: { repliedUser: false },
  };
};
