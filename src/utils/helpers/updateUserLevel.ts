import { ButtonInteraction, CommandInteraction, TextChannel } from "discord.js";
import { addXP, XPGrantingCommand } from "@/modules/xpSystem";
import { getRankTitleWithEmoji } from "@/modules/rankSystem";
import { buildMessage } from "../bot-message/buildMessage";
import { getTreasureInfo } from "./getTreasureMessage";
import { emoji } from "../constants/emojis";
import { t } from "@/src/ui/translations";

export const updateUserLevel = async (
  interaction: CommandInteraction | ButtonInteraction,
  guildId: string,
  command: XPGrantingCommand
) => {
  const {
    user,
    gainedXP,
    leveledUp,
    levelsGained,
    treasure,
    noXP,
    previousLevel,
  } = await addXP(guildId, interaction.user.id, command);

  if (noXP) return; // cooldown

  if (treasure) {
    const treasureInfo = getTreasureInfo(interaction.user.toString(), gainedXP);
    if (!treasureInfo) return;

    const { title, description } = treasureInfo;
    const message = buildMessage({
      title,
      description,
    });
    await (interaction.channel as TextChannel).send(message);
  }

  if (leveledUp) {
    const oldRank = getRankTitleWithEmoji(previousLevel);
    const newRank = getRankTitleWithEmoji(user.level);

    let rankMessage = "";
    if (oldRank !== newRank) {
      rankMessage = t("en-US", "levelSystem.levelUp.rankMessage", {
        newRank,
      });
    }

    const message = buildMessage({
      title: t("en-US", "levelSystem.levelUp.title", {
        emoji: emoji.levelup,
      }),
      description: `${t("en-US", "levelSystem.levelUp.description", {
        user: interaction.user.toString(),
        levelsGained: levelsGained.toString(),
        level: user.level.toString(),
        levelText:
          levelsGained > 1
            ? t("en-US", "levelSystem.levelUp.levels")
            : t("en-US", "levelSystem.levelUp.level"),
      })}\n${rankMessage}`,
    });
    await (interaction.channel as TextChannel).send(message);
  }
};
