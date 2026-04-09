/**
 * Tests for src/utils/helpers/interactions/interactionGuard.ts
 */
import { guardReply, GUARD_MESSAGES } from "../interactionGuard";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useTranslations } from "@/utils/hooks/useTranslations";

jest.mock("@/utils/bot-message/buildMessage", () => ({
  buildMessage: jest.fn(),
}));

jest.mock("@/utils/hooks/useTranslations", () => ({
  useTranslations: jest.fn(),
}));

describe("Interaction Guard (interactionGuard.ts)", () => {
  const mockT = jest.fn((key: string, vars?: any) => {
    return `${key}${vars ? " " + JSON.stringify(vars) : ""}`;
  });

  const mockInteraction: any = {
    guildId: "guild-1",
    reply: jest.fn(),
    editReply: jest.fn(),
    followUp: jest.fn(),
    deleteReply: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslations as jest.Mock).mockReturnValue(mockT);
    (buildMessage as jest.Mock).mockImplementation((opts) => opts);

    // Setting defaults for deletion testing safely
    mockInteraction.deleteReply.mockResolvedValue(true);
  });

  it("should process standard translation mapping without variables", async () => {
    await guardReply(mockInteraction, "NO_QUEUE", "reply");

    expect(useTranslations).toHaveBeenCalledWith("guild-1");
    // NO_QUEUE only has a title
    expect(mockT).toHaveBeenCalledWith(GUARD_MESSAGES.NO_QUEUE.title);
    expect(buildMessage).toHaveBeenCalledWith({
      ...GUARD_MESSAGES.NO_QUEUE,
      title: mockT(GUARD_MESSAGES.NO_QUEUE.title),
      description: undefined,
    });
  });

  it("should process description parsing successfully when the payload has one", async () => {
    await guardReply(mockInteraction, "NO_TRACK_FOUND", "reply");

    // NO_TRACK_FOUND has both title and description
    expect(mockT).toHaveBeenCalledWith(GUARD_MESSAGES.NO_TRACK_FOUND.title);
    expect(mockT).toHaveBeenCalledWith(
      GUARD_MESSAGES.NO_TRACK_FOUND.description
    );
    expect(buildMessage).toHaveBeenCalledWith({
      ...GUARD_MESSAGES.NO_TRACK_FOUND,
      title: mockT(GUARD_MESSAGES.NO_TRACK_FOUND.title),
      description: mockT(GUARD_MESSAGES.NO_TRACK_FOUND.description),
    });
  });

  it("should inject translationData mapping if provided", async () => {
    const translationData = { remaining: "5 seconds" };
    await guardReply(
      mockInteraction,
      "SPAM_COOLDOWN",
      "reply",
      translationData
    );

    expect(mockT).toHaveBeenCalledWith(GUARD_MESSAGES.SPAM_COOLDOWN.title);
    expect(mockT).toHaveBeenCalledWith(
      GUARD_MESSAGES.SPAM_COOLDOWN.description,
      translationData
    );
    expect(buildMessage).toHaveBeenCalledWith({
      ...GUARD_MESSAGES.SPAM_COOLDOWN,
      title: mockT(GUARD_MESSAGES.SPAM_COOLDOWN.title),
      description: mockT(
        GUARD_MESSAGES.SPAM_COOLDOWN.description,
        translationData
      ),
    });
  });

  describe("Routing Method Executions", () => {
    it("should route to reply when method is 'reply'", async () => {
      await guardReply(mockInteraction, "NO_GUILD", "reply");
      expect(mockInteraction.reply).toHaveBeenCalled();
      expect(mockInteraction.editReply).not.toHaveBeenCalled();
      expect(mockInteraction.followUp).not.toHaveBeenCalled();
    });

    it("should route to followUp when method is 'followUp'", async () => {
      await guardReply(mockInteraction, "NO_GUILD", "followUp");
      expect(mockInteraction.followUp).toHaveBeenCalled();
      expect(mockInteraction.reply).not.toHaveBeenCalled();
    });

    it("should route to editReply when method is 'editReply' and message is NOT ephemeral", async () => {
      await guardReply(mockInteraction, "NO_RESULTS", "editReply");
      expect(mockInteraction.editReply).toHaveBeenCalled();
      expect(mockInteraction.deleteReply).not.toHaveBeenCalled();
    });

    it("should deleteReply and use followUp when method is 'editReply' AND message IS ephemeral", async () => {
      // Find an ephemeral message map
      const ephemeralMsg = GUARD_MESSAGES.NO_QUEUE;
      expect(ephemeralMsg.ephemeral).toBe(true);

      await guardReply(mockInteraction, "NO_QUEUE", "editReply");

      expect(mockInteraction.deleteReply).toHaveBeenCalled();
      expect(mockInteraction.editReply).not.toHaveBeenCalled(); // Skips edit because Discord rejects it
      expect(mockInteraction.followUp).toHaveBeenCalled(); // Falls back to followup
    });

    it("should safely swallow any errors occurring during the ephemeral deleteReply fallback", async () => {
      mockInteraction.deleteReply.mockRejectedValueOnce(
        new Error("Missing Message")
      );

      await expect(
        guardReply(mockInteraction, "NO_QUEUE", "editReply")
      ).resolves.not.toThrow();

      expect(mockInteraction.deleteReply).toHaveBeenCalled();
      expect(mockInteraction.followUp).toHaveBeenCalled();
    });
  });
});
