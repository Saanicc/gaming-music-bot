/**
 * Tests for src/utils/helpers/track.ts
 */
import {
  addTrackToCache,
  isTrackInCache,
  checkIfTrackInDB,
  getFormattedTrackDescription,
  getTrackRequestedByFooterText,
  getBossTracks,
  getPlaylistChoices,
} from "../track";
import { db } from "@/db";
import { getRankTitleWithEmoji } from "@/modules/rankSystem";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { getSearchEngine } from "../utils";

// Mock database interactions
jest.mock("@/db", () => ({
  db: {
    findBossTrackByUrl: jest.fn(),
    findUser: jest.fn(),
    findBossTracksByType: jest.fn(),
    findPlaylistsByGuildId: jest.fn(),
  },
}));

// Mock rank system
jest.mock("@/modules/rankSystem", () => ({
  getRankTitleWithEmoji: jest.fn(),
}));

// Mock translations
jest.mock("@/utils/hooks/useTranslations", () => ({
  useTranslations: jest.fn(),
}));

// Mock utils
jest.mock("../utils", () => ({
  getSearchEngine: jest.fn(),
}));

describe("Track Helpers (track.ts)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Cache Management (addTrackToCache, isTrackInCache)", () => {
    it("should return false if guild has no tracks in cache", () => {
      expect(isTrackInCache("cache-guild-1", "url-1")).toBe(false);
    });

    it("should add track to cache and verify its existence", () => {
      expect(isTrackInCache("cache-guild-2", "url-2")).toBe(false);
      addTrackToCache("cache-guild-2", "url-2");
      expect(isTrackInCache("cache-guild-2", "url-2")).toBe(true);
    });

    it("should not confuse tracks between different guilds", () => {
      addTrackToCache("cache-guild-3", "url-3");
      expect(isTrackInCache("cache-guild-3", "url-3")).toBe(true);
      expect(isTrackInCache("cache-guild-4", "url-3")).toBe(false);
    });
  });

  describe("checkIfTrackInDB()", () => {
    const mockTrack = { url: "db-track-url" } as any;

    it("should return true immediately if track is in cache", async () => {
      // populate cache first
      addTrackToCache("db-guild-1", "db-track-url");

      const result = await checkIfTrackInDB("db-guild-1", mockTrack);
      expect(result).toBe(true);
      expect(db.findBossTrackByUrl).not.toHaveBeenCalled();
    });

    it("should query DB and return false if track is not in cache and not in DB", async () => {
      (db.findBossTrackByUrl as jest.Mock).mockResolvedValue(null);

      const result = await checkIfTrackInDB("db-guild-2", mockTrack);
      expect(result).toBe(false);
      expect(db.findBossTrackByUrl).toHaveBeenCalledWith("db-track-url");
      expect(isTrackInCache("db-guild-2", "db-track-url")).toBe(false);
    });

    it("should return true and cache the track if found in DB", async () => {
      (db.findBossTrackByUrl as jest.Mock).mockResolvedValue(true);

      const result = await checkIfTrackInDB("db-guild-3", mockTrack);
      expect(result).toBe(true);
      expect(db.findBossTrackByUrl).toHaveBeenCalledWith("db-track-url");

      // Verifying track was added to cache after successful DB fetch
      expect(isTrackInCache("db-guild-3", "db-track-url")).toBe(true);
    });
  });

  describe("getFormattedTrackDescription()", () => {
    const standardUrl = "https://youtube.com/watch?v=123";
    const spotifyUrl = "https://open.spotify.com/track/123";
    const deezerUrl = "https://www.deezer.com/track/123";

    it("should return 'N/A' if track is null", () => {
      expect(getFormattedTrackDescription(null, null)).toEqual("N/A");
    });

    it("should format standard track without author if queue is null", () => {
      const track = { title: "Song", url: standardUrl } as any;
      expect(getFormattedTrackDescription(track, null)).toEqual(
        "[Song](https://youtube.com/watch?v=123)"
      );
    });

    it("should format spotify track with author if queue is null", () => {
      const track = { title: "Song", url: spotifyUrl, author: "Artist" } as any;
      expect(getFormattedTrackDescription(track, null)).toEqual(
        "[Song](https://open.spotify.com/track/123) - Artist"
      );
    });

    it("should format deezer track with author if queue is null", () => {
      const track = {
        title: "Song2",
        url: deezerUrl,
        author: "Artist2",
      } as any;
      expect(getFormattedTrackDescription(track, null)).toEqual(
        "[Song2](https://www.deezer.com/track/123) - Artist2"
      );
    });

    it("should append total time if the specified track is the currently playing track", () => {
      const track = { id: "track-1", title: "Song", url: standardUrl } as any;
      const queue = {
        currentTrack: { id: "track-1" },
        node: { getTimestamp: () => ({ total: { label: "3:45" } }) },
      } as any;

      expect(getFormattedTrackDescription(track, queue)).toEqual(
        "[Song](https://youtube.com/watch?v=123) [3:45]"
      );
    });

    it("should not append total time if the specified track is not the current track", () => {
      const track = { id: "track-1", title: "Song", url: standardUrl } as any;
      const queue = {
        currentTrack: { id: "track-2" }, // Different track is playing
        node: { getTimestamp: () => ({ total: { label: "3:45" } }) },
      } as any;

      expect(getFormattedTrackDescription(track, queue)).toEqual(
        "[Song](https://youtube.com/watch?v=123)"
      );
    });
  });

  describe("getTrackRequestedByFooterText()", () => {
    const mockT = jest.fn((key: string, vars: any) => {
      return `${key} ${JSON.stringify(vars)}`;
    });

    beforeEach(() => {
      (useTranslations as jest.Mock).mockReturnValue(mockT);
    });

    it("should build requested by text successfully for a given user", async () => {
      const mockDiscordUser = { id: "u1", toString: () => "<@u1>" } as any;
      (db.findUser as jest.Mock).mockResolvedValue({ level: 5 });
      (getRankTitleWithEmoji as jest.Mock).mockReturnValue("Pro 🔴");

      const result = await getTrackRequestedByFooterText(
        mockDiscordUser,
        "guild1"
      );

      expect(db.findUser).toHaveBeenCalledWith("guild1", "u1");
      expect(getRankTitleWithEmoji).toHaveBeenCalledWith(5);
      expect(mockT).toHaveBeenCalledWith("common.trackRequestedBy", {
        user: "<@u1>",
        userRank: "Pro 🔴",
      });
      expect(result).toEqual(
        `common.trackRequestedBy {"user":"<@u1>","userRank":"Pro 🔴"}`
      );
    });

    it("should handle null discordUser gracefully", async () => {
      // When discord user is null, should fallback to unknown and empty ID check
      (db.findUser as jest.Mock).mockResolvedValue(null);
      (getRankTitleWithEmoji as jest.Mock).mockReturnValue("Beginner 🟢");

      // Override t specifically for 'common.unknown'
      mockT.mockImplementation((key: string, vars: any) => {
        if (key === "common.unknown") return "Unknown User";
        return `${key} ${JSON.stringify(vars)}`;
      });

      const result = await getTrackRequestedByFooterText(null, "guild1");

      expect(db.findUser).toHaveBeenCalledWith("guild1", "");
      expect(getRankTitleWithEmoji).toHaveBeenCalledWith(0);
      expect(mockT).toHaveBeenCalledWith("common.trackRequestedBy", {
        user: "Unknown User",
        userRank: "Beginner 🟢",
      });
    });
  });

  describe("getBossTracks()", () => {
    const mockPlayer = {
      search: jest.fn(),
    } as any;
    const mockRequestedBy = { id: "u1" } as any;

    it("should throw an Error if no track URLs are found in the DB", async () => {
      (db.findBossTracksByType as jest.Mock).mockResolvedValue([]);

      await expect(
        getBossTracks("general" as any, mockPlayer, mockRequestedBy)
      ).rejects.toThrow("⚠️ No boss tracks found!");
    });

    it("should iterate through track URLs, search for them, and return playable tracks", async () => {
      const trackUrls = ["url1", "url2"];
      (db.findBossTracksByType as jest.Mock).mockResolvedValue(trackUrls);
      (getSearchEngine as jest.Mock).mockImplementation(
        (url) => `engine-for-${url}`
      );

      // First result returns a track, second result fails
      mockPlayer.search.mockResolvedValueOnce({
        hasTracks: () => true,
        tracks: [{ id: "t1", url: "url1" }],
      });
      mockPlayer.search.mockResolvedValueOnce({
        hasTracks: () => false,
        tracks: [],
      });

      // Keep console.warn quiet during test
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();

      const tracks = await getBossTracks(
        "general" as any,
        mockPlayer,
        mockRequestedBy
      );

      // Verify DB fetch
      expect(db.findBossTracksByType).toHaveBeenCalledWith("general");

      // Verify search call for url1
      expect(mockPlayer.search).toHaveBeenCalledWith("url1", {
        requestedBy: mockRequestedBy,
        searchEngine: "engine-for-url1",
      });
      // Verify search call for url2
      expect(mockPlayer.search).toHaveBeenCalledWith("url2", {
        requestedBy: mockRequestedBy,
        searchEngine: "engine-for-url2",
      });

      // Only the first track should be returned
      expect(tracks).toHaveLength(1);
      expect(tracks[0]).toEqual({ id: "t1", url: "url1" });

      // Verify console warn for missing track
      expect(warnSpy).toHaveBeenCalledWith(
        "⚠️ No playable tracks found for: url2"
      );

      warnSpy.mockRestore();
    });
  });

  describe("getPlaylistChoices()", () => {
    const mockRespond = jest.fn();
    const mockInteraction = {
      guildId: "guild-1",
      respond: mockRespond,
    } as any;

    const mockT = jest.fn((key: string) => {
      if (key === "common.empty") return "Empty";
      if (key === "common.track") return "Track";
      if (key === "common.tracks") return "Tracks";
      return key;
    });

    beforeEach(() => {
      (useTranslations as jest.Mock).mockReturnValue(mockT);
      mockRespond.mockClear();
    });

    it("should respond with correctly formatted choices for empty, singular, and plural playlists", async () => {
      (db.findPlaylistsByGuildId as jest.Mock).mockResolvedValue([
        { id: "p1", name: "Empty Playlist", trackUrls: [] },
        { id: "p2", name: "Singular Playlist", trackUrls: ["url1"] },
        { id: "p3", name: "Plural Playlist", trackUrls: ["url1", "url2"] },
      ]);

      await getPlaylistChoices(mockInteraction);

      expect(useTranslations).toHaveBeenCalledWith("guild-1");
      expect(db.findPlaylistsByGuildId).toHaveBeenCalledWith("guild-1");
      expect(mockRespond).toHaveBeenCalledWith([
        { name: "Empty Playlist — (Empty)", value: "p1" },
        { name: "Singular Playlist — (1 Track)", value: "p2" },
        { name: "Plural Playlist — (2 Tracks)", value: "p3" },
      ]);
    });

    it("should handle null guildId safely", async () => {
      const emptyInteraction = { respond: mockRespond } as any;
      (db.findPlaylistsByGuildId as jest.Mock).mockResolvedValue([]);

      await getPlaylistChoices(emptyInteraction);

      expect(useTranslations).toHaveBeenCalledWith("");
      expect(db.findPlaylistsByGuildId).toHaveBeenCalledWith("");
      expect(mockRespond).toHaveBeenCalledWith([]);
    });

    it("should handle no playlists found", async () => {
      (db.findPlaylistsByGuildId as jest.Mock).mockResolvedValue([]);

      await getPlaylistChoices(mockInteraction);

      expect(useTranslations).toHaveBeenCalledWith("guild-1");
      expect(db.findPlaylistsByGuildId).toHaveBeenCalledWith("guild-1");
      expect(mockRespond).toHaveBeenCalledWith([]);
    });
  });
});
