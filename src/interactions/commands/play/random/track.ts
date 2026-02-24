import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { QueryType, Player, GuildQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GENRES } from "@/utils/constants/music-quiz-search-queries";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { getThumbnail } from "@/utils/helpers/utils";
import { joinVoiceChannel } from "@/utils/helpers/joinVoiceChannel";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { t } from "@/src/ui/translations";

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
  try {
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
          title: t("en-US", "commands.play.random.track.messages.errorTitle"),
          description: t("en-US", "commands.play.random.track.messages.error", {
            searchGenre,
          }),
          color: "error",
        })
      );
    }

    const track = tracks[Math.floor(Math.random() * tracks.length)];
    queue.addTrack(track);

    message = buildMessage({
      title: t("en-US", "commands.play.random.track.messages.title", {
        position: queue.tracks.size.toString(),
      }),
      description: getFormattedTrackDescription(track, queue),
      thumbnail: getThumbnail(track),
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
