import { LeaderboardBuilder } from "@/utils/helpers/Leaderboard";
import { getRankTitle } from "@/modules/rankSystem";
import { Collection, Guild, GuildMember } from "discord.js";
import { t } from "@/src/ui/translations";

interface BuildQuizLeaderboardParams {
  users: any[];
  guild: Guild;
  guildMembers: Collection<string, GuildMember>;
}

export const buildQuizLeaderboard = ({
  users,
  guild,
  guildMembers,
}: BuildQuizLeaderboardParams) => {
  const sorted = [...users].sort((a, b) => {
    const winsA = a.quizStats?.totalWins ?? 0;
    const winsB = b.quizStats?.totalWins ?? 0;
    if (winsA !== winsB) {
      return winsB - winsA;
    }
    const correctA = a.quizStats?.totalCorrectAnswers ?? 0;
    const correctB = b.quizStats?.totalCorrectAnswers ?? 0;
    return correctB - correctA;
  });

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
      quizStats: {
        totalWins: user.quizStats?.totalWins ?? 0,
        totalCorrectAnswers: user.quizStats?.totalCorrectAnswers ?? 0,
      },
    };
  });

  const lb = new LeaderboardBuilder()
    .setLeaderBoardType("music_quiz")
    .setHeader({
      leaderBoardTitle: t("en-US", "commands.leaderboard.quiz.title"),
      title: guild.name,
      image: guild.iconURL() ?? "",
      subtitle: t("en-US", "commands.leaderboard.quiz.subtitle", {
        members: guildMembers.size.toString(),
      }),
    })
    .setPlayers(mappedUsers);

  return lb.build();
};
