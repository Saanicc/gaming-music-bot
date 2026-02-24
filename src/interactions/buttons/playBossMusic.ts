import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { execute as playBossMusic } from "../commands/play/bossMusic";
import { emoji } from "@/utils/constants/emojis";
import { useMainPlayer, useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";

export const bossMusicButton = new ButtonBuilder()
  .setCustomId("playBossMusic")
  .setEmoji(emoji.fight)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  await interaction.deferReply();

  const { guild } = interaction;
  const player = useMainPlayer();
  let queue = useQueue();

  if (!guild) {
    const data = buildMessage({
      title: "❌ No guild was found.",
      ephemeral: true,
    });
    return interaction.followUp(data);
  }

  const member = await guild.members.fetch(interaction.user.id);
  const voiceChannel = member?.voice.channel;

  if (!voiceChannel) {
    const data = buildMessage({
      title: "❌ You must be in a voice channel to play music.",
      ephemeral: true,
    });
    return interaction.followUp(data);
  }

  await playBossMusic({
    interaction,
    player,
    queue,
    voiceChannel,
  });
};
