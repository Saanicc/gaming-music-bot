import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { execute as playBossMusic } from "../commands/play/playBossMusic";
import { emoji } from "@/utils/constants/emojis";
import { useMainPlayer, useQueue } from "discord-player";
import { buildMessage } from "@/src/utils/bot-message/buildMessage";

export const bossMusicButton = new ButtonBuilder()
  .setCustomId("playBossMusic")
  .setEmoji(emoji.fight)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  const { guild } = interaction;
  const player = useMainPlayer();
  let queue = useQueue();

  if (!guild) {
    const data = buildMessage({
      title: "❌ No guild was found.",
      ephemeral: true,
    });
    return interaction.reply(data);
  }

  const member = await guild.members.fetch(interaction.user.id);
  const voiceChannel = member?.voice.channel;

  if (!voiceChannel) {
    const data = buildMessage({
      title: "❌ You must be in a voice channel to play music.",
      ephemeral: true,
    });
    return interaction.reply(data);
  }

  if (!queue) {
    queue = player.nodes.create(guild, {
      metadata: { textChannel: interaction.channel, voiceChannel },
      leaveOnEnd: false,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 15000,
    });
  }

  await playBossMusic({
    interaction,
    player,
    queue,
    voiceChannel,
  });
};
