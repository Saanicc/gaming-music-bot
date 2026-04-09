/**
 * Tests for src/utils/helpers/system.ts
 */
import { setBotActivity, joinVoiceChannel } from "../system";
import { buildMessage } from "../../bot-message/buildMessage";
import { guardReply } from "../interactions";
import { useTranslations } from "../../hooks/useTranslations";
import { ActivityType } from "discord.js";

jest.mock("../../bot-message/buildMessage", () => ({
  buildMessage: jest.fn(),
}));

jest.mock("../interactions", () => ({
  guardReply: jest.fn(),
}));

jest.mock("../../hooks/useTranslations", () => ({
  useTranslations: jest.fn(),
}));

describe("System Helpers (system.ts)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("setBotActivity()", () => {
    it("should set activity and status successfully if client.user is defined", () => {
      const mockSetActivity = jest.fn();
      const mockSetStatus = jest.fn();

      const mockClient = {
        user: {
          setActivity: mockSetActivity,
          setStatus: mockSetStatus,
        },
      } as any;

      setBotActivity({
        client: mockClient,
        status: "dnd",
        activityText: "Playing Music",
        activityType: ActivityType.Listening,
      });

      expect(mockSetActivity).toHaveBeenCalledWith("Playing Music", {
        type: ActivityType.Listening,
      });
      expect(mockSetStatus).toHaveBeenCalledWith("dnd");
    });

    it("should gracefully do nothing if client.user is null/undefined", () => {
      const mockClient = { user: null } as any;

      expect(() => {
        setBotActivity({
          client: mockClient,
          status: "online",
          activityText: "Nothing",
        });
      }).not.toThrow();
    });
  });

  describe("joinVoiceChannel()", () => {
    const mockT = jest.fn((key) => `translated-${key}`);

    beforeEach(() => {
      (useTranslations as jest.Mock).mockReturnValue(mockT);
      (buildMessage as jest.Mock).mockImplementation((opts) => opts);
    });

    it("should skip connecting if the queue already has a connection", async () => {
      const mockQueue = {
        guild: { id: "guild-1" },
        connection: true, // Already connected
        connect: jest.fn(),
      } as any;
      const mockVoiceChannel = { id: "vc-1" } as any;

      await joinVoiceChannel({
        queue: mockQueue,
        voiceChannel: mockVoiceChannel,
      });

      expect(useTranslations).toHaveBeenCalledWith("guild-1");
      expect(mockQueue.connect).not.toHaveBeenCalled();
    });

    it("should attempt to connect if the queue lacks a connection", async () => {
      const mockQueue = {
        guild: { id: "guild-1" },
        connection: false, // Not connected
        connect: jest.fn().mockResolvedValue(true),
      } as any;
      const mockVoiceChannel = { id: "vc-1" } as any;

      await joinVoiceChannel({
        queue: mockQueue,
        voiceChannel: mockVoiceChannel,
      });

      expect(mockQueue.connect).toHaveBeenCalledWith(mockVoiceChannel);
    });

    describe("when queue.connect() throws an error", () => {
      const dbError = new Error("Connection failed");
      let mockQueue: any;
      let mockVoiceChannel: any;

      beforeEach(() => {
        mockQueue = {
          guild: { id: "guild-1" },
          connection: false,
          connect: jest.fn().mockRejectedValue(dbError),
        };
        mockVoiceChannel = { id: "vc-1" };
      });

      it("should use guardReply if interaction is provided", async () => {
        const mockInteraction = { id: "int-1" } as any;

        await joinVoiceChannel({
          queue: mockQueue,
          voiceChannel: mockVoiceChannel,
          interaction: mockInteraction,
        });

        // Error was thrown, interaction is present -> guardReply
        expect(guardReply).toHaveBeenCalledWith(
          mockInteraction,
          "VOICE_CHANNEL_ERROR",
          "followUp"
        );
      });

      it("should build and send an error to textChannel if no interaction is provided", async () => {
        const mockTextChannel = { send: jest.fn() } as any;

        await joinVoiceChannel({
          queue: mockQueue,
          voiceChannel: mockVoiceChannel,
          textChannel: mockTextChannel,
        });

        expect(buildMessage).toHaveBeenCalledWith({
          title: "translated-common.error",
          description: "translated-common.couldNotJoinVoiceChannel",
          color: "error",
        });

        expect(mockTextChannel.send).toHaveBeenCalledWith({
          title: "translated-common.error",
          description: "translated-common.couldNotJoinVoiceChannel",
          color: "error",
        });
      });

      it("should silently log to console.error if neither interaction nor textChannel is provided", async () => {
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();

        await joinVoiceChannel({
          queue: mockQueue,
          voiceChannel: mockVoiceChannel,
        });

        expect(consoleSpy).toHaveBeenCalledWith(
          "Could not join voice channel.",
          dbError
        );

        consoleSpy.mockRestore();
      });
    });
  });
});
