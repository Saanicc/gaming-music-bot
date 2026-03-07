import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getRequiredXP } from "@/modules/xpSystem";
import { getRankImage, getRankTitle } from "@/modules/rankSystem";
import { Font } from "canvacord";
import { LevelCardBuilder } from "@/utils/helpers/LevelCard";
import { db } from "@/db";

export const data = new SlashCommandBuilder()
  .setName("rank")
  .setDescription("Check your current DJ rank")
  .addUserOption((option) =>
    option
      .setName("target")
      .setDescription("Check another user's rank")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();
  const guildId = interaction.guildId;
  if (!guildId) return;

  const targetUser = interaction.options.getUser("target") || interaction.user;
  const targetUserObj = await interaction.guild?.members.fetch(targetUser.id);

  if (!targetUserObj) return;

  Font.loadDefault();

  const user = await db.findOrCreateUser(guildId, targetUser.id);

  const card = new LevelCardBuilder()
    .setDisplayName(targetUserObj.displayName)
    .setUsername(`@${targetUserObj.user.username}`)
    .setAvatar(targetUserObj.user.displayAvatarURL({ size: 128 }))
    .setCurrentXp(user.xp)
    .setRequiredXp(getRequiredXP(user.level))
    .setLevel(user.level)
    .setRankTitle(getRankTitle(user.level))
    .setRankBadge(getRankImage(user.level));

  const data = await card.build({ format: "png" });
  const attachment = new AttachmentBuilder(data);

  return interaction.editReply({ files: [attachment] });
}
