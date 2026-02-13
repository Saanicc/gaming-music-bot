import { BossTrack } from "@/src/models/BossTrack";
import { Track } from "discord-player";

const guildTracks = new Map<string, string[]>();

export const addTrackToCache = (guildId: string, trackUrl: string) => {
  const tracks = guildTracks.get(guildId) || [];
  if (!tracks.includes(trackUrl)) {
    tracks.push(trackUrl);
    guildTracks.set(guildId, tracks);
  }
};

export const isTrackInCache = (guildId: string, trackUrl: string) => {
  const tracks = guildTracks.get(guildId);
  return tracks ? tracks.includes(trackUrl) : false;
};

export const checkIfTrackInDB = async (guildId: string, track: Track) => {
  const trackUrl = track.url;

  if (isTrackInCache(guildId, trackUrl)) return true;

  const inDB = !!(await BossTrack.findOne({ trackUrl }));

  if (inDB) {
    addTrackToCache(guildId, trackUrl);
  }

  return inDB;
};
