import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { Player, GuildQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GENRES } from "@/utils/constants/music-quiz-search-queries";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { getThumbnail } from "@/utils/helpers/utils";
import { joinVoiceChannel } from "@/utils/helpers/joinVoiceChannel";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { withTasksQueue } from "@/utils/helpers/withTasksQueue";
import { getQueuePosition } from "@/utils/helpers/getQueuePosition";
import { DeezerExtractor } from "discord-player-deezer";

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
  const t = useTranslations(interaction.guildId ?? "");

  try {
    const searchGenre = genre
      ? genre
      : GENRES[Math.floor(Math.random() * GENRES.length)];

    const searchResult = await player.search(searchGenre, {
      requestedBy: interaction.user,
      searchEngine: `ext:${DeezerExtractor.identifier}`,
    });

    const tracks = searchResult.tracks || [];

    if (!tracks.length) {
      return interaction.followUp(
        buildMessage({
          title: t("commands.play.random.track.message.errorTitle"),
          description: t("commands.play.random.track.message.error", {
            genre: searchGenre,
          }),
          color: "error",
        })
      );
    }

    const track = tracks[Math.floor(Math.random() * tracks.length)];

    const result = await withTasksQueue(queue, async () => {
      const joinError = await joinVoiceChannel({
        interaction,
        queue,
        voiceChannel,
      });

      if (joinError) return false;

      queue.addTrack(track);

      if (!queue.node.isPlaying()) {
        await queue.node.play();
      }

      return buildMessage({
        title: t("commands.play.random.track.message.title", {
          position: getQueuePosition(queue),
        }),
        description: getFormattedTrackDescription(track, queue),
        thumbnail: getThumbnail(track),
        color: "queue",
      });
    });

    if (result === false) return;

    await updateUserLevel(interaction, queue.guild.id, "play");

    return await interaction.followUp(result);
  } catch (error) {
    console.error(error);
    return guardReply(interaction, "PLAY_ERROR", "followUp");
  }
}
