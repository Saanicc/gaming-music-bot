/**
 * Tests for src/db/bossTrack.ts
 */
import {
  findBossTrackByUrl,
  createBossTrack,
  findBossTracksByType,
} from "../bossTrack";
import { BossTrack } from "../schemas/BossTrack";

jest.mock("../schemas/BossTrack", () => ({
  BossTrack: {
    findOne: jest.fn(),
    create: jest.fn(),
    find: jest.fn(),
  },
}));

describe("BossTrack Database Service (bossTrack.ts)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findBossTrackByUrl()", () => {
    it("should successfully lookup references mapped exactly to the URL string", async () => {
      const mockResult = { trackUrl: "https://test.url", trackType: "horn" };
      (BossTrack.findOne as jest.Mock).mockResolvedValueOnce(mockResult);

      const payload = await findBossTrackByUrl("https://test.url");

      expect(BossTrack.findOne).toHaveBeenCalledWith({
        trackUrl: "https://test.url",
      });
      expect(payload).toEqual(mockResult);
    });
  });

  describe("createBossTrack()", () => {
    it("should issue creation parameters flawlessly inserting new records natively", async () => {
      const mockResult = { trackUrl: "https://new.url", trackType: "song" };
      (BossTrack.create as jest.Mock).mockResolvedValueOnce(mockResult);

      const payload = await createBossTrack("https://new.url", "song");

      expect(BossTrack.create).toHaveBeenCalledWith({
        trackUrl: "https://new.url",
        trackType: "song",
      });
      expect(payload).toEqual(mockResult);
    });
  });

  describe("findBossTracksByType()", () => {
    it("should accurately query and cleanly destruct mapping exclusively into primitive URL strings natively", async () => {
      const mockQueryResolves = [
        { trackUrl: "https://boss.1", trackType: "song" },
        { trackUrl: "https://boss.2", trackType: "song" },
      ];

      (BossTrack.find as jest.Mock).mockResolvedValueOnce(mockQueryResolves);

      const payload = await findBossTracksByType("song");

      expect(BossTrack.find).toHaveBeenCalledWith({ trackType: "song" });

      // Asserts mapping resolves stripping everything cleanly leaving simple arrays securely
      expect(payload).toEqual(["https://boss.1", "https://boss.2"]);
    });

    it("should safely return empty arrays instead of throwing natively if collection is unpopulated", async () => {
      (BossTrack.find as jest.Mock).mockResolvedValueOnce([]);

      const payload = await findBossTracksByType("horn");

      expect(payload).toEqual([]);
    });
  });
});
