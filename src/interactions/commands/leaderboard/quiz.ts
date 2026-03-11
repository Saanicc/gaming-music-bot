import { LeaderboardBuilder } from "@/utils/helpers/builders";
import { getRankTitle } from "@/modules/rankSystem";
import { Collection, Guild, GuildMember } from "discord.js";
import { useTranslations } from "@/utils/hooks/useTranslations";

interface BuildQuizLeaderboardParams {
  users: any[];
  guild: Guild;
  guildMembers: Collection<string, GuildMember>;
  t: ReturnType<typeof useTranslations>;
}

export const buildQuizLeaderboard = async ({
  users,
  guild,
  guildMembers,
  t,
}: BuildQuizLeaderboardParams) => {
  const mappedUsers = users.map((user, index) => {
    const discordUser = guildMembers.find((dUser) => dUser.id === user.userId);

    return {
      avatar:
        discordUser?.user.displayAvatarURL({ size: 128, forceStatic: true }) ??
        "",
      username: discordUser?.user.username ?? "",
      displayName: discordUser?.displayName ?? "",
      level: user.level,
      xp: user.totalXp,
      rank: index + 1,
      rankTitle: getRankTitle(user.level),
      quizStats: {
        totalWins: user.quizStats?.totalWins ?? 0,
        totalCorrectAnswers: user.quizStats?.totalCorrectAnswers ?? 0,
      },
    };
  });

  const lb = new LeaderboardBuilder(t, 600, 1020)
    .setLeaderBoardType("music_quiz")
    .setHeader({
      leaderBoardTitle: t("commands.leaderboard.quiz.title"),
      title: guild.name,
      image: guild.iconURL() ?? "",
      subtitle: t("commands.leaderboard.quiz.subtitle", {
        members: guildMembers.size.toString(),
      }),
    })
    .setPlayers(mappedUsers);

  return lb.build();
};
