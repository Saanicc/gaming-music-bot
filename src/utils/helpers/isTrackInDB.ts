import { BossTrack } from "@/src/models/BossTrack";
import { Track } from "discord-player";

export let isTrackInDB = false;

export const checkIfTrackInDB = async (track: Track) => {
  const trackUrl = track.url;

  isTrackInDB = !!(await BossTrack.findOne({ trackUrl }));
  return isTrackInDB;
};

export const setTrackInDB = (bool: boolean) => {
  isTrackInDB = bool;
};
