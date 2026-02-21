import {
  ButtonInteraction,
  CommandInteraction,
  SlashCommandBuilder,
  TextChannel,
} from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getRandomFightGif } from "@/utils/helpers/getRandomFightingGif";
import { queueManager } from "@/services/queueManager";
import { savePreviousQueue } from "@/utils/helpers/saveQueueData";
import { getBossTracks } from "@/utils/helpers/getBossTracks";
import { useMainPlayer, useQueue } from "discord-player";
import { delay } from "@/utils/helpers/utils";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { emoji } from "@/utils/constants/emojis";

export const data = new SlashCommandBuilder()
  .setName("play_boss_music")
  .setDescription("Start playing EPIC boss battle music!");

export const execute = async (
  interaction: CommandInteraction | ButtonInteraction
) => {
  await interaction.deferReply();
  const player = useMainPlayer();
  const queue = useQueue();
  const guildMember = await interaction.guild?.members.fetch(
    interaction.user.id
  );
  const channel = guildMember?.voice.channel;

  if (!channel) {
    const data = buildMessage({
      title: "❌ You must be in a voice channel.",
      color: "error",
      ephemeral: true,
    });
    return interaction.followUp(data);
  }

  const guild = guildMember.guild;

  if (queue) {
    await savePreviousQueue(queue, guild.id);
    queue.node.stop();
    (queue.metadata as any).isSwitching = true;
    queue.delete();
  }

  const newQueue = player.nodes.create(guild, {
    metadata: {
      channel: interaction.channel,
      voiceChannel: channel,
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

    if (!newQueue.connection) await newQueue.connect(channel);
    if (!newQueue.isPlaying()) await newQueue.node.play();

    await interaction.followUp(data);
  } catch (err) {
    console.error(err);
    await (interaction.channel as TextChannel).send(
      "❌ Something went wrong while trying to play."
    );
  }
};
