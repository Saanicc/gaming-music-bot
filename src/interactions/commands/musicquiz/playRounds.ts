import { Player, Track, QueryType } from "discord-player";
import { PublicThreadChannel } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { delay } from "@/utils/helpers/utils";
import { QUIZ_CONFIG } from "./constants";
import { QuizContext } from "./types";
import { shuffleArray } from "./utils";
import { askQuestion } from "./question";

export const fetchPlaylistTracks = async (
  t: ReturnType<typeof useTranslations>,
  player: Player,
  playlists: string[],
  thread: PublicThreadChannel,
  attempt = 0
): Promise<Track[]> => {
  if (attempt >= QUIZ_CONFIG.MAX_PLAYLIST_RETRIES) {
    await thread.send(
      buildMessage({
        title: t("commands.musicquiz.message.errorTitle"),
        description: t("commands.musicquiz.message.failedToFindPlayableTracks"),
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
      return fetchPlaylistTracks(t, player, playlists, thread, attempt + 1);
    }

    return shuffleArray(searchResult.tracks);
  } catch (error) {
    return fetchPlaylistTracks(t, player, playlists, thread, attempt + 1);
  }
};

export const playQuizRounds = async (
  playlists: string[],
  context: QuizContext,
  rounds: number,
  t: ReturnType<typeof useTranslations>
) => {
  for (let i = 0; i < rounds; i++) {
    const allTracks = await fetchPlaylistTracks(
      t,
      context.player,
      playlists,
      context.thread
    );
    if (!allTracks.length) continue;

    const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
    const roundNum = i + 1;

    await context.thread.send(
      buildMessage({
        title: t("commands.musicquiz.message.roundTitle", {
          roundNum: roundNum.toString(),
          rounds: rounds.toString(),
        }),
        description: t("commands.musicquiz.message.listenCarefully", {
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
          title: t("commands.musicquiz.message.errorTitle"),
          description: t("commands.musicquiz.message.trackPlayFail"),
          color: "error",
        })
      );
      continue;
    }

    await delay(QUIZ_CONFIG.TIME_TO_PLAY_SONG);
    if (context.queue.node.isPlaying()) {
      context.queue.node.stop();
    }

    await askQuestion(
      context,
      randomTrack,
      allTracks,
      {
        property: "author",
        questionText: t("commands.musicquiz.message.whoIsTheArtist"),
      },
      t
    );

    await delay(2000);

    await askQuestion(
      context,
      randomTrack,
      allTracks,
      {
        property: "cleanTitle",
        questionText: t("commands.musicquiz.message.whatIsTheTrackName"),
      },
      t
    );

    await delay(2000);
  }
};
