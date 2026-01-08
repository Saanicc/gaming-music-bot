import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ChannelType,
  ComponentType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageCollector,
  GuildMember,
  User,
  ThreadAutoArchiveDuration,
  PublicThreadChannel,
} from "discord.js";
import { useMainPlayer, QueryType, useQueue, Track } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { SEARCH_QUERIES } from "@/src/utils/constants/music-quiz-search-queries";

// --- Helper: Simple string normalization for answer checking ---
const cleanString = (str: string) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s]|_/g, "") // Remove punctuation
    .replace(/\s+/g, " ") // Collapse spaces
    .trim();
};

// --- Helper: Shuffle Array ---
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

  // 1. Validation: User must be in a voice channel
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

  // 2. Create the Thread
  // We reply initially to acknowledge the command, then create the thread
  await interaction.reply(
    buildMessage({
      title: "Setting up Quiz...",
      description: "Creating a dedicated thread for the quiz.",
    })
  );

  const thread = await (
    await interaction.fetchReply()
  ).startThread({
    name: `Music Quiz - ${interaction.user.username}`,
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

  // 3. Send Start Button in the Thread
  const startBtn = new ButtonBuilder()
    .setCustomId("start_quiz_btn")
    .setLabel("Start Quiz")
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(startBtn);

  const lobbyMessageOptions = buildMessage({
    title: "🎵 Music Quiz Ready",
    description:
      "Join the voice channel and click the button below to start!\nWe will play 5 rounds.",
    color: "info",
  });

  // We manually append the button row to the components provided by buildMessage
  // @ts-ignore - We know components exists on the return type
  lobbyMessageOptions.components = [
    ...(lobbyMessageOptions.components || []),
    row,
  ];

  const lobbyMsg = await thread.send(lobbyMessageOptions);

  // 4. Create Collector for Start Button
  const collector = lobbyMsg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60000 * 5, // 5 minutes to start
    max: 1, // Only need one click to start
  });

  collector.on("collect", async (i) => {
    if (i.customId === "start_quiz_btn") {
      await i.deferUpdate();

      // Disable the button
      startBtn.setDisabled(true);
      const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        startBtn
      );
      // @ts-ignore
      lobbyMessageOptions.components = [
        ...(lobbyMessageOptions.components || []).filter((c: any) => c !== row),
        disabledRow,
      ];
      await lobbyMsg.edit(lobbyMessageOptions);

      // START THE GAME LOGIC
      await runGameLoop(thread, member.voice.channel!, player);
    }
  });
}

// --- The Core Game Loop ---
async function runGameLoop(
  thread: PublicThreadChannel,
  voiceChannel: any,
  player: any
) {
  const scores = new Map<string, number>();

  // 1. Initialize Queue & Connect
  let queue = useQueue(voiceChannel.guild.id);
  if (!queue) {
    queue = player.nodes.create(voiceChannel.guild, {
      metadata: { channel: thread, isSwitching: true, musicQuiz: true },
      leaveOnEmpty: true,
      leaveOnEnd: false,
      volume: 100,
    });
  }

  try {
    if (!queue?.connection) await queue?.connect(voiceChannel);
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

  // 2. Fetch Tracks
  // We search for a large playlist (e.g., Global Top 50 or a specific Genre) and shuffle it
  // Using a generic term "Hits" or a specific playlist ID ensures we get data.
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

  // Pick 5 random unique tracks
  const allTracks = shuffleArray<Track>(searchResult.tracks);
  const quizTracks = allTracks.slice(0, 5);

  // 3. Loop through 5 rounds
  for (let i = 0; i < quizTracks.length; i++) {
    const track = quizTracks[i];
    const roundNum = i + 1;

    // --- A. Play Song ---
    await thread.send(
      buildMessage({
        title: `Round ${roundNum}/5`,
        description: "Listen carefully! Playing for 30 seconds...",
        color: "info",
      })
    );

    try {
      // Play immediately (force skips current if any)
      await queue?.node.play(track, { seek: 0, transitionMode: false });
    } catch (error) {
      await thread.send(
        buildMessage({
          title: "Error",
          description: "Failed to play track. Skipping round.",
        })
      );
      continue;
    }

    // --- B. Wait 30 Seconds ---
    await new Promise((resolve) => setTimeout(resolve, 30_000));

    // --- C. Stop Music ---
    queue?.node.stop();

    // --- D. Question 1: Artist ---
    await thread.send(
      buildMessage({
        title: "Question 1",
        description: "Who is the **Artist**?",
        footerText: "You have 15 seconds to answer.",
      })
    );

    const artistWinner = await collectAnswer(thread, track.author, 15000);

    if (artistWinner) {
      const currentScore = scores.get(artistWinner.id) || 0;
      scores.set(artistWinner.id, currentScore + 1);
      await thread.send(
        buildMessage({
          title: "Correct!",
          description: `<@${artistWinner.id}> got it right! The artist is **${track.author}**.`,
          color: "success",
        })
      );
    } else {
      await thread.send(
        buildMessage({
          title: "Time's up!",
          description: `No one guessed it. The artist was **${track.author}**.`,
          color: "error",
        })
      );
    }

    // Small buffer
    await new Promise((r) => setTimeout(r, 2000));

    // --- E. Question 2: Track Name ---
    await thread.send(
      buildMessage({
        title: "Question 2",
        description: "What is the **Track Name**?",
        footerText: "You have 15 seconds to answer.",
      })
    );

    const trackWinner = await collectAnswer(thread, track.title, 15000);

    if (trackWinner) {
      const currentScore = scores.get(trackWinner.id) || 0;
      scores.set(trackWinner.id, currentScore + 1);
      await thread.send(
        buildMessage({
          title: "Correct!",
          description: `<@${trackWinner.id}> got it right! The track is **${track.title}**.`,
          color: "success",
        })
      );
    } else {
      await thread.send(
        buildMessage({
          title: "Time's up!",
          description: `No one guessed it. The track was **${track.title}**.`,
          color: "error",
        })
      );
    }

    // Wait before next round
    await new Promise((r) => setTimeout(r, 3000));
  }

  // 4. Declare Winner
  const sortedScores = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  let description = "No points were scored.";
  let title = "Quiz Finished";
  let color: any = "INFO";

  if (sortedScores.length > 0) {
    const winnerId = sortedScores[0][0];
    const winnerScore = sortedScores[0][1];
    title = "🎉 We have a winner!";
    color = "SUCCESS";
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

  // Cleanup
  queue?.delete();
}

// --- Helper: Collect Answers ---
async function collectAnswer(
  thread: PublicThreadChannel,
  correctAnswer: string,
  timeMs: number
): Promise<User | null> {
  const collector = thread.createMessageCollector({
    time: timeMs,
    filter: (m: any) => !m.author.bot, // Ignore bots
  });

  return new Promise((resolve) => {
    let winner: User | null = null;
    const normalizedAnswer = cleanString(correctAnswer);

    collector.on("collect", (message: any) => {
      const input = cleanString(message.content);

      // Check if input is contained in answer or vice versa to be lenient
      // e.g. "The Weeknd" vs "Weeknd"
      if (
        input.length > 2 &&
        (normalizedAnswer.includes(input) || input.includes(normalizedAnswer))
      ) {
        winner = message.author;
        collector.stop("guessed");
      }
    });

    collector.on("end", (collected: any, reason: string) => {
      if (reason === "guessed" && winner) {
        resolve(winner);
      } else {
        resolve(null);
      }
    });
  });
}
