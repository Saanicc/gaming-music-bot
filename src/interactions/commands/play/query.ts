import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { getSearchEngine } from "@/utils/helpers/getSearchEngine";
import { getThumbnail } from "@/utils/helpers/utils";
import { Player, GuildQueue } from "discord-player";
import { joinVoiceChannel } from "@/utils/helpers/joinVoiceChannel";

interface ExecutePlayQueryArgs {
  interaction: ChatInputCommandInteraction;
  player: Player;
  queue: GuildQueue;
  query: string;
  voiceChannel: VoiceBasedChannel;
}

export const execute = async ({
  interaction,
  player,
  queue,
  query,
  voiceChannel,
}: ExecutePlayQueryArgs) => {
  const guild = voiceChannel.guild;

  try {
    const result = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: getSearchEngine(query),
    });

    if (!result.tracks.length) {
      const data = buildMessage({
        title: "❌ No results found.",
      });
      return interaction.followUp(data);
    }

    let message = null;

    if (result.hasPlaylist()) {
      queue.addTrack(result.playlist?.tracks ?? []);

      message = buildMessage({
        title: `Queued`,
        description: `[${result.playlist?.title}](${result.playlist?.url}) with ${result.playlist?.tracks.length} tracks`,
        thumbnail: getThumbnail(result.playlist),
        footerText:
          "Not the correct track? Try being more specific or enter a URL",
        color: "queue",
      });
    } else {
      const track = result.tracks[0];
      queue.addTrack(track);

      message = buildMessage({
        title: `Queued at position #${queue.tracks.size}`,
        description: `${getFormattedTrackDescription(track, queue)}`,
        thumbnail: getThumbnail(result.tracks[0]),
        footerText:
          "Not the correct track? Try being more specific or enter a URL",
        color: "queue",
      });
    }

    const joinError = await joinVoiceChannel({
      interaction,
      queue,
      voiceChannel,
    });

    if (joinError) return;

    await updateUserLevel(interaction, guild.id, "play");

    if (!queue.isPlaying()) await queue.node.play();

    await interaction.followUp(message);
  } catch (error) {
    console.error(error);
    await interaction.followUp("❌ Something went wrong while trying to play.");
  }
};
