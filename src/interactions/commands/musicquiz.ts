import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  GuildMember,
  ThreadAutoArchiveDuration,
  PublicThreadChannel,
  VoiceBasedChannel,
  ButtonInteraction,
  StringSelectMenuBuilder,
  MessageFlags,
  Message,
  Guild,
  TextChannel,
  MessageCreateOptions,
} from "discord.js";
import {
  useMainPlayer,
  QueryType,
  useQueue,
  Track,
  GuildQueue,
  Player,
} from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { GENRES } from "@/utils/constants/music-quiz-search-queries";
import { delay } from "@/utils/helpers/utils";
import { ColorType } from "@/utils/constants/colors";
import { updateUserQuizStats } from "@/utils/helpers/updateUserQuizStats";
import { searchSpotifyPlaylists } from "@/src/api/spotify";
import { savePreviousQueue } from "@/utils/helpers/saveQueueData";
import { queueManager, StoredQueue } from "@/src/services/queueManager";
import { musicPlayerMessage } from "@/src/services/musicPlayerMessage";
import { restoreOldQueue } from "@/utils/helpers/restoreOldQueue";
import { t } from "@/src/ui/translations";

const QUIZ_CONFIG = {
  TIME_TO_PLAY_SONG: 45000,
  QUESTION_TIME: 15000,
  DEFAULT_ROUNDS: 5,
  MAX_PLAYLIST_RETRIES: 5,
  LOBBY_TIMEOUT: 60000 * 5,
  SEEK_START: 20000,
};

interface GameLoopOptions {
  thread: PublicThreadChannel;
  voiceChannel: VoiceBasedChannel;
  player: Player;
  interaction: ChatInputCommandInteraction;
  genre: string;
  rounds: number;
}

interface QuizContext {
  thread: PublicThreadChannel;
  player: Player;
  queue: GuildQueue;
  scores: Map<string, number>;
  correctAnswers: Map<string, number>;
}

interface QuestionOptions {
  property: "author" | "cleanTitle";
  questionText: string;
}

const truncateLabelIfNeeded = (label: string): string =>
  label.length > 80 ? label.substring(0, 77) + "..." : label;

const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const generateOptions = (
  correctAnswer: string,
  allTracks: Track[],
  type: "author" | "cleanTitle"
): string[] => {
  const pool = new Set<string>();

  for (const t of allTracks) {
    const val = t[type].trim();
    if (val.toLowerCase() !== correctAnswer.toLowerCase()) {
      pool.add(val);
    }
  }

  const wrongOptions = shuffleArray(Array.from(pool)).slice(0, 4);
  return shuffleArray([correctAnswer, ...wrongOptions]);
};

export const data = new SlashCommandBuilder()
  .setName("musicquiz")
  .setDescription(t("en-US", "commands.musicquiz.description"));

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  const player = useMainPlayer();

  if (!member.voice.channel)
    return guardReply(interaction, "QUIZ_NO_VOICE_CHANNEL");

  const thread = await setupQuizThread(interaction);
  if (!thread) return;

  const lobbyMsg = await sendLobbyMessage(thread);
  await handleLobbyInteractions(lobbyMsg, thread, interaction, player);
}

const setupQuizThread = async (
  interaction: ChatInputCommandInteraction
): Promise<PublicThreadChannel | null> => {
  await interaction.reply(
    buildMessage({
      title: t("en-US", "commands.musicquiz.messages.settingUpQuiz"),
      description: t("en-US", "commands.musicquiz.messages.creatingThread"),
    })
  );

  let thread: PublicThreadChannel;
  try {
    const initialQuizMessage = await interaction.fetchReply();
    thread = await initialQuizMessage.startThread({
      name: "Music Quiz",
      autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
    });
  } catch {
    await interaction.followUp(
      buildMessage({
        title: t("en-US", "commands.musicquiz.messages.errorTitle"),
        description: t("en-US", "commands.musicquiz.messages.threadCreateFail"),
        color: "error",
        ephemeral: true,
      })
    );
    return null;
  }

  return thread;
};

const buildLobbyComponents = () => {
  const numberOfRoundsSelect = new StringSelectMenuBuilder()
    .setCustomId("quiz_rounds_select")
    .setPlaceholder(
      t("en-US", "commands.musicquiz.messages.numberOfRoundsPlaceholder")
    )
    .addOptions(
      [3, 4, 5, 6, 7, 8, 9, 10].map((num) => ({
        label:
          num === QUIZ_CONFIG.DEFAULT_ROUNDS
            ? `${num} ${t("en-US", "commands.musicquiz.messages.default")}`
            : num.toString(),
        value: num.toString(),
      }))
    );

  const musicQuizGenreSelect = new StringSelectMenuBuilder()
    .setCustomId("quiz_genre_select")
    .setPlaceholder(t("en-US", "commands.musicquiz.messages.genrePlaceholder"))
    .addOptions(
      GENRES.map((genre) => ({
        label: truncateLabelIfNeeded(genre),
        value: genre,
      }))
    );

  const startBtn = new ButtonBuilder()
    .setCustomId("start_quiz_btn")
    .setLabel(t("en-US", "commands.musicquiz.messages.startQuiz"))
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

const sendLobbyMessage = async (thread: PublicThreadChannel) => {
  const lobbyMessage = buildMessage({
    title: t("en-US", "commands.musicquiz.messages.musicQuizReady"),
    description: t("en-US", "commands.musicquiz.messages.joinVoiceChannel"),
    color: "info",
    actionRowBuilder: buildLobbyComponents(),
  });

  return thread.send(lobbyMessage);
};

const handleLobbyInteractions = async (
  lobbyMsg: Message,
  thread: PublicThreadChannel,
  interaction: ChatInputCommandInteraction,
  player: Player
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
          title: t("en-US", "commands.musicquiz.messages.title"),
          description: t("en-US", "commands.musicquiz.messages.lobbyTimeout"),
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
          title: t("en-US", "commands.musicquiz.messages.musicQuizStarted"),
          description: t(
            "en-US",
            "commands.musicquiz.messages.genreAndRounds",
            {
              genre,
              rounds: rounds.toString(),
            }
          ),
        })
      );

      await runGameLoop({
        thread,
        voiceChannel,
        player,
        interaction,
        genre,
        rounds,
      });
    }
  });
};

const savePreviousAndCreateNewQueue = async (
  voiceChannel: VoiceBasedChannel,
  player: Player,
  thread: PublicThreadChannel
) => {
  const guildId = voiceChannel.guild.id;
  let queue = useQueue(guildId);

  if (queue) {
    await savePreviousQueue(queue, guildId);
    (queue.metadata as any).isSwitching = true;
    queue.delete();
  }

  const newQueue = player.nodes.create(voiceChannel.guild, {
    metadata: { textChannel: thread, isSwitching: true, musicQuiz: true },
    leaveOnEmpty: false,
    leaveOnEnd: false,
    volume: 100,
  });

  return newQueue;
};

async function runGameLoop({
  thread,
  voiceChannel,
  player,
  interaction,
  genre,
  rounds,
}: GameLoopOptions) {
  let queue: GuildQueue | undefined;
  try {
    queue = await savePreviousAndCreateNewQueue(voiceChannel, player, thread);

    const context: QuizContext = {
      thread,
      player,
      queue,
      scores: new Map<string, number>(),
      correctAnswers: new Map<string, number>(),
    };

    await thread.send(
      buildMessage({
        title: t("en-US", "commands.musicquiz.messages.loadingTracks"),
        description: t(
          "en-US",
          "commands.musicquiz.messages.fetchingRandomSongs"
        ),
      })
    );

    const spotifyPlaylists = await searchSpotifyPlaylists(genre);

    if (!spotifyPlaylists?.length) {
      await thread.send(
        buildMessage({
          title: t("en-US", "commands.musicquiz.messages.errorTitle"),
          description: `Could not find playlists for theme: ${genre}.`,
          color: "error",
        })
      );
      return;
    }

    if (!queue.connection) {
      try {
        await queue.connect(voiceChannel);
      } catch (error) {
        await thread.send(
          buildMessage({
            title: t("en-US", "commands.musicquiz.messages.errorTitle"),
            description: t(
              "en-US",
              "commands.musicquiz.messages.voiceConnectError"
            ),
            color: "error",
          })
        );
        return;
      }
    }

    await playQuizRounds(spotifyPlaylists, context, rounds);
    await delay(3000);
    await declareWinner(context.scores, context.correctAnswers, thread);
  } catch (error) {
    console.error("Game loop error:", error);
    await thread.send(
      buildMessage({
        title: t("en-US", "commands.musicquiz.messages.errorTitle"),
        description: t("en-US", "commands.musicquiz.messages.genericError"),
        color: "error",
      })
    );
  } finally {
    if (!queue) return;

    const guild = voiceChannel.guild;
    (queue.metadata as any).isSwitching = true;
    (queue.metadata as any).musicQuiz = false;
    queue.delete();

    try {
      const previousQueue = await getPreviousQueue(guild, interaction, thread);
      if (previousQueue) {
        await restorePreviousQueue(previousQueue, interaction, guild, thread);
      }
    } catch (restoreError) {
      console.error("Failed to restore previous queue:", restoreError);
    }
  }
}

const getPreviousQueue = async (
  guild: Guild,
  interaction: ChatInputCommandInteraction,
  thread: PublicThreadChannel
) => {
  const stored = queueManager.retrieve(guild.id);
  if (!stored) {
    const data = buildMessage({
      title:
        "Nothing to restore, leaving voice chat. Please queue some new track(s) to resume playback!",
    });
    await musicPlayerMessage.delete().catch(() => {
      // Already deleted, ignore
    });
    queueManager.setQueueType("normal");
    const channel = (interaction.channel ?? thread) as TextChannel;
    await channel.send(data as MessageCreateOptions);
    return;
  }

  return stored;
};

const restorePreviousQueue = async (
  storedQueue: StoredQueue,
  interaction: ChatInputCommandInteraction,
  guild: Guild,
  thread: PublicThreadChannel
) => {
  const data = buildMessage({
    title: "Restoring old queue...",
    color: "info",
  });

  const channel = (interaction.channel ?? thread) as TextChannel;
  const msg = await channel.send(data as MessageCreateOptions);

  await delay(1250);

  await restoreOldQueue({
    guild,
    storedQueue,
    textChannel: storedQueue.textChannel,
    voiceChannel: storedQueue.voiceChannel,
  });

  await msg.delete().catch(() => {});
};

const fetchPlaylistTracks = async (
  player: Player,
  playlists: string[],
  thread: PublicThreadChannel,
  attempt = 0
): Promise<Track[]> => {
  if (attempt >= QUIZ_CONFIG.MAX_PLAYLIST_RETRIES) {
    await thread.send(
      buildMessage({
        title: t("en-US", "commands.musicquiz.messages.errorTitle"),
        description: t(
          "en-US",
          "commands.musicquiz.messages.failedToFindPlayableTracks"
        ),
        color: "error",
      })
    );
    return [];
  }

  const randomPlaylist =
    playlists[Math.floor(Math.random() * playlists.length)];

  try {
    const searchResult = await player.search(randomPlaylist, {
      requestedBy: undefined,
      searchEngine: QueryType.SPOTIFY_PLAYLIST,
    });

    if (!searchResult || !searchResult.tracks.length) {
      return fetchPlaylistTracks(player, playlists, thread, attempt + 1);
    }

    return shuffleArray(searchResult.tracks);
  } catch (error) {
    return fetchPlaylistTracks(player, playlists, thread, attempt + 1);
  }
};

const playQuizRounds = async (
  playlists: string[],
  context: QuizContext,
  rounds: number
) => {
  for (let i = 0; i < rounds; i++) {
    const allTracks = await fetchPlaylistTracks(
      context.player,
      playlists,
      context.thread
    );
    if (!allTracks.length) continue;

    const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
    const roundNum = i + 1;

    await context.thread.send(
      buildMessage({
        title: t("en-US", "commands.musicquiz.messages.roundTitle", {
          roundNum: roundNum.toString(),
          rounds: rounds.toString(),
        }),
        description: t("en-US", "commands.musicquiz.messages.listenCarefully", {
          time: (QUIZ_CONFIG.TIME_TO_PLAY_SONG / 1000).toString(),
        }),
        color: "info",
      })
    );

    try {
      await context.queue.node.play(randomTrack, {
        seek: QUIZ_CONFIG.SEEK_START,
        transitionMode: false,
      });
    } catch (error) {
      await context.thread.send(
        buildMessage({
          title: t("en-US", "commands.musicquiz.messages.errorTitle"),
          description: t("en-US", "commands.musicquiz.messages.trackPlayFail"),
          color: "error",
        })
      );
      continue;
    }

    await delay(QUIZ_CONFIG.TIME_TO_PLAY_SONG);
    if (context.queue.node.isPlaying()) {
      context.queue.node.stop();
    }

    await askQuestion(context, randomTrack, allTracks, {
      property: "author",
      questionText: t("en-US", "commands.musicquiz.messages.whoIsTheArtist"),
    });

    await delay(2000);

    await askQuestion(context, randomTrack, allTracks, {
      property: "cleanTitle",
      questionText: t(
        "en-US",
        "commands.musicquiz.messages.whatIsTheTrackName"
      ),
    });

    await delay(2000);
  }
};

const createAnswerButtons = (
  optLabels: string[]
): { buttons: ButtonBuilder[]; answerMap: Map<string, string> } => {
  const answerMap = new Map<string, string>();
  const buttons = optLabels.map((opt, index) => {
    const customId = `quiz_opt_${index}`;
    const label = truncateLabelIfNeeded(opt);
    answerMap.set(customId, label);

    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(ButtonStyle.Primary);
  });

  return { buttons, answerMap };
};

const handleAnswerSubmission = async (
  interaction: ButtonInteraction,
  context: QuizContext,
  answerMap: Map<string, string>,
  targetAnswer: string,
  startTime: number,
  answeredUserIds: Set<string>,
  correctUserIds: string[]
) => {
  if (answeredUserIds.has(interaction.user.id)) {
    await interaction.reply({
      content: t("en-US", "commands.musicquiz.messages.alreadyGuessed"),
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  answeredUserIds.add(interaction.user.id);

  if (!context.scores.has(interaction.user.id)) {
    context.scores.set(interaction.user.id, 0);
  }

  const selectedAnswer = answerMap.get(interaction.customId);
  const isCorrect = selectedAnswer === targetAnswer;

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
      content: t("en-US", "commands.musicquiz.messages.correctAnswer", {
        points: points.toString(),
      }),
      flags: MessageFlags.Ephemeral,
    });
  } else {
    await interaction.reply({
      content: t("en-US", "commands.musicquiz.messages.wrongAnswer"),
      flags: MessageFlags.Ephemeral,
    });
  }
};

const askQuestion = async (
  context: QuizContext,
  track: Track,
  allTracks: Track[],
  options: QuestionOptions
) => {
  const { property, questionText } = options;
  const correctAnswer = track[property];
  const guessOptions = generateOptions(correctAnswer, allTracks, property);

  const { buttons, answerMap } = createAnswerButtons(guessOptions);
  const targetAnswer = truncateLabelIfNeeded(correctAnswer);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  const questionMsg = await context.thread.send(
    buildMessage({
      title: t("en-US", "commands.musicquiz.messages.guessNow"),
      description: `**${questionText}**`,
      footerText: t("en-US", "commands.musicquiz.messages.timeToGuess", {
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
      targetAnswer,
      questionStartTime,
      answeredUserIds,
      correctUserIds
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
            title: t("en-US", "commands.musicquiz.messages.guessNow"),
            description: `**${questionText}**`,
            footerText: t("en-US", "commands.musicquiz.messages.timeIsUp"),
            color: "info",
            actionRowBuilder: [disabledRow],
          })
        );

        const resultColor = correctUserIds.length > 0 ? "success" : "error";
        let resultDesc = t(
          "en-US",
          "commands.musicquiz.messages.theAnswerWas",
          {
            answer: correctAnswer,
          }
        );

        if (correctUserIds.length === 0) {
          resultDesc = t("en-US", "commands.musicquiz.messages.noOneGotIt", {
            answer: correctAnswer,
          });
        }

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
              return `${idx + 1}. <@${id}>: ${current} ${gained > 0 ? `(+${gained}pts)` : ""}`;
            })
            .join("\n");
          resultDesc += `\n\n${t("en-US", "commands.musicquiz.messages.scoreTable")}\n${names}`;
        }

        await context.thread.send(
          buildMessage({
            title: t("en-US", "commands.musicquiz.messages.timeIsUp"),
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

const declareWinner = async (
  scores: Map<string, number>,
  correctAnswers: Map<string, number>,
  thread: PublicThreadChannel
) => {
  const sortedScores = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  let description = t("en-US", "commands.musicquiz.messages.noPointsScored");
  let title = t("en-US", "commands.musicquiz.messages.quizFinished");
  let color: ColorType = "info";

  if (sortedScores.length > 0) {
    const [winnerId, winnerScore] = sortedScores[0];
    title = t("en-US", "commands.musicquiz.messages.weHaveAWinner");
    color = "success";
    description =
      t("en-US", "commands.musicquiz.messages.winner", {
        winner: `<@${winnerId}>`,
        score: winnerScore.toString(),
      }) +
      "\n\n" +
      t("en-US", "commands.musicquiz.messages.quizResult") +
      "\n" +
      sortedScores
        .map(([id, s], idx) => `${idx + 1}. <@${id}>: ${s} pts`)
        .join("\n");

    const updatePromises = sortedScores.map(([id]) =>
      updateUserQuizStats(thread.guildId, id, {
        won: id === winnerId,
        correctAnswers: correctAnswers.get(id) ?? 0,
      })
    );

    Promise.allSettled(updatePromises).then((results) => {
      results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .forEach((r) =>
          console.error("updateUserQuizStats failed: ", r.reason)
        );
    });
  }

  await thread.send(
    buildMessage({
      title,
      description,
      color,
      footerText: t("en-US", "commands.musicquiz.messages.thanksForPlaying"),
    })
  );
};
