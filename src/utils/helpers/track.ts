import { GuildQueue, Track, Player } from "discord-player";
import { User as DiscordUser } from "discord.js";
import { getRankTitleWithEmoji } from "@/modules/rankSystem";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { db, TrackType } from "@/db";
import { getSearchEngine } from "./utils";

const guildTracks = new Map<string, Set<string>>();

export const addTrackToCache = (guildId: string, trackUrl: string) => {
  const tracks = guildTracks.get(guildId) ?? new Set<string>();
  tracks.add(trackUrl);
  guildTracks.set(guildId, tracks);
};

export const isTrackInCache = (guildId: string, trackUrl: string) => {
  const tracks = guildTracks.get(guildId);
  return tracks?.has(trackUrl) ?? false;
};

export const checkIfTrackInDB = async (guildId: string, track: Track) => {
  const trackUrl = track.url;

  if (isTrackInCache(guildId, trackUrl)) return true;

  const inDB = !!(await db.findBossTrackByUrl(trackUrl));

  if (inDB) {
    addTrackToCache(guildId, trackUrl);
  }

  return inDB;
};

export const getFormattedTrackDescription = (
  track: Track | null,
  queue: GuildQueue | null
) => {
  if (!track) return "N/A";

  const totalTime = queue?.node.getTimestamp()?.total.label;

  let desc: string;

  if (
    track.url.match(/https:\/\/open.spotify.com\/track\/.*/) ||
    track.url.match(/https:\/\/www.deezer.com\/track\/.*/)
  ) {
    desc = `[${track.title}](${track.url}) - ${track.author}`;
  } else {
    desc = `[${track.title}](${track.url})`;
  }

  if (!queue) return desc;

  if (queue.currentTrack?.id === track.id) {
    return `${desc} [${totalTime}]`;
  }
  return desc;
};

export const getTrackRequestedByFooterText = async (
  discordUser: DiscordUser | null,
  guildId: string
) => {
  const t = useTranslations(guildId);
  const user = await db.findUser(guildId, discordUser?.id ?? "");
  const userRank = getRankTitleWithEmoji(user?.level ?? 0);

  return t("common.trackRequestedBy", {
    user: discordUser?.toString() ?? t("common.unknown"),
    userRank,
  });
};

export const getBossTracks = async (
  type: TrackType,
  player: Player,
  requestedBy: DiscordUser
): Promise<Track[]> => {
  const trackUrls = await db.findBossTracksByType(type);

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
