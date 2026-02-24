import { t } from "@/src/ui/translations";
import { xpEmoji } from "../constants/emojis";

export const getTreasureInfo = (userId: string, gainedXP: number) => {
  if (!gainedXP) return;

  let title: string;
  let message: string;

  switch (true) {
    case gainedXP >= 200:
      title = t("en-US", "levelSystem.treasure.legendary.title", {
        emoji: xpEmoji.legendary,
      });
      message = t("en-US", "levelSystem.treasure.legendary.message", {
        user: userId,
      });
      break;
    case gainedXP >= 100:
      title = t("en-US", "levelSystem.treasure.epic.title", {
        emoji: xpEmoji.epic,
      });
      message = t("en-US", "levelSystem.treasure.epic.message", {
        user: userId,
      });
      break;
    case gainedXP >= 50:
      title = t("en-US", "levelSystem.treasure.rare.title", {
        emoji: xpEmoji.rare,
      });
      message = t("en-US", "levelSystem.treasure.rare.message", {
        user: userId,
      });
      break;
    case gainedXP >= 20:
      title = t("en-US", "levelSystem.treasure.lucky.title", {
        emoji: xpEmoji.gold,
      });
      message = t("en-US", "levelSystem.treasure.lucky.message", {
        user: userId,
      });
      break;
    default:
      title = t("en-US", "levelSystem.treasure.small.title", {
        emoji: xpEmoji.coins,
      });
      message = t("en-US", "levelSystem.treasure.small.message", {
        user: userId,
      });
  }

  return {
    title,
    description: `${message} (+${gainedXP} XP)`,
  };
};
