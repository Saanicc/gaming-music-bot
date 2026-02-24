import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildXpLeaderboard } from "./xp";
import { buildQuizLeaderboard } from "./quiz";
import { Font } from "canvacord";
import { User } from "@/src/models/User";
import { guardReply } from "@/src/utils/helpers/interactionGuard";
import { t } from "@/src/ui/translations";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription(t("en-US", "commands.leaderboard.description"))
  .addSubcommand((subcommand) =>
    subcommand
      .setName("xp")
      .setDescription(t("en-US", "commands.leaderboard.xp.description"))
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("quiz")
      .setDescription(t("en-US", "commands.leaderboard.quiz.description"))
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const subcommand = interaction.options.getSubcommand(true);

  const guild = interaction.guild;
  if (!guild) {
    return guardReply(interaction, "NO_GUILD", "reply");
  }

  const guildMembers = await guild.members.fetch();
  if (!guildMembers || guildMembers.size === 0) {
    return guardReply(interaction, "NO_GUILD_MEMBERS", "reply");
  }

  await interaction.deferReply();

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

  const users = await findOrCreateUserInDB();

  let leaderboard: string | Buffer<ArrayBufferLike> = "";

  if (subcommand === "xp") {
    leaderboard = await buildXpLeaderboard({ users, guild, guildMembers });
  } else if (subcommand === "quiz") {
    leaderboard = await buildQuizLeaderboard({ users, guild, guildMembers });
  }

  return interaction.followUp({ files: [leaderboard] });
}
