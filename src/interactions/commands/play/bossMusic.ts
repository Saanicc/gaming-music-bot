import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  VoiceBasedChannel,
} from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getRandomFightGif } from "@/utils/helpers/getRandomFightingGif";
import { queueManager } from "@/services/queueManager";
import { savePreviousQueue } from "@/utils/helpers/saveQueueData";
import { getBossTracks } from "@/utils/helpers/getBossTracks";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { emoji } from "@/utils/constants/emojis";
import { Player, useQueue } from "discord-player";
import { joinVoiceChannel } from "@/utils/helpers/joinVoiceChannel";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";

interface ExecuteBossMusicArgs {
  interaction: ChatInputCommandInteraction | ButtonInteraction;
  player: Player;
  voiceChannel: VoiceBasedChannel;
}

export const execute = async ({
  interaction,
  player,
  voiceChannel,
}: ExecuteBossMusicArgs) => {
  const t = useTranslations(interaction.guildId ?? "");

  const guild = voiceChannel.guild;

  const queue = useQueue();

  if (queue) {
    await savePreviousQueue(queue, guild.id);
    queue.node.stop();
    (queue.metadata as any).isSwitching = true;
    queue.delete();
  }

  const newQueue = player.nodes.create(guild, {
    metadata: {
      textChannel: interaction.channel,
      voiceChannel,
    },
    leaveOnEnd: false,
    leaveOnEmpty: true,
    leaveOnEmptyCooldown: 15000,
  });

  try {
    const tracks = await getBossTracks("song", player, interaction.user);
    const hornTracks = await getBossTracks("horn", player, interaction.user);

    const pickRandomHornTrack = () => {
      const number = Math.floor(Math.random() * hornTracks.length);
      return hornTracks[number];
    };

    newQueue.addTrack(tracks);
    newQueue.tracks.shuffle();
    newQueue.insertTrack(pickRandomHornTrack());

    queueManager.setQueueType("boss");

    const data = buildMessage({
      title: t("commands.play.boss.music.message.title", {
        emoji: emoji.fight,
      }),
      titleFontSize: "lg",
      imageUrl: await getRandomFightGif(),
      color: "bossMode",
    });

    const joinError = await joinVoiceChannel({
      interaction,
      queue: newQueue,
      voiceChannel,
    });
    if (joinError) return;

    if (!newQueue.isPlaying()) await newQueue.node.play();

    await updateUserLevel(interaction, guild.id, "play_boss_music");

    await interaction.followUp(data);
  } catch (error) {
    console.error(error);
    return guardReply(interaction, "PLAY_ERROR", "followUp");
  }
};
