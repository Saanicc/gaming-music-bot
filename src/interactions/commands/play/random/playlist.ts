import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { QueryType, Player, GuildQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GENRES } from "@/utils/constants/music-quiz-search-queries";
import { getThumbnail } from "@/utils/helpers/utils";
import { searchSpotifyPlaylists } from "@/src/api/spotify";
import { joinVoiceChannel } from "@/utils/helpers/joinVoiceChannel";
import { guardReply } from "@/utils/helpers/interactionGuard";

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
  try {
    const searchGenre = genre
      ? genre
      : GENRES[Math.floor(Math.random() * GENRES.length)];

    let message;

    const spotifyPlaylists = await searchSpotifyPlaylists(searchGenre);

    if (!spotifyPlaylists.length) {
      return interaction.followUp(
        buildMessage({
          title: "Error",
          description: `Could not find any playlists for genre: ${searchGenre}.`,
          color: "error",
        })
      );
    }

    const playlistUrl =
      spotifyPlaylists[Math.floor(Math.random() * spotifyPlaylists.length)];

    const searchResult = await player.search(playlistUrl, {
      requestedBy: interaction.user,
      searchEngine: QueryType.SPOTIFY_PLAYLIST,
    });

    const playlist = searchResult.playlist;

    if (!playlist) {
      return interaction.followUp(
        buildMessage({
          title: "Error",
          description: `Could not find any playlist for genre: ${searchGenre}.`,
          color: "error",
        })
      );
    }

    let tracks = playlist.tracks;

    if (!tracks.length) {
      return interaction.followUp(
        buildMessage({
          title: "Error",
          description: `Could not find any track(s) to play with genre: ${searchGenre}.`,
          color: "error",
        })
      );
    }

    if (amountOfTracks && amountOfTracks < tracks.length) {
      const maxStart = tracks.length - amountOfTracks;
      const randomStart = Math.floor(Math.random() * (maxStart + 1));
      tracks = tracks.slice(randomStart, randomStart + amountOfTracks);
    }

    queue.addTrack(tracks);
    queue.tracks.shuffle();

    const tracksText = amountOfTracks
      ? `${tracks.length} randomly selected tracks`
      : `${tracks.length} tracks`;

    message = buildMessage({
      title: `Queued`,
      description: `[${playlist.title}](${playlist.url}) with ${tracksText}`,
      thumbnail: getThumbnail(playlist),
      color: "queue",
    });

    const joinError = await joinVoiceChannel({
      interaction,
      queue,
      voiceChannel,
    });

    if (joinError) return;

    if (!queue.node.isPlaying()) {
      await queue.node.play();
    }

    return interaction.followUp(message);
  } catch (error) {
    console.error(error);
    return guardReply(interaction, "PLAY_ERROR", "followUp");
  }
}
