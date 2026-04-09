/**
 * Tests for src/services/musicPlayerMessage.ts
 */
import { musicPlayerMessage } from "../musicPlayerMessage";
import { buildNowPlayingMessage } from "@/utils/bot-message/buildNowPlayingMessage";
import {
  checkIfTrackInDB,
  getTrackRequestedByFooterText,
  isTrackInCache,
} from "@/utils/helpers/track";

jest.mock("@/utils/bot-message/buildNowPlayingMessage", () => ({
  buildNowPlayingMessage: jest.fn(),
}));

jest.mock("@/utils/helpers/track", () => ({
  checkIfTrackInDB: jest.fn(),
  getTrackRequestedByFooterText: jest.fn(),
  isTrackInCache: jest.fn(),
}));

describe("Music Player Message Service (musicPlayerMessage.ts)", () => {
  let mockQueue: any;
  let mockTrack: any;
  let mockChannel: any;
  let mockMessage: any;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Reset singleton internal state before each test
    // To gracefully clear the class state, we fake a pre-existing message and delete it
    musicPlayerMessage.set({
      delete: jest.fn().mockResolvedValue(true),
    } as any);
    musicPlayerMessage.clearProgressInterval();
    musicPlayerMessage.delete(); // Wipes state internally

    mockChannel = {
      send: jest.fn().mockResolvedValue({
        id: "msg-123",
        edit: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true),
      }),
    };

    mockQueue = {
      guild: { id: "guild-1" },
      metadata: { textChannel: mockChannel },
    };

    mockTrack = {
      id: "track-1",
      url: "test-url",
      requestedBy: { id: "user-1" },
    };

    mockMessage = {
      edit: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
    };

    (checkIfTrackInDB as jest.Mock).mockResolvedValue(true);
    (getTrackRequestedByFooterText as jest.Mock).mockResolvedValue("Req by U1");
    (isTrackInCache as jest.Mock).mockReturnValue(true);
    (buildNowPlayingMessage as jest.Mock).mockReturnValue({
      content: "Built UI",
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  describe("set() & get()", () => {
    it("should accurately capture and return manual message bindings", () => {
      expect(musicPlayerMessage.get()).toBeUndefined();
      musicPlayerMessage.set(mockMessage);
      expect(musicPlayerMessage.get()).toBe(mockMessage);
    });
  });

  describe("edit()", () => {
    it("should safely return if there is no active message", async () => {
      await expect(
        musicPlayerMessage.edit({ content: "test" })
      ).resolves.not.toThrow();
    });

    it("should hit the internal message edit method when state exists", async () => {
      musicPlayerMessage.set(mockMessage);
      await musicPlayerMessage.edit({ content: "Edited!" });
      expect(mockMessage.edit).toHaveBeenCalledWith({ content: "Edited!" });
    });

    it("should silently catch failures stemming from discord.js rejection", async () => {
      mockMessage.edit.mockRejectedValueOnce(new Error("API Error"));
      musicPlayerMessage.set(mockMessage);

      await expect(
        musicPlayerMessage.edit({ content: "Broken!" })
      ).resolves.not.toThrow();
      expect(mockMessage.edit).toHaveBeenCalled();
    });
  });

  describe("delete()", () => {
    it("should safely return if there is no active message", async () => {
      await expect(musicPlayerMessage.delete()).resolves.not.toThrow();
    });

    it("should invoke internal deletion and clear state", async () => {
      musicPlayerMessage.set(mockMessage);
      await musicPlayerMessage.delete();

      expect(mockMessage.delete).toHaveBeenCalled();
      expect(musicPlayerMessage.get()).toBeUndefined();
    });
  });

  describe("build()", () => {
    it("should return early if the queue metadata lacks a textChannel", async () => {
      mockQueue.metadata.textChannel = undefined;
      await musicPlayerMessage.build({
        queue: mockQueue,
        track: mockTrack,
        isPlaying: true,
      });

      expect(checkIfTrackInDB).not.toHaveBeenCalled();
    });

    it("should fetch external dependencies and send a NEW message if state was perfectly empty", async () => {
      await musicPlayerMessage.build({
        queue: mockQueue,
        track: mockTrack,
        isPlaying: true,
      });

      expect(checkIfTrackInDB).toHaveBeenCalledWith("guild-1", mockTrack);
      expect(getTrackRequestedByFooterText).toHaveBeenCalledWith(
        mockTrack.requestedBy,
        "guild-1"
      );

      expect(buildNowPlayingMessage).toHaveBeenCalledWith({
        track: mockTrack,
        isPlaying: true,
        queue: mockQueue,
        footerText: "Req by U1",
        isTrackInDB: true,
      });

      expect(mockChannel.send).toHaveBeenCalledWith({ content: "Built UI" });

      // Should save the new message via 'set' natively returned from 'send'
      expect(musicPlayerMessage.get()).toBeDefined();
    });

    it("should EDIT the existing message rather than re-sending if it is already tracked", async () => {
      musicPlayerMessage.set(mockMessage);

      await musicPlayerMessage.build({
        queue: mockQueue,
        track: mockTrack,
        isPlaying: false,
      });

      expect(mockChannel.send).not.toHaveBeenCalled();
      expect(mockMessage.edit).toHaveBeenCalledWith({ content: "Built UI" });
    });

    it("should establish a looping progress updater interval when shouldUpdateProgress is flipped to true", async () => {
      await musicPlayerMessage.build({
        queue: mockQueue,
        track: mockTrack,
        isPlaying: true,
        shouldUpdateProgress: true, // Enables interval
      });

      // Clear the mock history from the initial manual edit build payload
      (buildNowPlayingMessage as jest.Mock).mockClear();

      // Fast-forward 2 seconds to trigger the interval
      jest.advanceTimersByTime(2000);

      // Verify buildAndEdit routine fired properly on the interval checking cache logic
      expect(isTrackInCache).toHaveBeenCalledWith("guild-1", "test-url");
      expect(buildNowPlayingMessage).toHaveBeenCalledWith({
        track: mockTrack,
        isPlaying: true,
        queue: mockQueue,
        footerText: "Req by U1",
        isTrackInDB: true,
      });

      // The sent mock object from channel.send will receive the internal .edit() update
      const storedMessage = musicPlayerMessage.get();
      expect((storedMessage as any).edit).toHaveBeenCalledWith({
        content: "Built UI",
      });
    });

    it("should catch and log errors securely if the initial channel.send fails outright", async () => {
      const initError = new Error("Bot lacks permissions");
      mockChannel.send.mockRejectedValueOnce(initError);

      await musicPlayerMessage.build({
        queue: mockQueue,
        track: mockTrack,
        isPlaying: true,
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send player message:",
        initError
      );
    });
  });

  describe("buildAndEdit()", () => {
    it("should safely return if inner shared runtime state or previous mapped message evaluates missing", async () => {
      // Wiped explicitly in beforeEach implicitly
      await expect(musicPlayerMessage.buildAndEdit()).resolves.not.toThrow();
      expect(buildNowPlayingMessage).not.toHaveBeenCalled();
    });

    it("should rebuild layout gracefully and push updates resolving state parameter replacements", async () => {
      // Bootstrap the runtime state successfully
      musicPlayerMessage.set(mockMessage);
      await musicPlayerMessage.build({
        queue: mockQueue,
        track: mockTrack,
        isPlaying: true,
      });

      // BuildAndEdit supports swapping out references
      const overriddenQueue = { guild: { id: "guild-1" } } as any;

      await musicPlayerMessage.buildAndEdit(overriddenQueue, false);

      expect(buildNowPlayingMessage).toHaveBeenLastCalledWith({
        track: mockTrack,
        isPlaying: false, // Passed override
        queue: overriddenQueue, // Passed override
        footerText: "Req by U1", // Cached from build() successfully
        isTrackInDB: true, // Mocked from isTrackInCache successfully
      });

      expect(mockMessage.edit).toHaveBeenCalledWith({ content: "Built UI" });
    });
  });

  describe("clearProgressInterval()", () => {
    it("should confidently delete interval refs clearing the inner mapped timer structure", async () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");

      // Bootstrap state forcing interval spin up
      await musicPlayerMessage.build({
        queue: mockQueue,
        track: mockTrack,
        isPlaying: true,
        shouldUpdateProgress: true,
      });

      expect(clearIntervalSpy).not.toHaveBeenCalled();

      // Trigger deletion
      musicPlayerMessage.clearProgressInterval();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });
});
