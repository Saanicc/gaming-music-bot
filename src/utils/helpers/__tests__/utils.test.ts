/**
 * Tests for utility functions in src/utils/helpers/utils.ts
 */
import {
  getRandomFightGif,
  getTreasureInfo,
  getSearchEngine,
  capitalize,
  delay,
  getThumbnail,
  removeWww,
} from "../utils";

// Mock discord player extractors because they might attempt runtime things we don't want
jest.mock("discord-player-soundcloud", () => ({
  SoundcloudExtractor: {
    identifier: "soundcloud-ext-id",
  },
}));

jest.mock("discord-player-deezer", () => ({
  DeezerExtractor: {
    identifier: "deezer-ext-id",
  },
}));

// Mock the emojis so they don't depend on actual definitions
jest.mock("../../constants/emojis", () => ({
  xpEmoji: {
    legendary: "🔥",
    epic: "⚡",
    rare: "💎",
    gold: "🪙",
    coins: "🟡",
  },
}));

describe("Helper Utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getRandomFightGif()", () => {
    it("should return a string URL containing tenorgif or giphy", async () => {
      const gif = await getRandomFightGif();
      expect(typeof gif).toBe("string");
      expect(gif.startsWith("http")).toBe(true);
    });

    it("should return predictable value when Math.random is mocked", async () => {
      const mockMathRandom = jest.spyOn(Math, "random").mockReturnValue(0);
      const gifFirst = await getRandomFightGif();
      expect(gifFirst).toEqual(
        "https://c.tenor.com/oLvqOD4_sPUAAAAd/tenor.gif"
      );

      mockMathRandom.mockReturnValue(0.99); // last element
      const gifLast = await getRandomFightGif();
      expect(gifLast).toEqual(
        "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2xvcnZ3YWJ1eHI0bTNnZmxieG90aW1tendlMzI1ZGxzcHdkcjJvcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EBDuUkEh5ctI7augD8/giphy.gif"
      );

      mockMathRandom.mockRestore(); // restore original
    });
  });

  describe("getTreasureInfo()", () => {
    // A mock translation function that returns a verifiable string
    const mockT = jest.fn((key: string, vars?: any) => {
      const varsString = vars ? JSON.stringify(vars) : "";
      return `${key} ${varsString}`;
    });

    beforeEach(() => {
      mockT.mockClear();
    });

    it("should return undefined if gainedXP is 0 or undefined", () => {
      expect(getTreasureInfo("user1", 0, mockT as any)).toBeUndefined();
    });

    it("should return legendary tier for xp >= 200", () => {
      const result = getTreasureInfo("user1", 200, mockT as any);
      expect(result).toEqual({
        title: `levelSystem.treasure.legendary.title {"emoji":"🔥"}`,
        description: `levelSystem.treasure.legendary.message {"user":"user1"} (+200 XP)`,
      });
    });

    it("should return epic tier for 100 <= xp < 200", () => {
      const result = getTreasureInfo("user1", 150, mockT as any);
      expect(result).toEqual({
        title: `levelSystem.treasure.epic.title {"emoji":"⚡"}`,
        description: `levelSystem.treasure.epic.message {"user":"user1"} (+150 XP)`,
      });
    });

    it("should return rare tier for 50 <= xp < 100", () => {
      const result = getTreasureInfo("user1", 50, mockT as any);
      expect(result).toEqual({
        title: `levelSystem.treasure.rare.title {"emoji":"💎"}`,
        description: `levelSystem.treasure.rare.message {"user":"user1"} (+50 XP)`,
      });
    });

    it("should return lucky tier for 20 <= xp < 50", () => {
      const result = getTreasureInfo("user1", 20, mockT as any);
      expect(result).toEqual({
        title: `levelSystem.treasure.lucky.title {"emoji":"🪙"}`,
        description: `levelSystem.treasure.lucky.message {"user":"user1"} (+20 XP)`,
      });
    });

    it("should return small tier for xp < 20", () => {
      const result = getTreasureInfo("user1", 10, mockT as any);
      expect(result).toEqual({
        title: `levelSystem.treasure.small.title {"emoji":"🟡"}`,
        description: `levelSystem.treasure.small.message {"user":"user1"} (+10 XP)`,
      });
    });
  });

  describe("getSearchEngine()", () => {
    it("should return soundcloud extractor for soundcloud.com queries", () => {
      expect(getSearchEngine("https://soundcloud.com/some/track")).toEqual(
        "ext:soundcloud-ext-id"
      );
    });

    it("should return deezer extractor for deezer.com queries", () => {
      expect(getSearchEngine("https://deezer.com/track/123")).toEqual(
        "ext:deezer-ext-id"
      );
    });

    it("should return undefined for other queries", () => {
      expect(
        getSearchEngine("https://youtube.com/watch?v=123")
      ).toBeUndefined();
      expect(getSearchEngine("ytsearch:hello")).toBeUndefined();
      expect(getSearchEngine("spotify track")).toBeUndefined();
    });

    it("should handle case insensitivity", () => {
      expect(getSearchEngine("HTTPS://SOUNDCLOUD.COM/TRack")).toEqual(
        "ext:soundcloud-ext-id"
      );
    });
  });

  describe("capitalize()", () => {
    it("should capitalize the first letter of a string", () => {
      expect(capitalize("hello")).toEqual("Hello");
      expect(capitalize("world")).toEqual("World");
    });

    it("should not modify strings that are already capitalized", () => {
      expect(capitalize("Hello")).toEqual("Hello");
    });

    it("should handle empty strings", () => {
      expect(capitalize("")).toEqual("");
    });
  });

  describe("delay()", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should resolve after the specified time", async () => {
      const ms = 1000;
      const promise = delay(ms);

      // Fast-forward time by 1000ms
      jest.advanceTimersByTime(ms);

      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe("getThumbnail()", () => {
    const DEFAULT_THUMBNAIL =
      "https://freesvg.org/storage/img/thumb/vinyl-plokstele.png";

    it("should return the default thumbnail if obj is null or undefined", () => {
      expect(getThumbnail(null)).toEqual(DEFAULT_THUMBNAIL);
      expect(getThumbnail(undefined)).toEqual(DEFAULT_THUMBNAIL);
    });

    it("should return the default thumbnail if obj.thumbnail is missing", () => {
      // @ts-ignore
      expect(getThumbnail({})).toEqual(DEFAULT_THUMBNAIL);
    });

    it("should return the object thumbnail if present", () => {
      const mockTrack = { thumbnail: "https://example.com/thumb.png" };
      // @ts-ignore
      expect(getThumbnail(mockTrack)).toEqual(mockTrack.thumbnail);
    });
  });

  describe("removeWww()", () => {
    it("should remove www. from http://www. URLs", () => {
      expect(removeWww("http://www.google.com")).toEqual("http://google.com");
    });

    it("should remove www. from https://www. URLs", () => {
      expect(removeWww("https://www.google.com")).toEqual("https://google.com");
    });

    it("should not remove www. if it is not preceded by http/https", () => {
      // The regex ^(https?:\/\/)www\. requires scheme protocol.
      // If there's no scheme protocol, it won't match.
      expect(removeWww("www.google.com")).toEqual("www.google.com");
    });

    it("should not modify URLs that do not have www.", () => {
      expect(removeWww("https://google.com")).toEqual("https://google.com");
      expect(removeWww("http://example.com")).toEqual("http://example.com");
    });
  });
});
