import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { GuildQueue, Player } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/track";
import { updateUserLevel } from "@/utils/helpers/user";
import { getSearchEngine, getThumbnail } from "@/utils/helpers/utils";
import { joinVoiceChannel } from "@/utils/helpers/system";
import { guardReply } from "@/utils/helpers/interactions";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { withTasksQueue, isTrackInQueue } from "@/utils/helpers/queue";

interface ExecutePlayNowQueryArgs {
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
}: ExecutePlayNowQueryArgs) => {
  const t = useTranslations(interaction.guildId ?? "");
  const guild = voiceChannel.guild;

  try {
    const result = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: getSearchEngine(query),
    });

    if (!result.tracks.length)
      return guardReply(interaction, "NO_RESULTS", "editReply");

    const track = result.tracks[0];

    if (isTrackInQueue(queue, track.url))
      return guardReply(interaction, "DUPLICATE_TRACK", "editReply");

    const joinResult = await withTasksQueue(queue, async () => {
      const joinError = await joinVoiceChannel({
        interaction,
        queue,
        voiceChannel,
      });
      if (joinError) return false;

      queue.insertTrack(track);

      if (!queue.isPlaying()) await queue.node.play();
      else queue.node.skip();

      return buildMessage({
        title: t("commands.play.now.message.title"),
        description: getFormattedTrackDescription(track, queue),
        thumbnail: getThumbnail(track),
        footerText: t("commands.play.now.message.footerText"),
        color: "queue",
      });
    });

    if (joinResult === false) return;

    await updateUserLevel(interaction, guild.id, "play");

    return await interaction.followUp(joinResult);
  } catch (error) {
    console.error(error);
    return guardReply(interaction, "PLAY_ERROR", "followUp");
  }
};
