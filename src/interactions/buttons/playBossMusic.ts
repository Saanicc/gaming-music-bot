import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { execute as playBossMusic } from "../commands/play/bossMusic";
import { emoji } from "@/utils/constants/emojis";
import { useMainPlayer } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";

export const bossMusicButton = new ButtonBuilder()
  .setCustomId("playBossMusic")
  .setEmoji(emoji.fight)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  await interaction.deferReply();

  const { guild } = interaction;
  const player = useMainPlayer();

  if (!guild) return guardReply(interaction, "NO_GUILD", "editReply");

  const member = await guild.members.fetch(interaction.user.id);
  const voiceChannel = member?.voice.channel;

  if (!voiceChannel)
    return guardReply(interaction, "NO_VOICE_CHANNEL", "editReply");

  await playBossMusic({
    interaction,
    player,
    voiceChannel,
  });
};
