import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildXpLeaderboard } from "./xp";
import { buildQuizLeaderboard } from "./quiz";
import { Font } from "canvacord";
import { User } from "@/models/User";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View the leaderboard")
  .addSubcommand((subcommand) =>
    subcommand.setName("xp").setDescription("View XP leaderboard")
  )
  .addSubcommand((subcommand) =>
    subcommand.setName("quiz").setDescription("View Music Quiz leaderboard")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const t = useTranslations(interaction.guildId ?? "");

  const subcommand = interaction.options.getSubcommand(true);

  const guild = interaction.guild;
  if (!guild) {
    return guardReply(interaction, "NO_GUILD", "reply");
  }

  await interaction.deferReply();

  const guildMembers = await guild.members.fetch();
  if (!guildMembers || guildMembers.size === 0) {
    return guardReply(interaction, "NO_GUILD_MEMBERS", "editReply");
  }

  Font.loadDefault();

  const getUserIds = () => {
    const users = guildMembers.filter((member) => !member.user.bot);
    return users.map((user) => user.id);
  };

  const findUsersInDB = async () => {
    const userIds = getUserIds();
    try {
      const query = User.find({ guildId: guild.id, userId: { $in: userIds } });

      if (subcommand === "xp") {
        return await query.sort({ totalXp: -1 }).limit(8).lean();
      }

      if (subcommand === "quiz") {
        return await query
          .sort({
            "quizStats.totalWins": -1,
            "quizStats.totalCorrectAnswers": -1,
          })
          .limit(8)
          .lean();
      }
    } catch (err) {
      console.error("Error finding users:", err);
      throw new Error("Database error while finding users.");
    }
  };

  const users = (await findUsersInDB()) ?? [];

  let leaderboard: string | Buffer<ArrayBufferLike> = "";

  if (subcommand === "xp") {
    leaderboard = await buildXpLeaderboard({ users, guild, guildMembers, t });
  } else if (subcommand === "quiz") {
    leaderboard = await buildQuizLeaderboard({ users, guild, guildMembers, t });
  }

  return interaction.followUp({ files: [leaderboard] });
}
