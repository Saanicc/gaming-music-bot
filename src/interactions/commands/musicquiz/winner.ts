import { PublicThreadChannel } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { updateUserQuizStats } from "@/utils/helpers/user";
import { ColorType } from "@/utils/constants/colors";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const declareWinner = async (
  scores: Map<string, number>,
  correctAnswers: Map<string, number>,
  thread: PublicThreadChannel,
  t: ReturnType<typeof useTranslations>
) => {
  const sortedScores = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  let description = t("commands.musicquiz.message.noPointsScored");
  let title = t("commands.musicquiz.message.quizFinished");
  let color: ColorType = "info";

  if (sortedScores.length > 0) {
    const [winnerId, winnerScore] = sortedScores[0];

    if (winnerScore > 0) {
      title = t("commands.musicquiz.message.weHaveAWinner");
      color = "success";
      description =
        t("commands.musicquiz.message.winner", {
          winner: `<@${winnerId}>`,
          score: winnerScore.toString(),
        }) +
        "\n\n" +
        t("commands.musicquiz.message.quizResult") +
        "\n" +
        sortedScores
          .map(
            ([id, s], idx) =>
              `${idx + 1}. <@${id}>: ${t("commands.musicquiz.message.points", {
                points: s.toString(),
              })}`
          )
          .join("\n");

      const updatePromises = sortedScores.map(([id]) =>
        updateUserQuizStats(thread.guildId, id, {
          won: id === winnerId,
          correctAnswers: correctAnswers.get(id) ?? 0,
        })
      );

      const results = await Promise.allSettled(updatePromises);
      results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .forEach((r) =>
          console.error("updateUserQuizStats failed: ", r.reason)
        );
    }
  }

  await thread.send(
    buildMessage({
      title,
      description,
      color,
      footerText: t("commands.musicquiz.message.thanksForPlaying"),
    })
  );
};
