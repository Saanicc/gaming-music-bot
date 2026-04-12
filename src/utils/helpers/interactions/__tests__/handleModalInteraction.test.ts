/**
 * Tests for handleModalInteraction utility.
 * Mocks: discord.js ModalSubmitInteraction
 */

import { handleModalInteraction } from "../handleModalInteraction";
import { ModalSubmitInteraction } from "discord.js";

// Mock discord.js simply to be safe, though not strictly required since we pass generic objects
jest.mock("discord.js", () => ({
  ModalSubmitInteraction: jest.fn(),
}));

describe("handleModalInteraction", () => {
  let mockInteraction: unknown;

  beforeEach(() => {
    jest.clearAllMocks();
    mockInteraction = {} as ModalSubmitInteraction;
  });

  it("should extract handler key and execute handler when key matches exactly", async () => {
    const handler = { execute: jest.fn().mockResolvedValue(true) };
    const collection = {
      my_modal: handler,
    };

    await handleModalInteraction(
      mockInteraction as ModalSubmitInteraction,
      collection,
      "my_modal"
    );

    expect(handler.execute).toHaveBeenCalledWith(mockInteraction);
    expect(handler.execute).toHaveBeenCalledTimes(1);
  });

  it("should extract base handler key when key contains a colon (metadata payload)", async () => {
    const handler = { execute: jest.fn().mockResolvedValue(true) };
    const collection = {
      update_playlist: handler,
    };

    // Simulate customId containing a passed argument separated by ':'
    await handleModalInteraction(
      mockInteraction as ModalSubmitInteraction,
      collection,
      "update_playlist:123456"
    );

    expect(handler.execute).toHaveBeenCalledWith(mockInteraction);
    expect(handler.execute).toHaveBeenCalledTimes(1);
  });

  it("should return silently if handler does not exist in the collection", async () => {
    const handler = { execute: jest.fn().mockResolvedValue(true) };
    const collection = {
      other_modal: handler,
    };

    await handleModalInteraction(
      mockInteraction as ModalSubmitInteraction,
      collection,
      "unknown_modal"
    );

    expect(handler.execute).not.toHaveBeenCalled();
  });

  it("should correctly handle and propagate errors thrown by the handler", async () => {
    expect.assertions(2);
    const handler = {
      execute: jest
        .fn()
        .mockRejectedValue(new Error("Handler suddenly crashed")),
    };
    const collection = {
      failing_modal: handler,
    };

    await expect(
      handleModalInteraction(
        mockInteraction as ModalSubmitInteraction,
        collection,
        "failing_modal"
      )
    ).rejects.toThrow(/^Handler suddenly crashed$/);

    expect(handler.execute).toHaveBeenCalledWith(mockInteraction);
  });
});
