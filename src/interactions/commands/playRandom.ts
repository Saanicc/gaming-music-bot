import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
} from "discord.js";
import { useMainPlayer, QueryType, useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GENRES } from "@/src/utils/constants/music-quiz-search-queries";
import { getFormattedTrackDescription } from "@/src/utils/helpers/getFormattedTrackDescription";
import { getThumbnail } from "@/src/utils/helpers/utils";
import { searchSpotifyPlaylists } from "@/src/api/spotify";

export const data = new SlashCommandBuilder()
  .setName("play_random")
  .setDescription("Play a random track or playlist")
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Playlist or single track")
      .setRequired(true)
      .addChoices(
        { name: "Playlist", value: "playlist" },
        { name: "Track", value: "track" }
      )
  )
  .addStringOption((option) =>
    option
      .setName("genre")
      .setDescription("The genre of music to play.")
      .addChoices(
        ...GENRES.map((query) => ({
          name: query,
          value: query,
        }))
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;
  const type = interaction.options.getString("type", true);
  const genre = interaction.options.getString("genre", false);

  const player = useMainPlayer();
  let queue = useQueue();

  if (!voiceChannel) {
    return interaction.reply(
      buildMessage({
        title: "Error",
        description: "You must be in a voice channel to play music.",
        color: "error",
        ephemeral: true,
      })
    );
  }

  if (!queue) {
    queue = player.nodes.create(voiceChannel.guild, {
      metadata: { channel: interaction.channel, voiceChannel },
      leaveOnEnd: false,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 15000,
    });
  }

  try {
    if (!queue.connection) await queue.connect(voiceChannel);
  } catch (e) {
    return interaction.reply(
      buildMessage({
        title: "Error",
        description: "Could not join voice channel.",
        color: "error",
      })
    );
  }

  await interaction.deferReply();

  const searchTheme = genre
    ? genre
    : GENRES[Math.floor(Math.random() * GENRES.length)];

  const spotifyPlaylists = await searchSpotifyPlaylists(searchTheme);
  const playlistUrl =
    spotifyPlaylists[Math.floor(Math.random() * spotifyPlaylists.length)];

  const searchResult = await player.search(playlistUrl, {
    requestedBy: interaction.user,
    searchEngine: QueryType.SPOTIFY_PLAYLIST,
  });
  const playlist = searchResult.playlist;

  let message = undefined;

  if (type === "playlist") {
    const tracks = playlist?.tracks || [];

    if (!tracks.length) {
      return interaction.followUp(
        buildMessage({
          title: "Error",
          description: `Could not find playlist for theme: ${searchTheme}.`,
          color: "error",
        })
      );
    }

    queue.addTrack(tracks);
    queue.tracks.shuffle();

    message = buildMessage({
      title: `Queued`,
      description: `[${playlist?.title}](${playlist?.url}) with ${tracks.length} tracks`,
      thumbnail: getThumbnail(playlist),
      color: "queue",
    });
  } else {
    const track =
      playlist?.tracks[Math.floor(Math.random() * playlist.tracks.length)];

    if (!track) {
      return interaction.followUp(
        buildMessage({
          title: "Error",
          description: `Could not find a track for theme: ${searchTheme}.`,
          color: "error",
        })
      );
    }

    queue.addTrack(track);

    message = buildMessage({
      title: `Queued at position #${queue.tracks.size}`,
      description: `${getFormattedTrackDescription(track, queue)}`,
      thumbnail: getThumbnail(track),
      color: "queue",
    });
  }

  if (!queue.node.isPlaying()) {
    queue.node.play();
  }

  return interaction.followUp(message);
}
