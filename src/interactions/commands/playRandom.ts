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
  .addSubcommand((subcommand) =>
    subcommand
      .setName("playlist")
      .setDescription("Play a random playlist")
      .addStringOption((option) =>
        option
          .setName("genre")
          .setDescription("The genre of music to play.")
          .setRequired(false)
          .addChoices(
            ...GENRES.map((query) => ({
              name: query,
              value: query,
            }))
          )
      )
      .addIntegerOption((option) =>
        option
          .setName("amount")
          .setDescription("Number of tracks to play.")
          .setRequired(false)
          .addChoices(
            ...[10, 20, 30, 40, 50].map((query) => ({
              name: query.toString(),
              value: query,
            }))
          )
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("track")
      .setDescription("Play a random track")
      .addStringOption((option) =>
        option
          .setName("genre")
          .setDescription("The genre of music to play.")
          .setRequired(false)
          .addChoices(
            ...GENRES.map((query) => ({
              name: query,
              value: query,
            }))
          )
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel;
  const subcommand = interaction.options.getSubcommand(true);
  const genre = interaction.options.getString("genre", false);
  const amountOfTracks = interaction.options.getInteger("amount", false);

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

  const searchGenre = genre
    ? genre
    : GENRES[Math.floor(Math.random() * GENRES.length)];

  let message;

  if (subcommand === "playlist") {
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
    let tracks = playlist?.tracks || [];

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
      const randomStart = Math.floor(
        Math.random() * (tracks.length - amountOfTracks)
      );
      tracks = tracks.slice(randomStart, randomStart + amountOfTracks);
    }

    queue.addTrack(tracks);
    queue.tracks.shuffle();

    const tracksText = amountOfTracks
      ? `${tracks.length} randomly selected tracks`
      : `${tracks.length} tracks`;

    message = buildMessage({
      title: `Queued`,
      description: `[${playlist?.title}](${playlist?.url}) with ${tracksText}`,
      thumbnail: getThumbnail(playlist),
      color: "queue",
    });
  } else {
    const searchResult = await player.search(searchGenre, {
      requestedBy: interaction.user,
      searchEngine: QueryType.SPOTIFY_SONG,
    });

    const tracks = searchResult.tracks || [];

    if (!tracks.length) {
      return interaction.followUp(
        buildMessage({
          title: "Error",
          description: `Could not find any track(s) to play for query: ${searchGenre}.`,
          color: "error",
        })
      );
    }

    const track = tracks[Math.floor(Math.random() * tracks.length)];
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
