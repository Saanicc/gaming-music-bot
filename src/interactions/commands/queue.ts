import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { emoji } from "@/utils/constants/emojis";

export const data = new SlashCommandBuilder()
  .setName("queue")
  .setDescription("Display the current queue");

export async function execute(
  interaction: ChatInputCommandInteraction | ButtonInteraction
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

  const currentTrack = queue.currentTrack;

  const getUpcomingTracks = () => {
    const tracks = queue.tracks.data;

    if (tracks.length === 0) return "Queue is empty";

    const upcomingTracks = tracks.slice(0, 5);

    return upcomingTracks
      .map(
        (track, index) =>
          `${index + 1}. ${getFormattedTrackDescription(track, queue)}`
      )
      .join("\n");
  };

  const data = buildMessage({
    title: `${emoji.play} Now Playing`,
    description: `
${getFormattedTrackDescription(currentTrack, queue)}
    
**Upcoming Tracks:**
${getUpcomingTracks()}
    `,
    color: "queue",
    ephemeral: true,
  });

  return interaction.reply(data);
}
