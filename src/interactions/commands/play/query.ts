import {
  ChatInputCommandInteraction,
  InteractionResponse,
  Message,
  VoiceBasedChannel,
} from "discord.js";
import { Player, GuildQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/track";
import { updateUserLevel } from "@/utils/helpers/user";
import { getSearchEngine, getThumbnail } from "@/utils/helpers/utils";
import { joinVoiceChannel } from "@/utils/helpers/system";
import { guardReply } from "@/utils/helpers/interactions";
import { useTranslations } from "@/utils/hooks/useTranslations";
import {
  withTasksQueue,
  getQueuePosition,
  isTrackInQueue,
} from "@/utils/helpers/queue";

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
  const t = useTranslations(interaction.guildId ?? "");

  const guild = voiceChannel.guild;

  try {
    const result = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: getSearchEngine(query),
    });

    if (!result.tracks.length)
      return guardReply(interaction, "NO_RESULTS", "followUp");

    const joinResult = await withTasksQueue(queue, async () => {
      const joinError = await joinVoiceChannel({
        interaction,
        queue,
        voiceChannel,
      });
      if (joinError) return "FAILED";

      let message;

      if (result.hasPlaylist()) {
        queue.addTrack(result.playlist?.tracks ?? []);

        message = buildMessage({
          title: t("commands.play.query.message.title.playlist"),
          description: t("commands.play.query.message.description", {
            track: result.playlist?.title ?? "",
            url: result.playlist?.url ?? "",
            amount: result.playlist?.tracks.length.toString() ?? "",
          }),
          thumbnail: getThumbnail(result.playlist),
          footerText: t("commands.play.query.message.footerText"),
          color: "queue",
        });
      } else {
        const track = result.tracks[0];

        if (isTrackInQueue(queue, track.url)) return "DUPLICATE_TRACK";

        queue.addTrack(track);

        message = buildMessage({
          title: t("commands.play.query.message.title.track", {
            position: getQueuePosition(queue),
          }),
          description: getFormattedTrackDescription(track, queue),
          thumbnail: getThumbnail(track),
          footerText: t("commands.play.query.message.footerText"),
          color: "queue",
        });
      }

      if (!queue.isPlaying()) await queue.node.play();

      return message;
    });

    switch (joinResult) {
      case "FAILED":
        return;
      case "DUPLICATE_TRACK":
        return guardReply(interaction, "DUPLICATE_TRACK", "editReply");
      default: {
        await updateUserLevel(interaction, guild.id, "play");
        return interaction.followUp(joinResult);
      }
    }
  } catch (error) {
    console.error(error);
    return guardReply(interaction, "PLAY_ERROR", "followUp");
  }
};
