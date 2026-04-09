/**
 * Tests for src/utils/helpers/user.ts
 */
import { updateUserQuizStats, updateUserLevel } from "../user";
import { db } from "@/db";
import { addXP } from "@/modules/xpSystem";
import { getRankTitleWithEmoji } from "@/modules/rankSystem";
import { buildMessage } from "../../bot-message/buildMessage";
import { getTreasureInfo } from "../utils";
import { useTranslations } from "../../hooks/useTranslations";

jest.mock("@/db", () => ({
  db: {
    updateUserQuizStats: jest.fn(),
  },
}));

jest.mock("@/modules/xpSystem", () => ({
  addXP: jest.fn(),
}));

jest.mock("@/modules/rankSystem", () => ({
  getRankTitleWithEmoji: jest.fn(),
}));

jest.mock("../../bot-message/buildMessage", () => ({
  buildMessage: jest.fn(),
}));

jest.mock("../utils", () => ({
  getTreasureInfo: jest.fn(),
}));

jest.mock("../../hooks/useTranslations", () => ({
  useTranslations: jest.fn(),
}));

jest.mock("../../constants/emojis", () => ({
  emoji: {
    levelup: "🆙",
  },
}));

describe("User Helpers (user.ts)", () => {
  const mockSend = jest.fn();
  const mockInteraction: any = {
    user: {
      id: "u123",
      toString: () => "<@u123>",
    },
    channel: {
      send: mockSend,
    },
  };

  const mockT = jest.fn((key: string, vars?: any) => {
    return `${key}${vars ? " " + JSON.stringify(vars) : ""}`;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslations as jest.Mock).mockReturnValue(mockT);
    (buildMessage as jest.Mock).mockImplementation((opts) => opts);
  });

  describe("updateUserQuizStats()", () => {
    it("should call db.updateUserQuizStats with correct parameters", async () => {
      const stats = { won: true, correctAnswers: 5 };
      await updateUserQuizStats("guild1", "user1", stats);

      expect(db.updateUserQuizStats).toHaveBeenCalledWith(
        "guild1",
        "user1",
        stats
      );
    });
  });

  describe("updateUserLevel()", () => {
    it("should return early if addXP indicates noXP (cooldown)", async () => {
      (addXP as jest.Mock).mockResolvedValue({ noXP: true });

      await updateUserLevel(mockInteraction, "guild1", "play" as any);

      expect(addXP).toHaveBeenCalledWith("guild1", "u123", "play");
      expect(getTreasureInfo).not.toHaveBeenCalled();
      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should send treasure message if treasure is granted", async () => {
      (addXP as jest.Mock).mockResolvedValue({
        treasure: true,
        gainedXP: 50,
        user: { level: 2 },
      });
      (getTreasureInfo as jest.Mock).mockReturnValue({
        title: "Treasure found!",
        description: "You got 50 XP",
      });

      await updateUserLevel(mockInteraction, "guild1", "play" as any);

      expect(getTreasureInfo).toHaveBeenCalledWith("<@u123>", 50, mockT);
      expect(buildMessage).toHaveBeenCalledWith({
        title: "Treasure found!",
        description: "You got 50 XP",
      });
      expect(mockSend).toHaveBeenCalledWith({
        title: "Treasure found!",
        description: "You got 50 XP",
      });
    });

    it("should return early without sending treasure if getTreasureInfo returns undefined", async () => {
      (addXP as jest.Mock).mockResolvedValue({
        treasure: true,
        gainedXP: 0,
        user: { level: 2 },
      });
      (getTreasureInfo as jest.Mock).mockReturnValue(undefined);

      await updateUserLevel(mockInteraction, "guild1", "play" as any);

      expect(mockSend).not.toHaveBeenCalled();
    });

    it("should send level up message with singular 'level' when levelsGained is 1", async () => {
      (addXP as jest.Mock).mockResolvedValue({
        leveledUp: true,
        levelsGained: 1,
        user: { level: 3 },
        previousLevel: 2,
      });

      // Ranks are identical, so no rank upgrade message should be added
      (getRankTitleWithEmoji as jest.Mock)
        .mockReturnValueOnce("Beginner 🟢")
        .mockReturnValueOnce("Beginner 🟢");

      await updateUserLevel(mockInteraction, "guild1", "play" as any);

      // Verify pluralization key evaluation for "level"
      expect(mockT).toHaveBeenCalledWith("levelSystem.levelUp.level");

      expect(buildMessage).toHaveBeenCalledWith({
        title: `levelSystem.levelUp.title {"emoji":"🆙"}`,
        description: `levelSystem.levelUp.description {"user":"<@u123>","levelsGained":"1","level":"3","levelText":"levelSystem.levelUp.level"}`,
      });
      expect(mockSend).toHaveBeenCalled();
    });

    it("should send level up message with plural 'levels' when levelsGained > 1", async () => {
      (addXP as jest.Mock).mockResolvedValue({
        leveledUp: true,
        levelsGained: 2,
        user: { level: 4 },
        previousLevel: 2,
      });

      (getRankTitleWithEmoji as jest.Mock).mockReturnValue("Same Rank 🟢");

      await updateUserLevel(mockInteraction, "guild1", "play" as any);

      // Verify pluralization key evaluation for "levels"
      expect(mockT).toHaveBeenCalledWith("levelSystem.levelUp.levels");

      expect(buildMessage).toHaveBeenCalledWith({
        title: `levelSystem.levelUp.title {"emoji":"🆙"}`,
        description: `levelSystem.levelUp.description {"user":"<@u123>","levelsGained":"2","level":"4","levelText":"levelSystem.levelUp.levels"}`,
      });
    });

    it("should append a rank upgrade message if the user's rank changes on level up", async () => {
      (addXP as jest.Mock).mockResolvedValue({
        leveledUp: true,
        levelsGained: 1,
        user: { level: 10 },
        previousLevel: 9,
      });

      // Different ranks mock returning 'old' then 'new'
      (getRankTitleWithEmoji as jest.Mock)
        .mockReturnValueOnce("Beginner 🟢")
        .mockReturnValueOnce("Pro 🔴");

      await updateUserLevel(mockInteraction, "guild1", "play" as any);

      expect(buildMessage).toHaveBeenCalledWith({
        title: `levelSystem.levelUp.title {"emoji":"🆙"}`,
        description: `levelSystem.levelUp.description {"user":"<@u123>","levelsGained":"1","level":"10","levelText":"levelSystem.levelUp.level"}levelSystem.levelUp.rankMessage {"newRank":"Pro 🔴"}`,
      });
    });

    it("should handle BOTH treasure and level up triggered at the same time", async () => {
      (addXP as jest.Mock).mockResolvedValue({
        treasure: true,
        gainedXP: 200,
        leveledUp: true,
        levelsGained: 1,
        user: { level: 11 },
        previousLevel: 10,
      });

      (getTreasureInfo as jest.Mock).mockReturnValue({
        title: "Legendary Drop!",
        description: "Epic loot",
      });
      (getRankTitleWithEmoji as jest.Mock).mockReturnValue("Pro 🔴");

      await updateUserLevel(mockInteraction, "guild1", "play" as any);

      // Both messages are sent
      expect(mockSend).toHaveBeenCalledTimes(2);

      // 1. Treasure
      expect(mockSend).toHaveBeenNthCalledWith(1, {
        title: "Legendary Drop!",
        description: "Epic loot",
      });

      // 2. Level Up
      expect(mockSend).toHaveBeenNthCalledWith(2, {
        title: `levelSystem.levelUp.title {"emoji":"🆙"}`,
        description: `levelSystem.levelUp.description {"user":"<@u123>","levelsGained":"1","level":"11","levelText":"levelSystem.levelUp.level"}`,
      });
    });
  });
});
