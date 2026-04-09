/**
 * Tests for src/db/user.ts
 */
import { User } from "../schemas/User";
import {
  findUser,
  findOrCreateUser,
  findUsersByGuild,
  updateUserQuizStats,
} from "../user";

const mockChainableFind = {
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([{ id: "u1" }]),
};

jest.mock("../schemas/User", () => ({
  User: {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    find: jest.fn().mockReturnValue({}),
    updateOne: jest.fn(),
  },
}));

describe("User Database Service (user.ts)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (User.find as jest.Mock).mockReturnValue(mockChainableFind);
  });

  describe("findUser()", () => {
    it("should return null instantly natively if userId is implicitly falsy", async () => {
      const payload = await findUser("guild-1", "");
      expect(payload).toBeNull();
      expect(User.findOne).not.toHaveBeenCalled();
    });

    it("should invoke findOne cleanly wrapped inside the guild isolation parameters", async () => {
      (User.findOne as jest.Mock).mockResolvedValueOnce({ xp: 10 });
      const payload = await findUser("guild-1", "u-1");

      expect(User.findOne).toHaveBeenCalledWith({
        guildId: "guild-1",
        userId: "u-1",
      });
      expect(payload).toEqual({ xp: 10 });
    });
  });

  describe("findOrCreateUser()", () => {
    it("should execute a findOneAndUpdate with strict upsert initialization parameters", async () => {
      (User.findOneAndUpdate as jest.Mock).mockResolvedValueOnce({ xp: 0 });
      const payload = await findOrCreateUser("guild-1", "u-1");

      expect(User.findOneAndUpdate).toHaveBeenCalledWith(
        { guildId: "guild-1", userId: "u-1" },
        { $setOnInsert: { guildId: "guild-1", userId: "u-1" } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      expect(payload).toEqual({ xp: 0 });
    });
  });

  describe("findUsersByGuild()", () => {
    it("should successfully structure a complex chainable Mongoose find mapping limit and sorts sequentially", async () => {
      const payload = await findUsersByGuild("guild-1", ["u-1", "u-2"], {
        sort: { totalXp: -1 },
        limit: 15,
      });

      expect(User.find).toHaveBeenCalledWith({
        guildId: "guild-1",
        userId: { $in: ["u-1", "u-2"] },
      });
      expect(mockChainableFind.sort).toHaveBeenCalledWith({ totalXp: -1 });
      expect(mockChainableFind.limit).toHaveBeenCalledWith(15);
      expect(mockChainableFind.lean).toHaveBeenCalled();

      expect(payload).toEqual([{ id: "u1" }]);
    });
  });

  describe("updateUserQuizStats()", () => {
    it("should correctly increment tracking logic assigning 1 entire win uniquely to positive outcomes", async () => {
      await updateUserQuizStats("guild-1", "u-1", {
        won: true,
        correctAnswers: 5,
      });

      expect(User.updateOne).toHaveBeenCalledWith(
        { guildId: "guild-1", userId: "u-1" },
        {
          $inc: {
            "quizStats.totalWins": 1,
            "quizStats.totalCorrectAnswers": 5,
          },
          $setOnInsert: expect.any(Object), // Checks initialization mappings blindly
        },
        { upsert: true }
      );
    });

    it("should correctly increment zero wins identically when the user loses a matched quiz seamlessly", async () => {
      await updateUserQuizStats("guild-1", "u-2", {
        won: false, // lost
        correctAnswers: 2,
      });

      expect(User.updateOne).toHaveBeenCalledWith(
        { guildId: "guild-1", userId: "u-2" },
        {
          $inc: {
            "quizStats.totalWins": 0,
            "quizStats.totalCorrectAnswers": 2,
          },
          $setOnInsert: expect.any(Object),
        },
        { upsert: true }
      );
    });

    it("should reliably attach standard system fallback primitives if triggering an upsert schema build natively", async () => {
      await updateUserQuizStats("guild-1", "u-1", {
        won: true,
        correctAnswers: 1,
      });

      const providedMapping = (User.updateOne as jest.Mock).mock.calls[0][1];

      // Verifies strict `$setOnInsert` bounds map over perfectly preventing config skewing missing fields implicitly
      expect(providedMapping.$setOnInsert).toEqual({
        guildId: "guild-1",
        userId: "u-1",
        lastXP: null,
        lastTreasure: null,
        xp: 0,
        level: 1,
        totalXp: 0,
        totalPlays: 0,
        totalBossPlays: 0,
      });
    });
  });
});
