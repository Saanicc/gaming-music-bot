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
import * as stop from "./stop";
import * as musicquiz from "./musicquiz";
import * as quiz_leaderboard from "./quizLeaderboard";

export const commands = {
  help,
  play,
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
  quiz_leaderboard,
};
