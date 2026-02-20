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
import {
  GENRES,
  SEARCH_QUERIES,
} from "@/src/utils/constants/music-quiz-search-queries";
import { delay } from "@/src/utils/helpers/utils";
import { ColorType } from "@/src/utils/constants/colors";
import { updateUserQuizStats } from "@/src/utils/helpers/updateUserQuizStats";
import { searchSpotifyPlaylists } from "@/src/api/spotify";

const TIME_TO_PLAY_SONG = 45000;
const QUESTION_TIME = 15000;
const DEFAULT_ROUNDS = 5;
const MAX_PLAYLIST_RETRIES = 5;

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
  .setDescription("Start a music quiz in a thread!");

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  const player = useMainPlayer();

  if (!member.voice.channel) {
    return interaction.reply(
      buildMessage({
        title: "Error",
        description: "You must be in a voice channel to start the quiz.",
        color: "error",
        ephemeral: true,
      })
    );
  }

  await interaction.reply(
    buildMessage({
      title: "Setting up Quiz...",
      description: "Creating a dedicated thread for the quiz.",
    })
  );

  const initialQuizMessage = await interaction.fetchReply();

  const thread = await initialQuizMessage.startThread({
    name: "Music Quiz",
    autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
  });

  if (!thread) {
    return interaction.followUp(
      buildMessage({
        title: "Error",
        description: "Could not create a thread. Check my permissions.",
        color: "error",
        ephemeral: true,
      })
    );
  }

  const numberOfRoundsSelect = new StringSelectMenuBuilder()
    .setCustomId("quiz_rounds_select")
    .setPlaceholder("Number of rounds (optional)")
    .addOptions(
      [3, 4, 5, 6, 7, 8, 9, 10].map((number) => ({
        label: number === 5 ? "5 (Default)" : number.toString(),
        value: number.toString(),
      }))
    );

  const musicQuizGenreSelect = new StringSelectMenuBuilder()
    .setCustomId("quiz_genre_select")
    .setPlaceholder("Select a genre (optional)")
    .addOptions(
      GENRES.map((genre) => ({
        label: genre,
        value: genre,
      }))
    );

  const startBtn = new ButtonBuilder()
    .setCustomId("start_quiz_btn")
    .setLabel("Start Quiz")
    .setStyle(ButtonStyle.Success);

  const roundsSelectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      numberOfRoundsSelect
    );
  const genreSelectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      musicQuizGenreSelect
    );
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    startBtn
  );

  const lobbyMessage = buildMessage({
    title: "🎵 Music Quiz Ready",
    description: `Join a voice channel, select a genre, and click the button below to start!`,
    color: "info",
    actionRowBuilder: [roundsSelectRow, genreSelectRow, buttonRow],
  });

  const lobbyMsg = await thread.send(lobbyMessage);

  let selectedRounds: number | null = null;
  let selectedGenre: string | null = null;

  const selectCollector = lobbyMsg.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 60000 * 5,
  });

  selectCollector.on("collect", async (i) => {
    await i.deferUpdate();

    if (i.customId === "quiz_rounds_select") {
      selectedRounds = Number(i.values[0]);
    }
    if (i.customId === "quiz_genre_select") {
      selectedGenre = i.values[0];
    }
  });

  selectCollector.on("end", async (_collected, reason) => {
    if (reason === "time") {
      await lobbyMsg.edit(
        buildMessage({
          title: "🎵 Music Quiz",
          description:
            "The quiz lobby timed out. Run `/musicquiz` again to start a new quiz.",
          color: "error",
        })
      );
    }
  });

  const buttonCollector = lobbyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000 * 5,
    max: 1,
  });

  buttonCollector.on("collect", async (i) => {
    if (i.customId === "start_quiz_btn") {
      await i.deferUpdate();
      selectCollector.stop();

      const freshMember = i.member as GuildMember;
      const voiceChannel = freshMember.voice.channel;
      if (!voiceChannel) {
        await thread.send(
          buildMessage({
            title: "Error",
            description: "You must be in a voice channel to start the quiz.",
            color: "error",
          })
        );
        return;
      }

      const rounds = selectedRounds ?? DEFAULT_ROUNDS;

      const genre =
        selectedGenre ??
        SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

      const quizStartedMessage = buildMessage({
        title: "🎵 Music Quiz Started",
        description: `Genre: **${genre}**.\n\nPlaying ${rounds} rounds. Get ready!`,
      });
      await lobbyMsg.edit(quizStartedMessage);

      await runGameLoop(
        thread,
        voiceChannel,
        player,
        interaction,
        genre,
        rounds
      );
    }
  });
}

async function runGameLoop(
  thread: PublicThreadChannel,
  voiceChannel: VoiceBasedChannel,
  player: Player,
  interaction: ChatInputCommandInteraction,
  genre: string,
  rounds: number
) {
  const scores = new Map<string, number>();
  const correctAnswers = new Map<string, number>();

  let queue = useQueue(voiceChannel.guild.id);
  if (!queue) {
    queue = player.nodes.create(voiceChannel.guild, {
      metadata: { channel: thread, isSwitching: true, musicQuiz: true },
      leaveOnEmpty: false,
      leaveOnEnd: false,
      volume: 100,
    });
  }

  if (!queue) {
    return interaction.followUp(
      buildMessage({
        title: "Error",
        description: "No queue found.",
        color: "error",
      })
    );
  }

  try {
    if (!queue.connection) await queue.connect(voiceChannel);
  } catch (e) {
    return thread.send(
      buildMessage({
        title: "Error",
        description: "Could not join voice channel.",
        color: "error",
      })
    );
  }

  await thread.send(
    buildMessage({
      title: "Loading Tracks...",
      description: "Fetching random songs from Spotify...",
    })
  );

  try {
    let spotifyPlaylists: string[];
    try {
      spotifyPlaylists = await searchSpotifyPlaylists(genre);
    } catch (e) {
      await thread.send(
        buildMessage({
          title: "Error",
          description: "Failed to reach Spotify. Please try again later.",
          color: "error",
        })
      );
      return;
    }

    if (!spotifyPlaylists.length) {
      await thread.send(
        buildMessage({
          title: "Error",
          description: `Could not find playlists for theme: ${genre}.`,
          color: "error",
        })
      );
      return;
    }

    await playQuiz(
      spotifyPlaylists,
      player,
      thread,
      queue,
      scores,
      correctAnswers,
      rounds
    );
    await delay(3000);
    await declareWinner(scores, correctAnswers, thread);
  } finally {
    queue.delete();
  }
}

const playQuiz = async (
  spotifyPlaylists: string[],
  player: Player,
  thread: PublicThreadChannel,
  queue: GuildQueue,
  scores: Map<string, number>,
  correctAnswers: Map<string, number>,
  rounds: number
) => {
  const getRandomPlaylistTracks = async (attempt = 0): Promise<Track[]> => {
    if (attempt >= MAX_PLAYLIST_RETRIES) {
      await thread.send(
        buildMessage({
          title: "Error",
          description:
            "Failed to find playable tracks after multiple attempts.",
          color: "error",
        })
      );
      return [];
    }

    const randomPlaylist =
      spotifyPlaylists[Math.floor(Math.random() * spotifyPlaylists.length)];

    let searchResult;
    try {
      searchResult = await player.search(randomPlaylist, {
        requestedBy: undefined,
        searchEngine: QueryType.SPOTIFY_PLAYLIST,
      });
    } catch (e) {
      return getRandomPlaylistTracks(attempt + 1);
    }

    if (!searchResult || !searchResult.tracks.length) {
      await thread.send(
        buildMessage({
          title: "Error",
          description: `Could not find tracks for playlist: ${randomPlaylist}. Trying another playlist...`,
          color: "error",
        })
      );
      return getRandomPlaylistTracks(attempt + 1);
    }

    return shuffleArray(searchResult.tracks);
  };

  for (let i = 0; i < rounds; i++) {
    const allTracks = await getRandomPlaylistTracks();
    if (!allTracks.length) continue;
    const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
    const roundNum = i + 1;

    await thread.send(
      buildMessage({
        title: `Round ${roundNum}/${rounds}`,
        description: `Listen carefully! Playing for ${TIME_TO_PLAY_SONG / 1000} seconds...`,
        color: "info",
      })
    );

    try {
      await queue.node.play(randomTrack, {
        seek: 20000,
        transitionMode: false,
      });
    } catch (error) {
      await thread.send(
        buildMessage({
          title: "Error",
          description: "Failed to play track. Skipping.",
          color: "error",
        })
      );
      continue;
    }

    await delay(TIME_TO_PLAY_SONG);
    queue.node.stop();

    await askQuestion(
      thread,
      randomTrack,
      allTracks,
      scores,
      correctAnswers,
      "author",
      "Who is the Artist?"
    );

    await delay(2000);

    await askQuestion(
      thread,
      randomTrack,
      allTracks,
      scores,
      correctAnswers,
      "cleanTitle",
      "What is the Track Name?"
    );

    await delay(2000);
  }
};

const askQuestion = async (
  thread: PublicThreadChannel,
  track: Track,
  allTracks: Track[],
  scores: Map<string, number>,
  correctAnswers: Map<string, number>,
  property: "author" | "cleanTitle",
  questionText: string
) => {
  const correctAnswer = track[property];
  const options = generateOptions(correctAnswer, allTracks, property);

  const answerMap = new Map<string, string>();

  const buttons = options.map((opt, index) => {
    const customId = `quiz_opt_${index}`;
    const label = truncateLabelIfNeeded(opt);

    answerMap.set(customId, label);

    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(ButtonStyle.Primary);
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

  const questionMsg = await thread.send(
    buildMessage({
      title: "Guess Now!",
      description: `**${questionText}**`,
      footerText: "You have 15 seconds!",
      color: "info",
      actionRowBuilder: [row],
    })
  );

  const questionStartTime = Date.now();

  const correctUserIds: string[] = [];
  const answeredUserIds = new Set<string>();

  const collector = questionMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: QUESTION_TIME,
  });

  collector.on("collect", async (i: ButtonInteraction) => {
    if (answeredUserIds.has(i.user.id)) {
      await i.reply({
        content: "You already guessed!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    answeredUserIds.add(i.user.id);

    const selectedAnswer = answerMap.get(i.customId);
    const targetAnswer = truncateLabelIfNeeded(correctAnswer);
    const isCorrect = selectedAnswer === targetAnswer;

    if (isCorrect) {
      const elapsed = Date.now() - questionStartTime;
      const points = Math.max(
        1,
        Math.round(1000 * (1 - elapsed / QUESTION_TIME))
      );

      const currentScore = scores.get(i.user.id) || 0;
      scores.set(i.user.id, currentScore + points);

      const currentCorrect = correctAnswers.get(i.user.id) || 0;
      correctAnswers.set(i.user.id, currentCorrect + 1);

      correctUserIds.push(i.user.id);
      await i.reply({
        content: `✅ Correct! +${points} pts`,
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await i.reply({ content: "❌ Wrong!", flags: MessageFlags.Ephemeral });
    }
  });

  await new Promise<void>((resolve) => {
    collector.on("end", async () => {
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
          title: "Guess Now!",
          description: `**${questionText}**`,
          footerText: "Time's up!",
          color: "info",
          actionRowBuilder: [disabledRow],
        })
      );

      if (correctUserIds.length > 0) {
        const names = correctUserIds
          .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0))
          .map((id) => `<@${id}> (${scores.get(id) ?? 0} pts)`)
          .join(`\n`);
        await thread.send(
          buildMessage({
            title: "Time's Up!",
            description: `The answer was **${correctAnswer}**.\nCorrect:\n${names}`,
            color: "success",
          })
        );
      } else {
        await thread.send(
          buildMessage({
            title: "Time's Up!",
            description: `No one got it! The answer was **${correctAnswer}**.`,
            color: "error",
          })
        );
      }
      resolve();
    });
  });
};

const declareWinner = async (
  scores: Map<string, number>,
  correctAnswers: Map<string, number>,
  thread: PublicThreadChannel
) => {
  const sortedScores = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  let description = "No points were scored.";
  let title = "Quiz Finished";
  let color: ColorType = "info";

  if (sortedScores.length > 0) {
    const winnerId = sortedScores[0][0];
    const winnerScore = sortedScores[0][1];
    title = "🎉 We have a winner!";
    color = "success";
    description =
      `**Winner:** <@${winnerId}> with **${winnerScore}** points!\n\n**Quiz result:**\n` +
      sortedScores
        .map(([id, s], idx) => `${idx + 1}. <@${id}>: ${s} pts`)
        .join("\n");

    const updatePromises = sortedScores.map(([id]) =>
      updateUserQuizStats(thread.guildId, id, {
        won: id === winnerId,
        correctAnswers: correctAnswers.get(id) ?? 0,
      })
    );

    await Promise.allSettled(updatePromises);
  }

  await thread.send(
    buildMessage({
      title,
      description,
      color,
      footerText: "Thanks for playing!",
    })
  );
};
