import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { QueryType, Player, GuildQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GENRES } from "@/utils/constants/music-quiz-search-queries";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { getThumbnail } from "@/utils/helpers/utils";
import { joinVoiceChannel } from "@/utils/helpers/joinVoiceChannel";

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

  await joinVoiceChannel({
    interaction,
    queue,
    voiceChannel,
  });

  if (!queue.node.isPlaying()) {
    await queue.node.play();
  }

  return interaction.followUp(message);
}
