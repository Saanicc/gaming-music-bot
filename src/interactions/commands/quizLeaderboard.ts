import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { User } from "@/models/User";
import { Font } from "canvacord";
import { LeaderboardBuilder } from "@/utils/helpers/Leaderboard";
import { getRankTitle } from "@/modules/rankSystem";

export const data = new SlashCommandBuilder()
  .setName("quiz_leaderboard")
  .setDescription("View the Music Quiz leaderboard");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guild = interaction.guild;
  if (!guild) {
    const message = buildMessage({ title: "No guild found." });
    return interaction.editReply(message);
  }

  const guildMembers = await guild.members.fetch();
  if (!guildMembers || guildMembers.size === 0) {
    const message = buildMessage({ title: "No guild members found." });
    return interaction.editReply(message);
  }

  Font.loadDefault();

  const getUserIds = () => {
    const users = guildMembers.filter((member) => !member.user.bot);
    return users.map((user) => user.id);
  };

  const findOrCreateUserInDB = async () => {
    const userIds = getUserIds();

    try {
      const users = await Promise.all(
        userIds.map(async (id) => {
          try {
            let user = await User.findOne({ guildId: guild.id, userId: id });
            if (!user) {
              user = await User.create({ guildId: guild.id, userId: id });
            }
            return user;
          } catch (err) {
            console.error(`Error processing user ${id}:`, err);
            return null;
          }
        })
      );
      return users.filter(Boolean);
    } catch (err) {
      console.error("Error finding or creating users:", err);
      throw new Error("Database error while finding/creating users.");
    }
  };

  const buildLeaderboard = (users: any[]) => {
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
      const discordUser = guildMembers.find(
        (dUser) => dUser.id === user.userId
      );

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
        leaderBoardTitle: "Music Quiz Leaderboard",
        title: guild.name,
        image: guild.iconURL() ?? "",
        subtitle: `${guildMembers.size} members`,
      })
      .setPlayers(mappedUsers);

    return lb;
  };

  const users = await findOrCreateUserInDB();
  const leaderboard = await buildLeaderboard(users).build();

  await interaction.editReply({ files: [leaderboard] });
}
