import * as addTrack from "./addTrack";
import * as play from "./play";
import * as help from "./help";
import * as queue from "./queue";
import * as skip from "./skip";
import * as rank from "./rank";
import * as autoplay from "./autoplay";
import * as loop from "./loop";
import * as nightcore from "./nightcore";
import * as stop from "./stop";
import * as musicquiz from "./musicquiz";
import * as leaderboard from "./leaderboard";

export const commands = {
  help,
  play,
  add_track: addTrack,
  queue,
  skip,
  rank,
  leaderboard,
  autoplay,
  loop,
  nightcore,
  stop,
  musicquiz,
};
