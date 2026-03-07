import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { getSearchEngine } from "@/utils/helpers/getSearchEngine";
import { getThumbnail } from "@/utils/helpers/utils";
import { Player, GuildQueue } from "discord-player";
import { joinVoiceChannel } from "@/utils/helpers/joinVoiceChannel";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { withTasksQueue } from "@/utils/helpers/withTasksQueue";

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
      if (joinError) return false;

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
        queue.addTrack(track);

        message = buildMessage({
          title: t("commands.play.query.message.title.track", {
            position: queue.tracks.size.toString(),
          }),
          description: getFormattedTrackDescription(track, queue),
          thumbnail: getThumbnail(result.tracks[0]),
          footerText: t("commands.play.query.message.footerText"),
          color: "queue",
        });
      }

      await updateUserLevel(interaction, guild.id, "play");

      if (!queue.isPlaying()) await queue.node.play();

      return message;
    });

    if (joinResult === false) return;

    return await interaction.followUp(joinResult);
  } catch (error) {
    console.error(error);
    return guardReply(interaction, "PLAY_ERROR", "followUp");
  }
};
