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

export const data = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("Display the current queue");

const TRACKS_PER_PAGE = 10;

export async function execute(
  interaction: ChatInputCommandInteraction | ButtonInteraction
) {
  await renderQueue(interaction, 1, "reply");
}

export async function renderQueue(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  page: number,
  mode: "reply" | "update" = "reply"
) {
  const queue = useQueue();

  if (!queue) {
    const data = buildMessage({
      title: "This server does not have an active player session.",
      ephemeral: true,
      color: "info",
    });
    return interaction.reply(data);
  }

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
    : "No upcoming tracks in queue.";

  const footerText = `Page ${page}/${totalPages}  •  Tracks in queue: ${totalTracks}  •  Total duration: ${queue.durationFormatted}`;

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
    title: `${emoji.play} Now Playing`,
    thumbnail: getThumbnail(currentTrack),
    description: `
${getFormattedTrackDescription(currentTrack, queue)}

**Upcoming Tracks:**
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
