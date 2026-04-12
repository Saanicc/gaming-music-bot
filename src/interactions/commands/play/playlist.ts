import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  VoiceBasedChannel,
} from "discord.js";
import { GuildQueue, Player, Track } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getSearchEngine, getThumbnail } from "@/utils/helpers/utils";
import { withTasksQueue } from "@/utils/helpers/queue";
import { updateUserLevel } from "@/utils/helpers/user";
import { joinVoiceChannel } from "@/utils/helpers/system";
import { guardReply } from "@/utils/helpers/interactions";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { db } from "@/db";

interface ExecutePlaylistArgs {
  interaction: ChatInputCommandInteraction | ButtonInteraction;
  player: Player;
  voiceChannel: VoiceBasedChannel;
  queue: GuildQueue;
  playlistId: string;
}

export const execute = async ({
  interaction,
  player,
  voiceChannel,
  queue,
  playlistId,
}: ExecutePlaylistArgs) => {
  const t = useTranslations(interaction.guildId ?? "");

  const guild = voiceChannel.guild;

  const playlist = await db.findPlaylistById(
    interaction.guildId ?? "",
    playlistId
  );

  if (!playlist) {
    return guardReply(interaction, "PLAYLIST_NOT_FOUND", "followUp");
  } else if (playlist.trackUrls.length === 0) {
    return guardReply(interaction, "PLAYLIST_EMPTY", "followUp");
  }

  const tracks: Track[] = [];

  for (const url of playlist.trackUrls) {
    const result = await player.search(url, {
      requestedBy: interaction.user,
      searchEngine: getSearchEngine(url),
    });

    if (result.hasTracks()) {
      tracks.push(result.tracks[0]);
    } else {
      console.warn(`⚠️ No playable tracks found for: ${url}`);
    }
  }

  if (tracks.length === 0) {
    return guardReply(interaction, "PLAYLIST_EMPTY", "followUp");
  }

  try {
    await withTasksQueue(queue, async () => {
      queue.addTrack(tracks);

      const joinError = await joinVoiceChannel({
        interaction,
        queue,
        voiceChannel,
      });
      if (joinError) return;

      if (!queue.isPlaying()) await queue.node.play();

      await updateUserLevel(interaction, guild.id, "play");

      const tracksText = t("commands.play.playlist.message.tracks", {
        amount: tracks.length.toString(),
      });

      const data = buildMessage({
        title: t("commands.play.playlist.message.title"),
        description: t("commands.play.playlist.message.description", {
          playlist: playlist.name,
          tracksText,
        }),
        thumbnail: getThumbnail(undefined),
        color: "queue",
      });

      await interaction.followUp(data);
    });
  } catch (error) {
    console.error(error);
    return guardReply(interaction, "PLAY_ERROR", "followUp");
  }
};
