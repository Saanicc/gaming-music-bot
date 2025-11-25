import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { User } from "@/models/User";
import { Font } from "canvacord";
import { LeaderboardBuilder } from "@/utils/helpers/Leaderboard";
import { getRankTitle } from "@/modules/rankSystem";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View the DJ leaderboard");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const guild = interaction.guild;
  if (!guild) {
    const message = buildMessage({ title: "No guild found." });
    return interaction.editReply(message);
  }

  const guildMembers = await guild.members.fetch();
  if (!guildMembers) {
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
    const sorted = [...users].sort((a, b) =>
      b.level === a.level ? b.xp - a.xp : b.level - a.level
    );

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
      };
    });

    const lb = new LeaderboardBuilder()
      .setHeader({
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
