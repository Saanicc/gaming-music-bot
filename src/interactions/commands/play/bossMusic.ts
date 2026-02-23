import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  Guild,
  TextChannel,
  VoiceBasedChannel,
} from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getRandomFightGif } from "@/utils/helpers/getRandomFightingGif";
import { queueManager } from "@/services/queueManager";
import { savePreviousQueue } from "@/utils/helpers/saveQueueData";
import { getBossTracks } from "@/utils/helpers/getBossTracks";
import { delay } from "@/utils/helpers/utils";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { emoji } from "@/utils/constants/emojis";
import { GuildQueue, Player } from "discord-player";
import { joinVoiceChannel } from "@/src/utils/helpers/joinVoiceChannel";

interface ExecuteBossMusicArgs {
  interaction: ChatInputCommandInteraction | ButtonInteraction;
  player: Player;
  queue: GuildQueue;
  voiceChannel: VoiceBasedChannel;
}

export const execute = async ({
  interaction,
  player,
  queue,
  voiceChannel,
}: ExecuteBossMusicArgs) => {
  await joinVoiceChannel({
    interaction,
    queue,
    voiceChannel,
  });

  await interaction.deferReply();

  const guild = voiceChannel.guild;

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
      title: `${emoji.fight} Time to slay some enemies! ${emoji.fight}`,
      titleFontSize: "lg",
      imageUrl: await getRandomFightGif(),
      color: "bossMode",
    });

    updateUserLevel(interaction, guild.id, "play_boss_music");

    await delay(500);

    if (!newQueue.isPlaying()) await newQueue.node.play();

    await interaction.followUp(data);
  } catch (err) {
    console.error(err);
    await (interaction.channel as TextChannel).send(
      "❌ Something went wrong while trying to play."
    );
  }
};
