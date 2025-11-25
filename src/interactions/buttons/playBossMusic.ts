import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { execute as playBossMusic } from "../commands/playBossMusic";
import { emoji } from "@/utils/constants/emojis";

export const bossMusicButton = new ButtonBuilder()
  .setCustomId("playBossMusic")
  .setEmoji(emoji.fight)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  const { guild } = interaction;
  if (!guild) {
    await interaction.reply("⚠️ No guild was found.");
    return;
  }

  playBossMusic(interaction);
};
