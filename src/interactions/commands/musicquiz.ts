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
import { SEARCH_QUERIES } from "@/src/utils/constants/music-quiz-search-queries";
import { delay } from "@/src/utils/helpers/utils";
import { ColorType } from "@/src/utils/constants/colors";
import { updateUserQuizStats } from "@/src/utils/helpers/updateUserQuizStats";

const TIME_TO_PLAY_SONG = 45000;

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

  const startBtn = new ButtonBuilder()
    .setCustomId("start_quiz_btn")
    .setLabel("Start Quiz")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(startBtn);

  const lobbyMessage = buildMessage({
    title: "🎵 Music Quiz Ready",
    description:
      "Join a voice channel and click the button below to start!\nWe will play 5 rounds.",
    color: "info",
    actionRowButtons: [row],
  });

  const lobbyMsg = await thread.send(lobbyMessage);

  const collector = lobbyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000 * 5,
    max: 1,
  });

  collector.on("collect", async (i) => {
    if (i.customId === "start_quiz_btn") {
      await i.deferUpdate();

      const quizStartedMessage = buildMessage({
        title: "🎵 Music Quiz Started",
        description: "Playing 5 rounds. Get ready!",
      });
      await lobbyMsg.edit(quizStartedMessage);

      await runGameLoop(thread, member.voice.channel!, player, interaction);
    }
  });
}

async function runGameLoop(
  thread: PublicThreadChannel,
  voiceChannel: VoiceBasedChannel,
  player: Player,
  interaction: ChatInputCommandInteraction
) {
  const scores = new Map<string, number>();

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

  const randomTheme =
    SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];

  const searchResult = await player.search(randomTheme, {
    requestedBy: undefined,
    searchEngine: QueryType.SPOTIFY_PLAYLIST,
  });

  if (!searchResult || !searchResult.tracks.length) {
    return thread.send(
      buildMessage({
        title: "Error",
        description: `Could not find tracks for theme: ${randomTheme}.`,
        color: "error",
      })
    );
  }

  const allTracks = shuffleArray<Track>(searchResult.tracks);
  const quizTracks = allTracks.slice(0, 5);
  await playQuizRounds(quizTracks, allTracks, thread, queue, scores);
  await delay(3000);
  await declareWinner(scores, thread);
  queue.delete();
}

const playQuizRounds = async (
  quizTracks: Track[],
  allTracks: Track[],
  thread: PublicThreadChannel,
  queue: GuildQueue,
  scores: Map<string, number>
) => {
  for (let i = 0; i < quizTracks.length; i++) {
    const track = quizTracks[i];
    const roundNum = i + 1;

    await thread.send(
      buildMessage({
        title: `Round ${roundNum}/5`,
        description: `Listen carefully! Playing for ${TIME_TO_PLAY_SONG / 1000} seconds...`,
        color: "info",
      })
    );

    try {
      await queue.node.play(track, { seek: 30, transitionMode: false });
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
      track,
      allTracks,
      scores,
      "author",
      "Who is the Artist?"
    );

    await delay(2000);

    await askQuestion(
      thread,
      track,
      allTracks,
      scores,
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
      actionRowButtons: [row],
    })
  );

  const correctUserIds: string[] = [];
  const answeredUserIds = new Set<string>();

  const collector = questionMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 15000,
  });

  collector.on("collect", async (i: ButtonInteraction) => {
    if (answeredUserIds.has(i.user.id)) {
      await i.reply({ content: "You already guessed!", ephemeral: true });
      return;
    }

    answeredUserIds.add(i.user.id);

    const selectedAnswer = answerMap.get(i.customId);
    const targetAnswer = truncateLabelIfNeeded(correctAnswer);
    const isCorrect = selectedAnswer === targetAnswer;

    if (isCorrect) {
      const currentScore = scores.get(i.user.id) || 0;
      scores.set(i.user.id, currentScore + 1);
      correctUserIds.push(i.user.id);
      await i.reply({ content: "✅ Correct!", ephemeral: true });
    } else {
      await i.reply({ content: "❌ Wrong!", ephemeral: true });
    }
  });

  await new Promise<void>((resolve) => {
    collector.on("end", async () => {
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        buttons.map((b) => b.setDisabled(true).setStyle(ButtonStyle.Secondary))
      );

      await questionMsg.edit({ components: [disabledRow] });

      if (correctUserIds.length > 0) {
        const names = correctUserIds.map((id) => `<@${id}>`).join(", ");
        await thread.send(
          buildMessage({
            title: "Time's Up!",
            description: `The answer was **${correctAnswer}**.\nCorrect: ${names}`,
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

    for (const [id, score] of sortedScores) {
      await updateUserQuizStats(thread.guildId, id, {
        won: id === winnerId,
        correctAnswers: score,
      });
    }
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
