import * as playBossMusic from "./playBossMusic";
import * as addTrack from "./addTrack";
import * as play from "./play";
import * as help from "./help";
import * as queue from "./queue";
import * as skip from "./skip";
import * as rank from "./rank";
import * as xp_leaderboard from "./xpLeaderboard";
import * as autoplay from "./autoplay";
import * as loop_all from "./loop-all";
import * as loop_current from "./loop-current";
import * as loop_disable from "./loop-disable";
import * as nightcore from "./nightcore";
import * as playNext from "./playnext";
import * as playNow from "./playNow";
import * as stop from "./stop";
import * as musicquiz from "./musicquiz";
import * as playRandom from "./playRandom";
import * as quiz_leaderboard from "./quizLeaderboard";

export const commands = {
  help,
  play,
  play_next: playNext,
  play_now: playNow,
  play_boss_music: playBossMusic,
  add_track: addTrack,
  queue,
  skip,
  rank,
  xp_leaderboard,
  autoplay,
  loop_all,
  loop_current,
  loop_disable,
  nightcore,
  stop,
  musicquiz,
  play_random: playRandom,
  quiz_leaderboard,
};
