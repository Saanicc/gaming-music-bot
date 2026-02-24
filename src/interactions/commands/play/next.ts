import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GuildQueue, Player } from "discord-player";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { getSearchEngine } from "@/utils/helpers/getSearchEngine";
import { getThumbnail } from "@/utils/helpers/utils";
import { joinVoiceChannel } from "@/utils/helpers/joinVoiceChannel";

interface ExecutePlayNextQueryArgs {
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
}: ExecutePlayNextQueryArgs) => {
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

    const track = result.tracks[0];
    queue.insertTrack(track);

    const message = buildMessage({
      title: `Queued at position #1`,
      description: `${getFormattedTrackDescription(track, queue)}`,
      thumbnail: getThumbnail(result.tracks[0]),
      footerText:
        "Not the correct track? Try being more specific or enter a URL",
      color: "queue",
    });

    await interaction.followUp(message);

    const joinError = await joinVoiceChannel({
      interaction,
      queue,
      voiceChannel,
    });

    if (joinError) return;

    await updateUserLevel(interaction, guild.id, "play");

    if (!queue.isPlaying()) await queue.node.play();
  } catch (error) {
    console.error(error);
    await interaction.followUp("❌ Something went wrong while trying to play.");
  }
};
