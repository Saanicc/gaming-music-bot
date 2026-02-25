import { xpEmoji } from "../constants/emojis";
import { useTranslations } from "../hooks/useTranslations";

export const getTreasureInfo = (
  userId: string,
  gainedXP: number,
  t: ReturnType<typeof useTranslations>
) => {
  if (!gainedXP) return;

  let title: string;
  let message: string;

  switch (true) {
    case gainedXP >= 200:
      title = t("levelSystem.treasure.legendary.title", {
        emoji: xpEmoji.legendary,
      });
      message = t("levelSystem.treasure.legendary.message", {
        user: userId,
      });
      break;
    case gainedXP >= 100:
      title = t("levelSystem.treasure.epic.title", {
        emoji: xpEmoji.epic,
      });
      message = t("levelSystem.treasure.epic.message", {
        user: userId,
      });
      break;
    case gainedXP >= 50:
      title = t("levelSystem.treasure.rare.title", {
        emoji: xpEmoji.rare,
      });
      message = t("levelSystem.treasure.rare.message", {
        user: userId,
      });
      break;
    case gainedXP >= 20:
      title = t("levelSystem.treasure.lucky.title", {
        emoji: xpEmoji.gold,
      });
      message = t("levelSystem.treasure.lucky.message", {
        user: userId,
      });
      break;
    default:
      title = t("levelSystem.treasure.small.title", {
        emoji: xpEmoji.coins,
      });
      message = t("levelSystem.treasure.small.message", {
        user: userId,
      });
  }

  return {
    title,
    description: `${message} (+${gainedXP} XP)`,
  };
};
