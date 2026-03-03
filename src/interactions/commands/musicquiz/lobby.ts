import {
  ChatInputCommandInteraction,
  PublicThreadChannel,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ComponentType,
  GuildMember,
  Message,
} from "discord.js";
import { Player } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { GENRES } from "@/utils/constants/music-quiz-search-queries";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { QUIZ_CONFIG } from "./constants";
import { runGameLoop } from "./gameLoop";
import { truncateLabelIfNeeded } from "./utils";

export const buildLobbyComponents = (t: ReturnType<typeof useTranslations>) => {
  const numberOfRoundsSelect = new StringSelectMenuBuilder()
    .setCustomId("quiz_rounds_select")
    .setPlaceholder(t("commands.musicquiz.message.numberOfRoundsPlaceholder"))
    .addOptions(
      [3, 4, 5, 6, 7, 8, 9, 10].map((num) => ({
        label:
          num === QUIZ_CONFIG.DEFAULT_ROUNDS
            ? `${num} ${t("commands.musicquiz.message.default")}`
            : num.toString(),
        value: num.toString(),
      }))
    );

  const musicQuizGenreSelect = new StringSelectMenuBuilder()
    .setCustomId("quiz_genre_select")
    .setPlaceholder(t("commands.musicquiz.message.genrePlaceholder"))
    .addOptions(
      GENRES.map((genre) => ({
        label: truncateLabelIfNeeded(genre),
        value: genre,
      }))
    );

  const startBtn = new ButtonBuilder()
    .setCustomId("start_quiz_btn")
    .setLabel(t("commands.musicquiz.message.startQuiz"))
    .setStyle(ButtonStyle.Success);

  return [
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      numberOfRoundsSelect
    ),
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      musicQuizGenreSelect
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(startBtn),
  ];
};

export const sendLobbyMessage = async (
  thread: PublicThreadChannel,
  t: ReturnType<typeof useTranslations>
) => {
  const lobbyMessage = buildMessage({
    title: t("commands.musicquiz.message.musicQuizReady"),
    description: t("commands.musicquiz.message.joinVoiceChannel"),
    color: "info",
    actionRowBuilder: buildLobbyComponents(t),
  });

  return thread.send(lobbyMessage);
};

export const handleLobbyInteractions = async (
  lobbyMsg: Message,
  thread: PublicThreadChannel,
  interaction: ChatInputCommandInteraction,
  player: Player,
  t: ReturnType<typeof useTranslations>
) => {
  let selectedRounds: number | null = null;
  let selectedGenre: string | null = null;

  const selectCollector = lobbyMsg.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: QUIZ_CONFIG.LOBBY_TIMEOUT,
  });

  selectCollector.on("collect", async (i) => {
    await i.deferUpdate();
    if (i.customId === "quiz_rounds_select") {
      selectedRounds = Number(i.values[0]);
    } else if (i.customId === "quiz_genre_select") {
      selectedGenre = i.values[0];
    }
  });

  selectCollector.on("end", async (_collected, reason) => {
    if (reason === "time") {
      await lobbyMsg.edit(
        buildMessage({
          title: t("commands.musicquiz.message.title"),
          description: t("commands.musicquiz.message.lobbyTimeout"),
          color: "error",
        })
      );
    }
  });

  const buttonCollector = lobbyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: QUIZ_CONFIG.LOBBY_TIMEOUT,
  });

  buttonCollector.on("collect", async (i) => {
    if (i.customId === "start_quiz_btn") {
      const member = i.member as GuildMember;
      const voiceChannel = member.voice.channel;

      if (!voiceChannel) {
        await guardReply(i, "QUIZ_NO_VOICE_CHANNEL");
        return;
      }

      await i.deferUpdate();
      selectCollector.stop();
      buttonCollector.stop();
      const rounds = selectedRounds ?? QUIZ_CONFIG.DEFAULT_ROUNDS;
      const genre =
        selectedGenre ?? GENRES[Math.floor(Math.random() * GENRES.length)];

      await lobbyMsg.edit(
        buildMessage({
          title: t("commands.musicquiz.message.musicQuizStarted"),
          description: t("commands.musicquiz.message.genreAndRounds", {
            genre,
            rounds: rounds.toString(),
          }),
        })
      );

      await runGameLoop({
        thread,
        voiceChannel,
        player,
        interaction,
        genre,
        rounds,
        t,
      });
    }
  });
};
