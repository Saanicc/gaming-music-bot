/**
 * Tests for src/utils/helpers/interactions/spamFilter.ts
 */
import { checkSpamFilter } from "../spamFilter";

jest.mock("@/root/bot-config.json", () => ({
  spamFilter: {
    maxCommands: 3,
    burstWindowMs: 2000,
    cooldownMs: 5000,
  },
}));

describe("Spam Filter Helper (spamFilter.ts)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Start at a clean known time rather than 0
    jest.setSystemTime(new Date("2020-01-01T00:00:00Z").getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should allow a single command and not block the user", () => {
    const result = checkSpamFilter("user-normal");
    expect(result).toEqual({ blocked: false });
  });

  it("should allow commands up to the maxCommands limit", () => {
    expect(checkSpamFilter("user-limit").blocked).toBe(false); // 1
    expect(checkSpamFilter("user-limit").blocked).toBe(false); // 2
    expect(checkSpamFilter("user-limit").blocked).toBe(false); // 3 (max commands)
  });

  it("should block the user upon exceeding maxCommands in the burst window", () => {
    checkSpamFilter("user-burst"); // 1
    checkSpamFilter("user-burst"); // 2
    checkSpamFilter("user-burst"); // 3

    const triggerResult = checkSpamFilter("user-burst"); // 4th triggers the block
    expect(triggerResult).toEqual({ blocked: true, remainingMs: 5000 });
  });

  it("should block subsequent attempts while on active cooldown and return decreasing remainingMs", () => {
    // Exceed limit
    for (let i = 0; i < 4; i++) {
      checkSpamFilter("user-active-cooldown");
    }

    // Advance 1 second into the 5-second cooldown
    jest.advanceTimersByTime(1000);

    const checkResult = checkSpamFilter("user-active-cooldown");
    expect(checkResult).toEqual({ blocked: true, remainingMs: 4000 });
  });

  it("should unblock the user and reset state after cooldown expires", () => {
    // Exceed limit
    for (let i = 0; i < 4; i++) {
      checkSpamFilter("user-expired-cooldown");
    }

    // Verify blocked initially
    expect(checkSpamFilter("user-expired-cooldown").blocked).toBe(true);

    // Advance 6 seconds, completely passing the 5s cooldown
    jest.advanceTimersByTime(6000);

    // Should now be unblocked
    const result = checkSpamFilter("user-expired-cooldown");
    expect(result).toEqual({ blocked: false });
  });

  it("should prune old actions cleanly if they fall outside the burst window", () => {
    // We send 3 commands (the max limit)
    checkSpamFilter("user-pruning"); // 1
    checkSpamFilter("user-pruning"); // 2
    checkSpamFilter("user-pruning"); // 3

    // Advance by 3000ms. The burst window is 2000ms.
    // The previous 3 commands should fall entirely out of the active window.
    jest.advanceTimersByTime(3000);

    // Send a 4th command. If pruning works, it shouldn't be grouped with the first 3
    // and thus the user should NOT be blocked.
    const result = checkSpamFilter("user-pruning");
    expect(result).toEqual({ blocked: false });

    // Now verifying our new pruned history works, we should be able to send 2 more
    // before exceeding the limit manually again
    expect(checkSpamFilter("user-pruning").blocked).toBe(false); // 2nd of new window
    expect(checkSpamFilter("user-pruning").blocked).toBe(false); // 3rd of new window
    // 4th triggers
    expect(checkSpamFilter("user-pruning").blocked).toBe(true);
  });
});
