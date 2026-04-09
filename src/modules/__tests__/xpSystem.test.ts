/**
 * Tests for src/modules/xpSystem.ts
 */

jest.mock("@/root/bot-config.json", () => ({
  leveling: {
    xpBase: 100,
    xpCooldownTime: 60000, // 1 minute
    treasureCooldownTime: 300000, // 5 minutes
    formula: {
      base: 100,
      multiplier: 10,
      exponent: 2,
    },
  },
}));

import { db } from "../../db";
import { getRequiredXP, getXPToNextRank, addXP } from "../xpSystem";

jest.mock("../../db", () => ({
  db: {
    findOrCreateUser: jest.fn(),
  },
}));

describe("XP System Module (xpSystem.ts)", () => {
  let mockUser: any;
  let mathRandomSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2020-01-01T00:00:00Z").getTime());

    mockUser = {
      xp: 0,
      level: 0,
      totalXp: 0,
      totalPlays: 0,
      totalBossPlays: 0,
      lastXP: undefined,
      lastTreasure: undefined,
      save: jest.fn().mockResolvedValue(true),
      toObject: jest.fn().mockReturnValue({
        xp: 0,
        level: 0,
        totalPlays: 0,
      }),
    };

    (db.findOrCreateUser as jest.Mock).mockResolvedValue(mockUser);
    mathRandomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5); // Default to losing treasure rolls safely
  });

  afterEach(() => {
    jest.useRealTimers();
    mathRandomSpy.mockRestore();
  });

  describe("getRequiredXP() & getXPToNextRank()", () => {
    it("should compute leveling thresholds accurately driven by config.json parameters", () => {
      // Formula: 100 + (level * 10) ^ 2
      expect(getRequiredXP(0)).toBe(100);
      expect(getRequiredXP(1)).toBe(200); // 100 + 100
      expect(getRequiredXP(2)).toBe(500); // 100 + 400
      expect(getRequiredXP(3)).toBe(1000); // 100 + 900
    });

    it("should calculate remaining xp needed nicely via getXPToNextRank", () => {
      expect(getXPToNextRank(1, 50)).toBe(150); // 200 req - 50 = 150
      expect(getXPToNextRank(2, 499)).toBe(1); // 500 req - 499 = 1
    });
  });

  describe("addXP() Progression Engine", () => {
    it("should process standard execution mapped linearly tracking plays over basic XP yields", async () => {
      const payload = await addXP("guild-1", "u-1", "play");

      expect(db.findOrCreateUser).toHaveBeenCalledWith("guild-1", "u-1");
      expect(payload.noXP).toBe(false);
      expect(payload.gainedXP).toBe(100);
      expect(payload.leveledUp).toBe(true); // L0 (100 req) -> exactly 100 xp nets Level 1!
      expect(payload.levelsGained).toBe(1);

      expect(mockUser.xp).toBe(0); // Remainder overflow
      expect(mockUser.level).toBe(1);
      expect(mockUser.totalPlays).toBe(1); // Standard play incremented
      expect(mockUser.totalBossPlays).toBe(0);
      expect(mockUser.lastXP).toBeDefined();
      expect(mockUser.save).toHaveBeenCalled();
    });

    it("should intercept execution early if attempting to gain XP inside the active general cooldown window", async () => {
      mockUser.lastXP = new Date("2020-01-01T00:00:00Z"); // Set identical to current active date mock

      const payload = await addXP("guild-1", "u-1", "play");

      expect(payload.noXP).toBe(true);
      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it("should accurately track tracking payload mutations when mapped via 'play_boss_music' instead of standard 'play'", async () => {
      await addXP("guild-1", "u-1", "play_boss_music");

      expect(mockUser.totalPlays).toBe(0);
      expect(mockUser.totalBossPlays).toBe(1); // Boss tracking payload evaluated
    });

    describe("Multi-Tier Leveling Loop Validation", () => {
      it("should seamlessly cascade massive XP injections through multiple levels dynamically", async () => {
        // We bypass random and manually inject XP to test the while loop natively
        // Level 0 requires 100
        // Level 1 requires 200
        // Level 2 requires 500
        // Total to reach Level 3 with exactly 0 remainder = 800 XP total!
        mathRandomSpy
          .mockReturnValueOnce(0.05) // Trigger treasure ( < 0.1 )
          .mockReturnValueOnce(0.0005); // Tier 1 multiplier gives us 100x XP (10,000 XP)

        const payload = await addXP("guild-1", "u-1", "play");

        expect(payload.leveledUp).toBe(true);
        expect(payload.gainedXP).toBe(10000); // 100 base * 100 multiplier

        // Calculate expected cascading
        // 10000
        // - L0 (100) = 9900 | L1
        // - L1 (200) = 9700 | L2
        // - L2 (500) = 9200 | L3
        // - L3 (1000) = 8200 | L4
        // - L4 (1700) = 6500 | L5
        // - L5 (2600) = 3900 | L6
        // - L6 (3700) = 200 | L7 (req: 5000 -> insufficient)

        expect(mockUser.level).toBe(7);
        expect(mockUser.xp).toBe(200); // Remainder
        expect(payload.levelsGained).toBe(7);
      });
    });

    describe("Treasure Mechanism", () => {
      it("should trigger successful treasure pulls randomly and multiply yielding drops predictably based on tiers", async () => {
        mathRandomSpy
          .mockReturnValueOnce(0.05) // Win treasure bounds ( < 0.1 )
          .mockReturnValueOnce(0.15); // Tier rolls < 0.2 bounds evaluate to '* 10'

        const payload = await addXP("guild-1", "u-1", "play");

        expect(payload.treasure).toBe(true);
        expect(payload.gainedXP).toBe(1000); // 100 base * 10
        expect(mockUser.lastTreasure).toBeDefined();
      });

      it("should forcefully deny treasure injections if inside the active TREASURE cooldown", async () => {
        // Last treasure found only 1 minute ago internally
        mockUser.lastTreasure = new Date("2019-12-31T23:59:00Z");

        mathRandomSpy.mockReturnValueOnce(0.05); // Normally would win treasure

        const payload = await addXP("guild-1", "u-1", "play");

        // Evaluates false logically because inside 5min (300000ms) cooldown restriction
        expect(payload.treasure).toBe(false);
        expect(payload.gainedXP).toBe(100); // Yields basic non-multiplied XP safely
      });
    });
  });
});
