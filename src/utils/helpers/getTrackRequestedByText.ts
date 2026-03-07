import { db } from "@/db";
import { getRankTitleWithEmoji } from "@/modules/rankSystem";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { User as DiscordUser } from "discord.js";

export const getTrackRequestedByFooterText = async (
  discordUser: DiscordUser | null,
  guildId: string
) => {
  const t = useTranslations(guildId);
  const user = await db.findUser(discordUser?.id ?? "", guildId);
  const userRank = getRankTitleWithEmoji(user?.level ?? 0);

  return t("common.trackRequestedBy", {
    user: discordUser?.toString() ?? t("common.unknown"),
    userRank,
  });
};
