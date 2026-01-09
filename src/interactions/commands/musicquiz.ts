import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  GuildMember,
  User,
  ThreadAutoArchiveDuration,
  PublicThreadChannel,
  Message,
  VoiceBasedChannel,
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
import Fuse from "fuse.js";
import { delay } from "@/src/utils/helpers/utils";
import { ColorType } from "@/src/utils/constants/colors";

const shuffleArray = <T>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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
        description: "Playing 5 rounds.",
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
        description: "No queue found. Aborting...",
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
  await playQuizRounds(quizTracks, thread, queue, scores);
  await delay(3000);
  await declareWinner(scores, thread);
  queue.delete();
}

const playQuizRounds = async (
  quizTracks: Track[],
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
        description: "Listen carefully! Playing for 30 seconds...",
        color: "info",
      })
    );

    try {
      await queue.node.play(track, { seek: 25, transitionMode: false });
    } catch (error) {
      await thread.send(
        buildMessage({
          title: "Error",
          description: "Failed to play track. Skipping round.",
        })
      );
      continue;
    }

    await delay(30000);

    queue.node.stop();

    await collectArtistAnswer(thread, track.author, scores, 20000);
    await delay(2000);
    await collectTrackAnswer(thread, track.cleanTitle, scores, 20000);
  }
};

const collectArtistAnswer = async (
  thread: PublicThreadChannel,
  artist: string,
  scores: Map<string, number>,
  timeMs: number
) => {
  await thread.send(
    buildMessage({
      title: "Question 1",
      description: "Who is the **Artist**?",
      footerText: "You have 15 seconds to answer.",
    })
  );

  const artistWinner = await collectAnswer(thread, artist, timeMs);

  if (artistWinner) {
    const currentScore = scores.get(artistWinner.id) || 0;
    scores.set(artistWinner.id, currentScore + 1);
    await thread.send(
      buildMessage({
        title: "Correct!",
        description: `<@${artistWinner.id}> got it right! The artist is **${artist}**.`,
        color: "success",
      })
    );
  } else {
    await thread.send(
      buildMessage({
        title: "Time's up!",
        description: `No one guessed it. The artist was **${artist}**.`,
        color: "error",
      })
    );
  }
};

const collectTrackAnswer = async (
  thread: PublicThreadChannel,
  track: string,
  scores: Map<string, number>,
  timeMs: number
) => {
  await thread.send(
    buildMessage({
      title: "Question 2",
      description: "What is the **Track Name**?",
      footerText: "You have 15 seconds to answer.",
    })
  );

  const trackWinner = await collectAnswer(thread, track, timeMs);

  if (trackWinner) {
    const currentScore = scores.get(trackWinner.id) || 0;
    scores.set(trackWinner.id, currentScore + 1);
    await thread.send(
      buildMessage({
        title: "Correct!",
        description: `<@${trackWinner.id}> got it right! The track is **${track}**.`,
        color: "success",
      })
    );
  } else {
    await thread.send(
      buildMessage({
        title: "Time's up!",
        description: `No one guessed it. The track was **${track}**.`,
        color: "error",
      })
    );
  }
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
      `**Winner:** <@${winnerId}> with **${winnerScore}** points!\n\n**Leaderboard:**\n` +
      sortedScores
        .map(([id, s], idx) => `${idx + 1}. <@${id}>: ${s} pts`)
        .join("\n");
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

async function collectAnswer(
  thread: PublicThreadChannel,
  correctAnswer: string,
  timeMs: number
): Promise<User | null> {
  const collector = thread.createMessageCollector({
    time: timeMs,
    filter: (m: any) => !m.author.bot,
  });

  const FUSE_THRESHOLD = 0.25;
  const fuse = new Fuse([correctAnswer], {
    includeScore: true,
    threshold: FUSE_THRESHOLD,
    location: 0,
    distance: 100,
    findAllMatches: false,
    minMatchCharLength: 2,
    isCaseSensitive: false,
  });

  return new Promise((resolve) => {
    let winner: User | null = null;

    collector.on("collect", async (message: Message) => {
      const userInput = message.content.trim();
      if (userInput.length < 2) return;

      const results = fuse.search(userInput);

      if (results.length > 0) {
        const bestMatch = results[0];

        if (bestMatch.score && bestMatch.score <= FUSE_THRESHOLD) {
          console.log("MATCH FOUND: ", bestMatch.score);
          winner = message.author;
          collector.stop("guessed");
        } else if (
          bestMatch.score &&
          bestMatch.score > FUSE_THRESHOLD &&
          bestMatch.score <= FUSE_THRESHOLD + 0.35
        ) {
          await thread.send(
            buildMessage({
              title: `${message.author} you're close!`,
              color: "info",
            })
          );
        } else {
          console.log(
            `Input "${userInput}" was too far off. Score: ${bestMatch.score}`
          );
        }
      }
    });

    collector.on("end", (_: any, reason: string) => {
      if (reason === "guessed" && winner) {
        resolve(winner);
      } else {
        resolve(null);
      }
    });
  });
}
