import {
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ButtonInteraction,
  ComponentType,
  MessageFlags,
} from "discord.js";
import { Track } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { QUIZ_CONFIG } from "./constants";
import { QuizContext, QuestionOptions } from "./types";
import { shuffleArray, truncateLabelIfNeeded } from "./utils";

export const generateOptions = (
  correctAnswer: string,
  allTracks: Track[],
  type: "author" | "cleanTitle"
): string[] => {
  const pool = new Set<string>();
  const normalized = new Set<string>();
  const correctKey = correctAnswer.trim().toLowerCase();

  for (const track of allTracks) {
    const val = track[type].trim();

    const key = val.toLowerCase();
    if (key !== correctKey && !normalized.has(key)) {
      normalized.add(key);
      pool.add(val);
    }
  }

  const wrongOptions = shuffleArray(Array.from(pool)).slice(0, 4);
  return shuffleArray([correctAnswer, ...wrongOptions]);
};

export const createAnswerButtons = (
  optLabels: string[]
): { buttons: ButtonBuilder[]; answerMap: Map<string, string> } => {
  const answerMap = new Map<string, string>();
  const buttons = optLabels.map((opt, index) => {
    const customId = `quiz_opt_${index}`;
    const label = truncateLabelIfNeeded(opt);
    answerMap.set(customId, opt);

    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(ButtonStyle.Primary);
  });

  return { buttons, answerMap };
};

export const handleAnswerSubmission = async (
  interaction: ButtonInteraction,
  context: QuizContext,
  answerMap: Map<string, string>,
  correctAnswer: string,
  startTime: number,
  answeredUserIds: Set<string>,
  correctUserIds: string[],
  t: ReturnType<typeof useTranslations>
) => {
  if (answeredUserIds.has(interaction.user.id)) {
    await interaction.reply({
      content: t("commands.musicquiz.message.alreadyGuessed"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  answeredUserIds.add(interaction.user.id);

  if (!context.scores.has(interaction.user.id)) {
    context.scores.set(interaction.user.id, 0);
  }

  const selectedAnswer = answerMap.get(interaction.customId);
  const isCorrect =
    selectedAnswer?.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

  if (isCorrect) {
    const elapsed = Date.now() - startTime;
    const points = Math.max(
      1,
      Math.round(1000 * (1 - elapsed / QUIZ_CONFIG.QUESTION_TIME))
    );

    const userId = interaction.user.id;
    const currentScore = context.scores.get(userId) || 0;
    context.scores.set(userId, currentScore + points);

    const currentCorrect = context.correctAnswers.get(userId) || 0;
    context.correctAnswers.set(userId, currentCorrect + 1);

    correctUserIds.push(userId);

    await interaction.reply({
      content: t("commands.musicquiz.message.correctAnswer", {
        points: points.toString(),
      }),
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: t("commands.musicquiz.message.wrongAnswer"),
      flags: MessageFlags.Ephemeral,
    });
  }
};

export const askQuestion = async (
  context: QuizContext,
  track: Track,
  allTracks: Track[],
  options: QuestionOptions,
  t: ReturnType<typeof useTranslations>
) => {
  const { property, questionText } = options;
  const correctAnswer = track[property];
  const guessOptions = generateOptions(correctAnswer, allTracks, property);

  const { buttons, answerMap } = createAnswerButtons(guessOptions);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  const questionMsg = await context.thread.send(
    buildMessage({
      title: t("commands.musicquiz.message.guessNow"),
      description: `**${questionText}**`,
      footerText: t("commands.musicquiz.message.timeToGuess", {
        time: (QUIZ_CONFIG.QUESTION_TIME / 1000).toString(),
      }),
      color: "info",
      actionRowBuilder: [row],
    })
  );

  const questionStartTime = Date.now();
  const correctUserIds: string[] = [];
  const answeredUserIds = new Set<string>();
  const preQuestionScores = new Map(context.scores);

  const collector = questionMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: QUIZ_CONFIG.QUESTION_TIME,
  });

  collector.on("collect", (i: ButtonInteraction) => {
    handleAnswerSubmission(
      i,
      context,
      answerMap,
      correctAnswer,
      questionStartTime,
      answeredUserIds,
      correctUserIds,
      t
    ).catch(console.error);
  });

  await new Promise<void>((resolve) => {
    collector.on("end", async () => {
      try {
        const disabledButtons = buttons.map((b) =>
          ButtonBuilder.from(b.toJSON())
            .setDisabled(true)
            .setStyle(ButtonStyle.Secondary)
        );
        const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          disabledButtons
        );

        await questionMsg.edit(
          buildMessage({
            title: t("commands.musicquiz.message.guessNow"),
            description: `**${questionText}**`,
            footerText: t("commands.musicquiz.message.timeIsUp"),
            color: "info",
            actionRowBuilder: [disabledRow],
          })
        );

        const resultColor = correctUserIds.length > 0 ? "success" : "error";

        let resultDesc =
          correctUserIds.length === 0
            ? t("commands.musicquiz.message.noOneGotIt", {
                answer: correctAnswer,
              })
            : t("commands.musicquiz.message.theAnswerWas", {
                answer: correctAnswer,
              });

        const allPlayers = Array.from(context.scores.keys());
        if (allPlayers.length > 0) {
          const names = allPlayers
            .sort(
              (a, b) =>
                (context.scores.get(b) ?? 0) - (context.scores.get(a) ?? 0)
            )
            .map((id, idx) => {
              const current = context.scores.get(id) ?? 0;
              const prev = preQuestionScores.get(id) ?? 0;
              const gained = current - prev;
              return `${idx + 1}. <@${id}>: ${current} ${
                gained > 0
                  ? t("commands.musicquiz.message.pointsDelta", {
                      points: gained.toString(),
                    })
                  : ""
              }`;
            })
            .join("\n");
          resultDesc += `\n\n${t("commands.musicquiz.message.scoreTable")}\n${names}`;
        }

        await context.thread.send(
          buildMessage({
            title: t("commands.musicquiz.message.timeIsUp"),
            description: resultDesc,
            color: resultColor,
          })
        );
      } catch (error) {
        console.error("Error rendering question result:", error);
      } finally {
        resolve();
      }
    });
  });
};
