import { db } from "@/db";

export const updateUserQuizStats = async (
  guildId: string,
  userId: string,
  quizStats: { won: boolean; correctAnswers: number }
) => {
  await db.updateUserQuizStats(guildId, userId, quizStats);
};
