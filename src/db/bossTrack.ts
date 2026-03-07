import { BossTrack, TrackType } from "./schemas/BossTrack";

export const findBossTrackByUrl = async (trackUrl: string) => {
  return BossTrack.findOne({ trackUrl });
};

export const createBossTrack = async (
  trackUrl: string,
  trackType: TrackType
) => {
  return BossTrack.create({ trackUrl, trackType });
};

export const findBossTracksByType = async (type: TrackType) => {
  const tracks = await BossTrack.find({ trackType: type });
  return tracks.map((track) => track.trackUrl);
};
