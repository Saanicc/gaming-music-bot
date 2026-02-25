import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  InteractionUpdateOptions,
  SlashCommandBuilder,
} from "discord.js";
import { useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { emoji } from "@/utils/constants/emojis";
import { getThumbnail } from "@/utils/helpers/utils";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const data = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("Display the current queue");

const TRACKS_PER_PAGE = 10;

export async function execute(
  interaction: ChatInputCommandInteraction | ButtonInteraction
) {
  const t = useTranslations(interaction.guildId ?? "");

  await renderQueue(interaction, 1, "reply", t);
}

export async function renderQueue(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  page: number,
  mode: "reply" | "update" = "reply",
  t: ReturnType<typeof useTranslations>
) {
  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE");

  const tracks = queue.tracks.data;
  const currentTrack = queue.currentTrack;
  const totalTracks = tracks.length;
  const totalPages = Math.ceil(totalTracks / TRACKS_PER_PAGE) || 1;

  page = Math.max(1, Math.min(page, totalPages));

  const startIdx = (page - 1) * TRACKS_PER_PAGE;
  const endIdx = startIdx + TRACKS_PER_PAGE;
  const upcomingTracks = tracks.slice(startIdx, endIdx);

  const tracksList = upcomingTracks.length
    ? upcomingTracks
        .map(
          (track, index) =>
            `${startIdx + index + 1}. ${getFormattedTrackDescription(
              track,
              queue
            )}`
        )
        .join("\n")
    : t("commands.queue.message.noUpcomingTracks");

  const footerText = t("commands.queue.message.footerText", {
    page: page.toString(),
    totalPages: totalPages.toString(),
    totalTracks: totalTracks.toString(),
    totalDuration: queue.durationFormatted,
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`queue:first:1`)
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId(`queue:prev:${Math.max(1, page - 1)}`)
      .setEmoji(emoji.previous)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === 1),
    new ButtonBuilder()
      .setCustomId(`queue:next:${Math.min(totalPages, page + 1)}`)
      .setEmoji(emoji.next)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages),
    new ButtonBuilder()
      .setCustomId(`queue:last:${totalPages}`)
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(page === totalPages),
    new ButtonBuilder()
      .setCustomId("queue:stop")
      .setEmoji(emoji.stop)
      .setStyle(ButtonStyle.Danger)
  );

  const data = buildMessage({
    title: `${emoji.play} ${t("commands.queue.message.nowPlaying")}`,
    thumbnail: getThumbnail(currentTrack),
    description: `
${getFormattedTrackDescription(currentTrack, queue)}

### ${t("commands.queue.message.upcomingTracks", {
      emoji: emoji.queue,
    })}
${tracksList}
    `,
    color: "queue",
    footerText,
    actionRowBuilder: [row],
  });

  if (mode === "update" && interaction.isButton()) {
    return interaction.update(data as InteractionUpdateOptions);
  }

  return interaction.reply(data);
}
