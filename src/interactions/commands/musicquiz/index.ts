import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  GuildMember,
  PublicThreadChannel,
  ThreadAutoArchiveDuration,
} from "discord.js";
import { useMainPlayer } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { sendLobbyMessage, handleLobbyInteractions } from "./lobby";

export const data = new SlashCommandBuilder()
  .setName("musicquiz")
  .setDescription("Start a music quiz in a thread!");

const setupQuizThread = async (
  interaction: ChatInputCommandInteraction,
  t: ReturnType<typeof useTranslations>
): Promise<PublicThreadChannel | null> => {
  await interaction.reply(
    buildMessage({
      title: t("commands.musicquiz.message.settingUpQuiz"),
      description: t("commands.musicquiz.message.creatingThread"),
    })
  );

  let thread: PublicThreadChannel;
  try {
    const initialQuizMessage = await interaction.fetchReply();
    thread = await initialQuizMessage.startThread({
      name: t("commands.musicquiz.message.threadName"),
      autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
    });
  } catch {
    await interaction.followUp(
      buildMessage({
        title: t("commands.musicquiz.message.errorTitle"),
        description: t("commands.musicquiz.message.threadCreateFail"),
        color: "error",
        ephemeral: true,
      })
    );
    return null;
  }

  return thread;
};

export async function execute(interaction: ChatInputCommandInteraction) {
  const t = useTranslations(interaction.guildId ?? "");
  const member = interaction.member as GuildMember;
  const player = useMainPlayer();

  if (!member.voice.channel)
    return guardReply(interaction, "QUIZ_NO_VOICE_CHANNEL");

  const thread = await setupQuizThread(interaction, t);
  if (!thread) return;

  const lobbyMsg = await sendLobbyMessage(thread, t);
  await handleLobbyInteractions(lobbyMsg, thread, interaction, player, t);
}
