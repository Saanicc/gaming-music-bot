import { useMainPlayer, useQueue } from "discord-player";
import { Interaction } from "discord.js";
import { buildMessage } from "../bot-message/buildMessage";
import { t } from "@/src/ui/translations";

const ALLOWED_COMMANDS_DURING_QUIZ = [
  "help",
  "rank",
  "xp_leaderboard",
  "quiz_leaderboard",
];

export const handleInteraction = async (
  interaction: Interaction,
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
      await interaction.reply(
        buildMessage({
          title: t("en-US", "commands.musicQuiz.inProgress.title"),
          description: t("en-US", "commands.musicQuiz.inProgress.description"),
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
  await player.context.provide(context, () => handler.execute(interaction));
};
