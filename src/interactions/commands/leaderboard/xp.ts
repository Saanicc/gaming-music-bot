import { Collection, Guild, GuildMember } from "discord.js";
import { LeaderboardBuilder } from "@/utils/helpers/Leaderboard";
import { getRankTitle } from "@/modules/rankSystem";
import { t } from "@/src/ui/translations";
import { useTranslations } from "@/src/utils/hooks/useTranslations";

interface BuildXpLeaderboardParams {
  users: any[];
  guild: Guild;
  guildMembers: Collection<string, GuildMember>;
  t: ReturnType<typeof useTranslations>;
}

export const buildXpLeaderboard = ({
  users,
  guild,
  guildMembers,
  t,
}: BuildXpLeaderboardParams) => {
  const sorted = [...users].sort((a, b) =>
    b.level === a.level ? b.xp - a.xp : b.level - a.level
  );

  const mappedUsers = sorted.map((user, index) => {
    const discordUser = guildMembers.find((dUser) => dUser.id === user.userId);

    return {
      avatar: discordUser?.user.displayAvatarURL({ size: 128 }) ?? "",
      username: discordUser?.user.username ?? "",
      displayName: discordUser?.displayName ?? "",
      level: user.level,
      xp: user.totalXp,
      rank: index + 1,
      rankTitle: getRankTitle(user.level),
    };
  });

  const lb = new LeaderboardBuilder()
    .setLeaderBoardType("xp")
    .setHeader({
      leaderBoardTitle: t("commands.leaderboard.xp.title"),
      title: guild.name,
      image: guild.iconURL() ?? "",
      subtitle: t("commands.leaderboard.xp.subtitle", {
        members: guildMembers.size.toString(),
      }),
    })
    .setPlayers(mappedUsers);

  return lb.build();
};
