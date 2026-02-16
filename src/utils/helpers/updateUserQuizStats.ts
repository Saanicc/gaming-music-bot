import { User } from "@/models/User";

export const updateUserQuizStats = async (
  guildId: string,
  userId: string,
  quizStats: { won: boolean; correctAnswers: number }
) => {
  let user = await User.findOne({ guildId, userId });

  if (!user) {
    user = await User.create({ guildId, userId });
  }

  if (!user.quizStats) {
    user.quizStats = {
      totalWins: 0,
      totalCorrectAnswers: 0,
    };
  }

  if (quizStats.won) {
    user.quizStats.totalWins++;
  }
  user.quizStats.totalCorrectAnswers += quizStats.correctAnswers;
  await user.save();
};
