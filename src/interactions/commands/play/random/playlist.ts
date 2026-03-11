import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { Player, GuildQueue } from "discord-player";
import { getThumbnail, getSearchEngine } from "@/utils/helpers/utils";
import { GENRES } from "@/utils/constants/music-quiz-search-queries";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { joinVoiceChannel } from "@/utils/helpers/system";
import { guardReply } from "@/utils/helpers/interactions";
import { withTasksQueue } from "@/utils/helpers/queue";
import { searchDeezerPlaylists } from "@/api/deezer";

interface ExecuteParams {
  interaction: ChatInputCommandInteraction;
  player: Player;
  queue: GuildQueue;
  voiceChannel: VoiceBasedChannel;
  genre: string | null;
  amountOfTracks: number | null;
}

export async function execute({
  interaction,
  genre,
  amountOfTracks,
  player,
  queue,
  voiceChannel,
}: ExecuteParams) {
  const t = useTranslations(interaction.guildId ?? "");

  try {
    const searchGenre = genre
      ? genre
      : GENRES[Math.floor(Math.random() * GENRES.length)];

    const playlists = await searchDeezerPlaylists(searchGenre);

    if (!playlists.length) {
      return interaction.followUp(
        buildMessage({
          title: t("common.error"),
          description: t("commands.play.random.playlist.message.error", {
            genre: searchGenre,
          }),
          color: "error",
        })
      );
    }

    const playlistUrl = playlists[Math.floor(Math.random() * playlists.length)];

    const searchResult = await player.search(playlistUrl, {
      requestedBy: interaction.user,
      searchEngine: getSearchEngine(playlistUrl),
    });

    const playlist = searchResult.playlist;

    if (!playlist) {
      return interaction.followUp(
        buildMessage({
          title: t("common.error"),
          description: t("commands.play.random.playlist.message.error", {
            genre: searchGenre,
          }),
          color: "error",
        })
      );
    }

    let tracks = playlist.tracks;

    if (!tracks.length) {
      return interaction.followUp(
        buildMessage({
          title: t("common.error"),
          description: t("commands.play.random.track.message.error", {
            genre: searchGenre,
          }),
          color: "error",
        })
      );
    }

    if (amountOfTracks && amountOfTracks < tracks.length) {
      const maxStart = tracks.length - amountOfTracks;
      const randomStart = Math.floor(Math.random() * (maxStart + 1));
      tracks = tracks.slice(randomStart, randomStart + amountOfTracks);
    }

    const result = await withTasksQueue(queue, async () => {
      const joinError = await joinVoiceChannel({
        interaction,
        queue,
        voiceChannel,
      });

      if (joinError) return false;

      queue.addTrack(tracks);
      queue.tracks.shuffle();

      if (!queue.node.isPlaying()) {
        await queue.node.play();
      }

      const tracksText = amountOfTracks
        ? t("commands.play.random.playlist.message.randomlySelectedTracks", {
            amount: tracks.length.toString(),
          })
        : t("commands.play.random.playlist.message.tracks", {
            amount: tracks.length.toString(),
          });

      return buildMessage({
        title: t("commands.play.random.playlist.message.title"),
        description: t("commands.play.random.playlist.message.description", {
          playlist: playlist.title,
          url: playlist.url,
          tracksText,
        }),
        thumbnail: getThumbnail(playlist),
        color: "queue",
      });
    });

    if (result === false) return;

    return await interaction.followUp(result);
  } catch (error) {
    console.error(error);
    return guardReply(interaction, "PLAY_ERROR", "followUp");
  }
}
