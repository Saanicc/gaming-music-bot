import { Collection, Guild, GuildMember } from "discord.js";
import { LeaderboardBuilder } from "@/utils/helpers/Leaderboard";
import { getRankTitle } from "@/modules/rankSystem";

interface BuildXpLeaderboardParams {
  users: any[];
  guild: Guild;
  guildMembers: Collection<string, GuildMember>;
}

export const buildXpLeaderboard = ({
  users,
  guild,
  guildMembers,
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
      leaderBoardTitle: "XP Leaderboard",
      title: guild.name,
      image: guild.iconURL() ?? "",
      subtitle: `${guildMembers.size} members`,
    })
    .setPlayers(mappedUsers);

  return lb.build();
};
