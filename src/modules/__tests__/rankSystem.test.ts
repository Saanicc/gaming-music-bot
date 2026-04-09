/**
 * Tests for src/modules/rankSystem.ts
 */

// We must mock the config before importing the module since it evaluates RANKS immediately on load
jest.mock("@/root/bot-config.json", () => ({
  ranks: [
    { minLevel: 100, title: "Diamond", imageUrl: "diamond.png", emoji: "💎" },
    { minLevel: 50, title: "Gold", imageUrl: "gold.png", emoji: "🥇" },
    { minLevel: 0, title: "Bronze", imageUrl: "bronze.png", emoji: "🥉" },
  ],
}));

import {
  RANKS,
  getRankTitle,
  getRankTitleWithEmoji,
  getRankImage,
} from "../rankSystem";

describe("Rank System Module (rankSystem.ts)", () => {
  describe("Static RANKS Evaluation", () => {
    it("should successfully parse config mappings into the strict RankDefinition shape natively on load", () => {
      // Validates mapping config strings to internal model requirements (imageUrl => image, titleWithEmoji dynamic gen)
      expect(RANKS).toHaveLength(3);
      expect(RANKS[0]).toEqual({
        minLevel: 100,
        title: "Diamond",
        titleWithEmoji: "Diamond 💎",
        image: "diamond.png",
        emoji: "💎",
      });
      expect(RANKS[2]).toEqual({
        minLevel: 0,
        title: "Bronze",
        titleWithEmoji: "Bronze 🥉",
        image: "bronze.png",
        emoji: "🥉",
      });
    });
  });

  describe("Rank Check Functions", () => {
    it("getRankTitle should return the correct boundary thresholds finding the highest eligible tier", () => {
      // Evaluates above top bound
      expect(getRankTitle(150)).toBe("Diamond");
      // Evaluates edge case exactly on top bound
      expect(getRankTitle(100)).toBe("Diamond");
      // Evaluates mid-tier overlapping limits
      expect(getRankTitle(55)).toBe("Gold");
      // Evaluates absolute bottom limits implicitly
      expect(getRankTitle(1)).toBe("Bronze");
    });

    it("getRankTitleWithEmoji should return cleanly mapped strings bound correctly to thresholds", () => {
      expect(getRankTitleWithEmoji(110)).toBe("Diamond 💎");
      expect(getRankTitleWithEmoji(50)).toBe("Gold 🥇");
      expect(getRankTitleWithEmoji(0)).toBe("Bronze 🥉");
    });

    it("getRankImage should return accurately mapped config image urls via thresholds", () => {
      expect(getRankImage(200)).toBe("diamond.png");
      expect(getRankImage(99)).toBe("gold.png");
      expect(getRankImage(49)).toBe("bronze.png");
    });

    it("should safely fallback to the lowest possible threshold limit if limits somehow evaluate lower than native 0 (or empty searches)", () => {
      // Assuming a negative number somehow propagates during cache desyncs
      expect(getRankTitle(-10)).toBe("Bronze");
      expect(getRankTitleWithEmoji(-20)).toBe("Bronze 🥉");
      expect(getRankImage(-30)).toBe("bronze.png");
    });
  });
});
