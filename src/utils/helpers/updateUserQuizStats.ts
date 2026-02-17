import { User } from "@/models/User";

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
