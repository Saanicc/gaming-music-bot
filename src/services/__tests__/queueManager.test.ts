/**
 * Tests for src/services/queueManager.ts
 */
import { queueManager, StoredQueue } from "../queueManager";

describe("Queue Manager Service (queueManager.ts)", () => {
  beforeEach(() => {
    // We can't clear the localized map strictly via a standard accessor
    // However we can mutate it manually using existing methods to ensure pristine state
    queueManager.clear("guild-1");
    queueManager.clear("guild-2");
    queueManager.setGuildQueueType("guild-1", "normal");
  });

  describe("store() & retrieve()", () => {
    it("should return undefined if a guild has not stored a queue", () => {
      expect(queueManager.retrieve("guild-1")).toBeUndefined();
    });

    it("should accurately store and retrieve a queue state for a guild", () => {
      const mockPayload: StoredQueue = {
        tracks: [{ id: "track1" }] as any,
        queueType: "normal",
        position: 4500,
      };

      queueManager.store("guild-1", mockPayload);

      const result = queueManager.retrieve("guild-1");
      expect(result).toStrictEqual(mockPayload);
    });

    it("should overwrite gracefully when storing a new queue on top of an old one", () => {
      const payloadOne: StoredQueue = { tracks: [], queueType: "normal" };
      const payloadTwo: StoredQueue = {
        tracks: [],
        queueType: "boss",
        position: 55,
      };

      queueManager.store("guild-1", payloadOne);
      expect(queueManager.retrieve("guild-1")).toStrictEqual(payloadOne);

      queueManager.store("guild-1", payloadTwo);
      expect(queueManager.retrieve("guild-1")).toStrictEqual(payloadTwo);
    });

    it("should operate independently across distinct guilds", () => {
      const g1Payload: StoredQueue = { tracks: [], queueType: "normal" };
      const g2Payload: StoredQueue = { tracks: [], queueType: "boss" };

      queueManager.store("guild-1", g1Payload);
      queueManager.store("guild-2", g2Payload);

      expect(queueManager.retrieve("guild-1")).toStrictEqual(g1Payload);
      expect(queueManager.retrieve("guild-2")).toStrictEqual(g2Payload);
    });
  });

  describe("clear()", () => {
    it("should cleanly wipe the guild from memory", () => {
      queueManager.store("guild-1", { tracks: [], queueType: "normal" });

      expect(queueManager.retrieve("guild-1")).not.toBeUndefined();

      queueManager.clear("guild-1");

      expect(queueManager.retrieve("guild-1")).toBeUndefined();
    });

    it("should additionally reset overarching global queue type natively back to 'normal'", () => {
      queueManager.setGuildQueueType("guild-1", "boss");
      expect(queueManager.getGuildQueueType("guild-1")).toBe("boss");

      queueManager.clear("guild-1");

      expect(queueManager.getGuildQueueType("guild-1")).toBe("normal");
    });
  });

  describe("setQueueType() & getQueueType()", () => {
    it("should accurately toggle overall state flag properly", () => {
      expect(queueManager.getGuildQueueType("guild-1")).toBe("normal"); // Explicit base state

      queueManager.setGuildQueueType("guild-1", "boss");
      expect(queueManager.getGuildQueueType("guild-1")).toBe("boss");

      queueManager.setGuildQueueType("guild-1", "normal");
      expect(queueManager.getGuildQueueType("guild-1")).toBe("normal");
    });
  });
});
