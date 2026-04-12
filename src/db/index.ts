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
import {
  createPlaylist,
  deletePlaylist,
  findPlaylistById,
  findPlaylistsByGuildId,
  updatePlaylist,
} from "./playlist";

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

  // Playlist
  findPlaylistsByGuildId,
  findPlaylistById,
  createPlaylist,
  updatePlaylist,
  deletePlaylist,
};
