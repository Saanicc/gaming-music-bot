import { ChatInputCommandInteraction, VoiceBasedChannel } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { GuildQueue, Player } from "discord-player";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { getSearchEngine } from "@/utils/helpers/getSearchEngine";
import { getThumbnail } from "@/utils/helpers/utils";
import { joinVoiceChannel } from "@/utils/helpers/joinVoiceChannel";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";

interface ExecutePlayNextQueryArgs {
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
}: ExecutePlayNextQueryArgs) => {
  const t = useTranslations(interaction.guildId ?? "");

  const guild = voiceChannel.guild;

  try {
    const result = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: getSearchEngine(query),
    });

    if (!result.tracks.length)
      return guardReply(interaction, "NO_RESULTS", "followUp");

    const track = result.tracks[0];
    queue.insertTrack(track);

    const message = buildMessage({
      title: t("commands.play.next.message.title", {
        position: queue.tracks.size.toString(),
      }),
      description: getFormattedTrackDescription(track, queue),
      thumbnail: getThumbnail(result.tracks[0]),
      footerText: t("commands.play.next.message.footerText"),
      color: "queue",
    });

    await interaction.followUp(message);

    const joinError = await joinVoiceChannel({
      interaction,
      queue,
      voiceChannel,
    });

    if (joinError) return;

    await updateUserLevel(interaction, guild.id, "play");

    if (!queue.isPlaying()) await queue.node.play();
  } catch (error) {
    console.error(error);
    return guardReply(interaction, "PLAY_ERROR", "followUp");
  }
};
