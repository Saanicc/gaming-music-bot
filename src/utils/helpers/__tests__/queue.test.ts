/**
 * Tests for src/utils/helpers/queue.ts
 */
import {
  restoreOldQueue,
  savePreviousQueue,
  withTasksQueue,
  getQueuePosition,
  isTrackInQueue,
} from "../queue";
import { queueManager } from "@/services/queueManager";
import { useMainPlayer } from "discord-player";
import { joinVoiceChannel } from "../system";
import { getSearchEngine } from "../utils";

jest.mock("@/services/queueManager", () => ({
  queueManager: {
    clear: jest.fn(),
    store: jest.fn(),
  },
}));

jest.mock("discord-player", () => ({
  useMainPlayer: jest.fn(),
}));

jest.mock("../system", () => ({
  joinVoiceChannel: jest.fn(),
}));

jest.mock("../utils", () => ({
  getSearchEngine: jest.fn(),
}));

describe("Queue Helpers (queue.ts)", () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe("restoreOldQueue()", () => {
    const mockGuild = { id: "guild-1" } as any;
    let mockVoiceChannel: any;
    let mockTextChannel: any;
    let mockStoredQueue: any;
    let mockPlayerNodeCreate: jest.Mock;
    let mockPlayerSearch: jest.Mock;
    let mockNewQueue: any;

    beforeEach(() => {
      mockVoiceChannel = { isVoiceBased: () => true };
      mockTextChannel = { id: "tc-1" };
      mockStoredQueue = {
        currentTrack: { url: "current-url", title: "Current" },
        tracks: [{ url: "track1", title: "T1" }],
        position: 1000,
      };

      mockNewQueue = {
        connection: true,
        addTrack: jest.fn(),
        node: {
          play: jest.fn(),
        },
      };

      mockPlayerNodeCreate = jest.fn().mockReturnValue(mockNewQueue);
      mockPlayerSearch = jest.fn().mockResolvedValue({
        tracks: [{ url: "resolved-url" }],
      });

      (useMainPlayer as jest.Mock).mockReturnValue({
        nodes: { create: mockPlayerNodeCreate },
        search: mockPlayerSearch,
      });
      (getSearchEngine as jest.Mock).mockReturnValue("engine");
    });

    it("should return early and warn if voiceChannel is invalid", async () => {
      await restoreOldQueue({
        guild: mockGuild,
        storedQueue: mockStoredQueue,
        textChannel: mockTextChannel,
        voiceChannel: { isVoiceBased: () => false } as any, // Invalid
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "No valid voice channel to restore queue for guild-1."
      );
      expect(useMainPlayer).not.toHaveBeenCalled();
    });

    it("should search tracks, populate new queue, play restored track, and clear manager", async () => {
      await restoreOldQueue({
        guild: mockGuild,
        storedQueue: mockStoredQueue,
        textChannel: mockTextChannel,
        voiceChannel: mockVoiceChannel,
      });

      // Assert queue create
      expect(useMainPlayer).toHaveBeenCalled();
      expect(mockPlayerNodeCreate).toHaveBeenCalledWith(mockGuild, {
        metadata: {
          textChannel: mockTextChannel,
          voiceChannel: mockVoiceChannel,
        },
        leaveOnEnd: false,
        leaveOnEmpty: true,
        leaveOnEmptyCooldown: 15000,
      });

      // Assert searching tracks
      expect(mockPlayerSearch).toHaveBeenCalledTimes(2); // 1 currentTrack, 1 in queue list
      expect(mockPlayerSearch).toHaveBeenCalledWith(
        "current-url",
        expect.any(Object)
      );
      expect(mockPlayerSearch).toHaveBeenCalledWith(
        "track1",
        expect.any(Object)
      );

      // Assert track was added to the queue list
      expect(mockNewQueue.addTrack).toHaveBeenCalledWith({
        url: "resolved-url",
      });

      // Assert system join
      expect(joinVoiceChannel).toHaveBeenCalledWith({
        queue: mockNewQueue,
        voiceChannel: mockVoiceChannel,
        textChannel: mockTextChannel,
      });

      // Assert play call with offset metadata
      expect(mockNewQueue.node.play).toHaveBeenCalledWith(
        { url: "resolved-url" },
        { seek: 1000 }
      );

      // Assert manager clear
      expect(queueManager.clear).toHaveBeenCalledWith("guild-1");
    });

    it("should gently skip adding tracks if searching them throws an error or fails", async () => {
      // Intentionally mock the search to throw an error
      mockPlayerSearch.mockRejectedValueOnce(
        new Error("Search failed for current track")
      );
      mockPlayerSearch.mockResolvedValueOnce({ tracks: [] }); // Empty result for the secondary track

      await restoreOldQueue({
        guild: mockGuild,
        storedQueue: mockStoredQueue,
        textChannel: mockTextChannel,
        voiceChannel: mockVoiceChannel,
      });

      // No tracks were validly resolved
      expect(mockNewQueue.addTrack).not.toHaveBeenCalled();

      // Still plays without a focused track payload
      expect(mockNewQueue.node.play).toHaveBeenCalledWith();

      // Should have warned on the thrown exception
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "Failed to restore track: Current",
        expect.any(Error)
      );
    });

    it("should not play anything if connection fails to be established", async () => {
      mockNewQueue.connection = false; // System join failed

      await restoreOldQueue({
        guild: mockGuild,
        storedQueue: mockStoredQueue,
        textChannel: mockTextChannel,
        voiceChannel: mockVoiceChannel,
      });

      expect(mockNewQueue.node.play).not.toHaveBeenCalled();
      // Should not clear the manager manually here since early return hit
      expect(queueManager.clear).not.toHaveBeenCalled();
    });
  });

  describe("savePreviousQueue()", () => {
    it("should extract queue metadata and save to queueManager", async () => {
      const mockQueue = {
        tracks: { toArray: () => [{ id: "t1" }] },
        currentTrack: { id: "c1" },
        node: { getTimestamp: () => ({ current: { value: 1500 } }) },
        metadata: {
          voiceChannel: "vc-meta",
          textChannel: "tc-meta",
        },
      } as any;

      await savePreviousQueue(mockQueue, "guild-save");

      expect(queueManager.store).toHaveBeenCalledWith("guild-save", {
        tracks: [{ id: "t1" }],
        queueType: "normal",
        currentTrack: { id: "c1" },
        position: 1500,
        voiceChannel: "vc-meta",
        textChannel: "tc-meta",
      });
    });
  });

  describe("withTasksQueue()", () => {
    it("should acquire, process, and gracefully release a task lock", async () => {
      const mockTaskEntry = {
        getTask: jest.fn().mockResolvedValue(true),
      };
      const mockQueue = {
        tasksQueue: {
          acquire: jest.fn().mockReturnValue(mockTaskEntry),
          release: jest.fn(),
        },
      } as any;

      const innerTask = jest.fn().mockResolvedValue("operation-result");

      const result = await withTasksQueue(mockQueue, innerTask);

      expect(mockQueue.tasksQueue.acquire).toHaveBeenCalled();
      expect(mockTaskEntry.getTask).toHaveBeenCalled();
      expect(innerTask).toHaveBeenCalled();
      expect(mockQueue.tasksQueue.release).toHaveBeenCalled();
      expect(result).toBe("operation-result");
    });

    it("should release the task lock even if the inner function throws an error", async () => {
      const mockTaskEntry = {
        getTask: jest.fn().mockResolvedValue(true),
      };
      const mockQueue = {
        tasksQueue: {
          acquire: jest.fn().mockReturnValue(mockTaskEntry),
          release: jest.fn(),
        },
      } as any;

      const innerTask = jest
        .fn()
        .mockRejectedValue(new Error("Inner Task Failed"));

      await expect(withTasksQueue(mockQueue, innerTask)).rejects.toThrow(
        "Inner Task Failed"
      );

      expect(mockQueue.tasksQueue.release).toHaveBeenCalled();
    });
  });

  describe("getQueuePosition()", () => {
    it("should return the queue tracks size as a string when there are tracks pending", () => {
      const mockQueue = { tracks: { size: 5 } } as any;
      expect(getQueuePosition(mockQueue)).toBe("5");
    });

    it("should default to 1 if the queue size is 0", () => {
      const mockQueue = { tracks: { size: 0 } } as any;
      expect(getQueuePosition(mockQueue)).toBe("1");
    });
  });

  describe("isTrackInQueue()", () => {
    it("should return true if the track is the current track", () => {
      const mockQueue = {
        currentTrack: { url: "cur-url" },
        tracks: { toArray: () => [] },
      } as any;

      expect(isTrackInQueue(mockQueue, "cur-url")).toBe(true);
    });

    it("should return true if the track exists anywhere in the upcoming list", () => {
      const mockQueue = {
        currentTrack: { url: "cur-url" },
        tracks: {
          toArray: () => [{ url: "some-other" }, { url: "upcoming-url" }],
        },
      } as any;

      expect(isTrackInQueue(mockQueue, "upcoming-url")).toBe(true);
    });

    it("should return false if the track is fully absent from the queue", () => {
      const mockQueue = {
        currentTrack: { url: "cur-url" },
        tracks: { toArray: () => [{ url: "some-other" }] },
      } as any;

      expect(isTrackInQueue(mockQueue, "missing-url")).toBe(false);
    });
  });
});
