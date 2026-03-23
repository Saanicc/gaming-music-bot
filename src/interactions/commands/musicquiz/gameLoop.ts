import { GuildQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { delay } from "@/utils/helpers/utils";
import { GameLoopOptions, QuizContext } from "./types";
import {
  savePreviousAndCreateNewQueue,
  getPreviousQueue,
  restorePreviousQueue,
} from "./queue";
import { playQuizRounds } from "./playRounds";
import { declareWinner } from "./winner";
import { searchPlaylists } from "@/api/searchPlaylists";

export async function runGameLoop({
  thread,
  voiceChannel,
  player,
  interaction,
  genre,
  rounds,
  t,
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
        title: t("commands.musicquiz.message.loadingTracks"),
        description: t("commands.musicquiz.message.fetchingRandomSongs"),
      })
    );

    const playlists = await searchPlaylists(genre);

    if (!playlists.length) {
      await thread.send(
        buildMessage({
          title: t("commands.musicquiz.message.errorTitle"),
          description: t("commands.musicquiz.message.couldNotFindPlaylists", {
            genre,
          }),
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
            title: t("commands.musicquiz.message.errorTitle"),
            description: t("commands.musicquiz.message.voiceConnectError"),
            color: "error",
          })
        );
        return;
      }
    }

    await playQuizRounds(playlists, context, rounds, t);
    await delay(3000);
    await declareWinner(context.scores, context.correctAnswers, thread, t);
  } catch (error) {
    console.error("Game loop error:", error);
    await thread.send(
      buildMessage({
        title: t("commands.musicquiz.message.errorTitle"),
        description: t("commands.musicquiz.message.genericError"),
        color: "error",
      })
    );
  } finally {
    if (queue) {
      const guild = voiceChannel.guild;
      (queue.metadata as any).isSwitching = true;
      (queue.metadata as any).musicQuiz = false;
      queue.delete();

      try {
        const previousQueue = await getPreviousQueue(
          guild,
          interaction,
          thread,
          t
        );
        if (previousQueue) {
          await restorePreviousQueue(
            previousQueue,
            interaction,
            guild,
            thread,
            t
          );
        }
      } catch (restoreError) {
        console.error("Failed to restore previous queue:", restoreError);
      }
    }
  }
}
