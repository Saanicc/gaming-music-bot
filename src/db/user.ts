import { User } from "./schemas/User";

type XpSortField = "totalXp";
type LeaderboardSortField =
  | "quizStats.totalWins"
  | "quizStats.totalCorrectAnswers";

type Sort = Record<XpSortField, 1 | -1> | Record<LeaderboardSortField, 1 | -1>;

export interface FindUsersOptions {
  sort: Sort;
  limit: number;
}

export const findUser = async (guildId: string, userId: string) => {
  return User.findOne({ guildId, userId });
};

export const findOrCreateUser = async (guildId: string, userId: string) => {
  let user = await User.findOne({ guildId, userId });
  if (!user) {
    user = await User.create({ guildId, userId });
  }
  return user;
};

export const findUsersByGuild = async (
  guildId: string,
  userIds: string[],
  options: FindUsersOptions
) => {
  return User.find({ guildId, userId: { $in: userIds } })
    .sort(options.sort)
    .limit(options.limit)
    .lean();
};

export const updateUserQuizStats = async (
  guildId: string,
  userId: string,
  quizStats: { won: boolean; correctAnswers: number }
) => {
  await User.updateOne(
    { guildId, userId },
    {
      $inc: {
        "quizStats.totalWins": quizStats.won ? 1 : 0,
        "quizStats.totalCorrectAnswers": quizStats.correctAnswers,
      },
      $setOnInsert: {
        guildId,
        userId,
        lastXP: null,
        xp: 0,
        level: 1,
        totalXp: 0,
        totalPlays: 0,
        totalBossPlays: 0,
      },
    },
    { upsert: true }
  );
};
