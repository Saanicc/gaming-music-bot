import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { QueryType, Player, GuildQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GENRES } from "@/src/utils/constants/music-quiz-search-queries";
import { getFormattedTrackDescription } from "@/src/utils/helpers/getFormattedTrackDescription";
import { getThumbnail } from "@/src/utils/helpers/utils";
import { joinVoiceChannel } from "@/src/utils/helpers/joinVoiceChannel";

interface ExecuteParams {
  interaction: ChatInputCommandInteraction;
  player: Player;
  queue: GuildQueue;
  voiceChannel: VoiceBasedChannel;
  genre: string | null;
}

export async function execute({
  interaction,
  genre,
  player,
  queue,
  voiceChannel,
}: ExecuteParams) {
  await joinVoiceChannel({
    interaction,
    queue,
    voiceChannel,
  });

  await interaction.deferReply();

  const searchGenre = genre
    ? genre
    : GENRES[Math.floor(Math.random() * GENRES.length)];

  let message;

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

  if (!queue.node.isPlaying()) {
    queue.node.play();
  }

  return interaction.followUp(message);
}
