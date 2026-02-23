import {
  ChatInputCommandInteraction,
  Guild,
  VoiceBasedChannel,
} from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { getSearchEngine } from "@/utils/helpers/getSearchEngine";
import { getThumbnail } from "@/utils/helpers/utils";
import { Player, GuildQueue } from "discord-player";
import { joinVoiceChannel } from "@/src/utils/helpers/joinVoiceChannel";

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
  await joinVoiceChannel({
    interaction,
    queue,
    voiceChannel,
  });

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
      return interaction.reply(data);
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

    interaction.reply(message);

    await updateUserLevel(interaction, guild.id, "play");

    if (!queue.isPlaying()) await queue.node.play();
  } catch (error) {
    console.error(error);
  }
};
