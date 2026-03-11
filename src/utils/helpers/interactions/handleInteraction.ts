import { useMainPlayer, useQueue } from "discord-player";
import { ButtonInteraction, ChatInputCommandInteraction } from "discord.js";
import { buildMessage } from "../../bot-message/buildMessage";
import { useTranslations } from "../../hooks/useTranslations";
import { guardReply } from "./interactionGuard";

const ALLOWED_COMMANDS_DURING_QUIZ = [
  "help",
  "rank",
  "xp_leaderboard",
  "quiz_leaderboard",
];

export const handleInteraction = async (
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  collection: Record<string, { execute: (i: any) => Promise<any> }>,
  key: string
) => {
  if (!interaction.guild) return;

  const handler = collection[key as keyof typeof collection];
  if (!handler) return;

  const player = useMainPlayer();
  const queue = useQueue(interaction.guild.id);

  if (
    (queue?.metadata as any)?.musicQuiz &&
    !ALLOWED_COMMANDS_DURING_QUIZ.includes(key)
  ) {
    if (interaction.isRepliable()) {
      const t = useTranslations(interaction.guild.id);
      await interaction.reply(
        buildMessage({
          title: t("commands.musicQuiz.inProgress.title"),
          description: t("commands.musicQuiz.inProgress.description"),
          color: "error",
          ephemeral: true,
        })
      );
    }
    return;
  }

  const context = {
    guild: interaction.guild,
  };

  try {
    await player.context.provide(context, () => handler.execute(interaction));
  } catch (error: any) {
    const { deferred, replied } = interaction;
    const replyMethod = deferred || replied ? "editReply" : "reply";
    if (error?.name === "GatewayRateLimitError" && error?.data?.opcode === 8) {
      const retryAfter = error?.data?.retry_after;
      await guardReply(interaction, "RATE_LIMIT", replyMethod, {
        waitTime: retryAfter ? String(retryAfter) : "0",
      });
    } else {
      console.error("Interaction execution error:", error);
      await guardReply(interaction, "GENERIC_ERROR", replyMethod);
    }
  }
};
