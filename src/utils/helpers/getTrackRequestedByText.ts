import { User } from "@/models/User";
import { getRankTitleWithEmoji } from "@/modules/rankSystem";
import { User as DiscordUser } from "discord.js";

export const getTrackRequestedByFooterText = async (
  discordUser: DiscordUser | null,
  guildId: string
) => {
  const user = await User.findOne({ userId: discordUser?.id, guildId });
  const userRank = getRankTitleWithEmoji(user?.level ?? 0);

  return `Track requested by ${
    discordUser?.toString() ?? "Unknown"
  } — ${userRank}`;
};
