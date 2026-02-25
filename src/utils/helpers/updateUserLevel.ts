import { ButtonInteraction, CommandInteraction, TextChannel } from "discord.js";
import { addXP, XPGrantingCommand } from "@/modules/xpSystem";
import { getRankTitleWithEmoji } from "@/modules/rankSystem";
import { buildMessage } from "../bot-message/buildMessage";
import { getTreasureInfo } from "./getTreasureMessage";
import { emoji } from "../constants/emojis";
import { useTranslations } from "../hooks/useTranslations";

export const updateUserLevel = async (
  interaction: CommandInteraction | ButtonInteraction,
  guildId: string,
  command: XPGrantingCommand
) => {
  const t = useTranslations(interaction.guildId ?? "");

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
    const treasureInfo = getTreasureInfo(
      interaction.user.toString(),
      gainedXP,
      t
    );
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
      rankMessage = t("levelSystem.levelUp.rankMessage", {
        newRank,
      });
    }

    const message = buildMessage({
      title: t("levelSystem.levelUp.title", {
        emoji: emoji.levelup,
      }),
      description: `${t("levelSystem.levelUp.description", {
        user: interaction.user.toString(),
        levelsGained: levelsGained.toString(),
        level: user.level.toString(),
        levelText:
          levelsGained > 1
            ? t("levelSystem.levelUp.levels")
            : t("levelSystem.levelUp.level"),
      })}\n${rankMessage}`,
    });
    await (interaction.channel as TextChannel).send(message);
  }
};
