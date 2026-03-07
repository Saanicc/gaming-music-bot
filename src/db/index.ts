import {
  findUser,
  findOrCreateUser,
  findUsersByGuild,
  updateUserQuizStats,
} from "./user";
import {
  findBossTrackByUrl,
  createBossTrack,
  findBossTracksByType,
} from "./bossTrack";
import { getLanguageFromDB, saveLanguageToDB } from "./language";

export { type TrackType } from "./schemas/BossTrack";
export { type UserType } from "./schemas/User";

export const db = {
  // User
  findUser,
  findOrCreateUser,
  findUsersByGuild,
  updateUserQuizStats,

  // BossTrack
  findBossTrackByUrl,
  createBossTrack,
  findBossTracksByType,

  // GuildSettings
  getLanguageFromDB,
  saveLanguageToDB,
};
