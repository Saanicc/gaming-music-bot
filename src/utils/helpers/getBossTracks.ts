import { Player, Track } from "discord-player";
import { User } from "discord.js";
import { getSearchEngine } from "./getSearchEngine";
import { BossTrack, TrackType } from "@/models/BossTrack";

export const getBossTracks = async (
  type: TrackType,
  player: Player,
  requestedBy: User
): Promise<Track[]> => {
  const trackUrls = (await BossTrack.find())
    .filter((track) => track.trackType === type)
    .map((track) => track.trackUrl);

  if (trackUrls.length === 0) {
    throw new Error("⚠️ No boss tracks found!");
  }

  const tracks: Track[] = [];

  for (const url of trackUrls) {
    const result = await player.search(url, {
      requestedBy,
      searchEngine: getSearchEngine(url),
    });

    if (result.hasTracks()) {
      tracks.push(result.tracks[0]);
    } else {
      console.warn(`⚠️ No playable tracks found for: ${url}`);
    }
  }

  return tracks;
};
