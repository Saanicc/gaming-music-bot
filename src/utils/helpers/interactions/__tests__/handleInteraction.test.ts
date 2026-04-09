/**
 * Tests for src/utils/helpers/interactions/handleInteraction.ts
 */
import { handleInteraction } from "../handleInteraction";
import { useMainPlayer, useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { guardReply } from "../interactionGuard";
import { checkSpamFilter } from "../spamFilter";

jest.mock("discord-player", () => ({
  useMainPlayer: jest.fn(),
  useQueue: jest.fn(),
}));

jest.mock("@/utils/bot-message/buildMessage", () => ({
  buildMessage: jest.fn(),
}));

jest.mock("@/utils/hooks/useTranslations", () => ({
  useTranslations: jest.fn(),
}));

jest.mock("../interactionGuard", () => ({
  guardReply: jest.fn(),
}));

jest.mock("../spamFilter", () => ({
  checkSpamFilter: jest.fn(),
}));

describe("Handle Interaction Routine (handleInteraction.ts)", () => {
  let mockInteraction: any;
  let mockHandler: any;
  let mockCollection: any;
  let mockPlayer: any;
  let consoleErrorSpy: jest.SpyInstance;
  const mockT = jest.fn((key: string) => `translated-${key}`);

  beforeEach(() => {
    jest.clearAllMocks();

    mockInteraction = {
      guild: { id: "guild-1" },
      user: { id: "u-1" },
      isRepliable: jest.fn().mockReturnValue(true),
      reply: jest.fn(),
      deferred: false,
      replied: false,
    };

    mockHandler = {
      execute: jest.fn().mockResolvedValue("success"),
    };

    mockCollection = {
      testCommand: mockHandler,
      help: { execute: jest.fn() }, // Known allowed quiz command
    };

    mockPlayer = {
      context: {
        provide: jest.fn((ctx, fn) => fn()),
      },
    };

    (useMainPlayer as jest.Mock).mockReturnValue(mockPlayer);
    (useQueue as jest.Mock).mockReturnValue(undefined);
    (checkSpamFilter as jest.Mock).mockReturnValue({ blocked: false });
    (useTranslations as jest.Mock).mockReturnValue(mockT);
    (buildMessage as jest.Mock).mockImplementation((opts) => opts);

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should return early if interaction has no guild context", async () => {
    mockInteraction.guild = null;

    await handleInteraction(mockInteraction, mockCollection, "testCommand");

    expect(checkSpamFilter).not.toHaveBeenCalled();
    expect(mockHandler.execute).not.toHaveBeenCalled();
  });

  it("should block execution when spam filter triggers and dispatch SPAM_COOLDOWN via guardReply", async () => {
    (checkSpamFilter as jest.Mock).mockReturnValue({
      blocked: true,
      remainingMs: 4200, // tests Math.ceil rounding to 5 seconds
    });

    await handleInteraction(mockInteraction, mockCollection, "testCommand");

    expect(checkSpamFilter).toHaveBeenCalledWith("u-1");
    expect(guardReply).toHaveBeenCalledWith(
      mockInteraction,
      "SPAM_COOLDOWN",
      "reply",
      {
        waitTime: "5",
      }
    );
    expect(mockHandler.execute).not.toHaveBeenCalled();
  });

  it("should return early if the command handler key isn't found in the collection", async () => {
    await handleInteraction(mockInteraction, mockCollection, "missingCommand");

    expect(checkSpamFilter).toHaveBeenCalled();
    expect(useMainPlayer).not.toHaveBeenCalled();
  });

  describe("Music Quiz State Guard", () => {
    beforeEach(() => {
      // Mock the queue as running a quiz
      (useQueue as jest.Mock).mockReturnValue({
        metadata: { musicQuiz: true },
      });
    });

    it("should intercept standard commands during a quiz and block them natively", async () => {
      await handleInteraction(mockInteraction, mockCollection, "testCommand");

      expect(useTranslations).toHaveBeenCalledWith("guild-1");
      expect(buildMessage).toHaveBeenCalledWith({
        title: "translated-commands.musicquiz.message.inProgress.title",
        description:
          "translated-commands.musicquiz.message.inProgress.description",
        color: "error",
        ephemeral: true,
      });
      expect(mockInteraction.reply).toHaveBeenCalled();

      // Shouldn't reach context execution
      expect(mockPlayer.context.provide).not.toHaveBeenCalled();
    });

    it("should allow whitelisted commands (e.g., 'help') to execute natively during a quiz", async () => {
      await handleInteraction(mockInteraction, mockCollection, "help");

      // Execution proceeds normally into context processing
      expect(mockPlayer.context.provide).toHaveBeenCalled();
    });

    it("should gracefully do nothing if unapproved command matches musicQuiz but interaction is unrepliable", async () => {
      mockInteraction.isRepliable.mockReturnValue(false);

      await handleInteraction(mockInteraction, mockCollection, "testCommand");

      // Hits early return
      expect(mockInteraction.reply).not.toHaveBeenCalled();
      expect(mockPlayer.context.provide).not.toHaveBeenCalled();
    });
  });

  describe("Execution Success & Failure", () => {
    it("should execute standard operations correctly leveraging discord-player context injection", async () => {
      await handleInteraction(mockInteraction, mockCollection, "testCommand");

      expect(mockPlayer.context.provide).toHaveBeenCalledWith(
        { guild: { id: "guild-1" } },
        expect.any(Function)
      );
      expect(mockHandler.execute).toHaveBeenCalledWith(mockInteraction);
    });

    it("should map GatewayRateLimitError instances safely to RATE_LIMIT translation alerts", async () => {
      const rateLimitError = new Error("Fast request");
      (rateLimitError as any).name = "GatewayRateLimitError";
      (rateLimitError as any).data = { opcode: 8, retry_after: 50 };

      // Make execution throw this error
      mockPlayer.context.provide.mockImplementationOnce(() => {
        throw rateLimitError;
      });

      await handleInteraction(mockInteraction, mockCollection, "testCommand");

      expect(guardReply).toHaveBeenCalledWith(
        mockInteraction,
        "RATE_LIMIT",
        "reply",
        {
          waitTime: "50", // Maps waitTime explicitly from data
        }
      );
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Not logged generically
    });

    it("should handle general unmapped exceptions correctly and log them to console", async () => {
      const genericError = new Error("Database offline");

      mockPlayer.context.provide.mockImplementationOnce(() => {
        throw genericError;
      });

      await handleInteraction(mockInteraction, mockCollection, "testCommand");

      expect(guardReply).toHaveBeenCalledWith(
        mockInteraction,
        "GENERIC_ERROR",
        "reply"
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Interaction execution error:",
        genericError
      );
    });

    it("should transition target method mapping correctly to 'editReply' if interaction was already deferred/replied", async () => {
      // User typed command but it took too long, it became deferred
      mockInteraction.deferred = true;

      const genericError = new Error("Network timeout");
      mockPlayer.context.provide.mockImplementationOnce(() => {
        throw genericError;
      });

      await handleInteraction(mockInteraction, mockCollection, "testCommand");

      // guardReply sees .deferred and opts for editReply instead of standard reply
      expect(guardReply).toHaveBeenCalledWith(
        mockInteraction,
        "GENERIC_ERROR",
        "editReply"
      );
    });
  });
});
