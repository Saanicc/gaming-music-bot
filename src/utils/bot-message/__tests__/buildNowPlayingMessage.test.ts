/**
 * Tests for src/utils/bot-message/buildNowPlayingMessage.ts
 */
import { buildNowPlayingMessage } from "../buildNowPlayingMessage";
import { QueueRepeatMode } from "discord-player";
import { queueManager } from "@/services/queueManager";
import { getFormattedTrackDescription } from "../../helpers/track";
import { getThumbnail } from "../../helpers/utils";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { colors } from "../../constants/colors";
import { MessageFlags } from "discord.js";

// Mock helper functionalities
jest.mock("@/services/queueManager", () => ({
  queueManager: {
    getQueueType: jest.fn(),
  },
}));

jest.mock("../../helpers/track", () => ({
  getFormattedTrackDescription: jest.fn(),
}));

jest.mock("../../helpers/utils", () => ({
  getThumbnail: jest.fn(),
}));

jest.mock("@/utils/hooks/useTranslations", () => ({
  useTranslations: jest.fn(),
}));

jest.mock("@/interactions/buttons/victory", () => ({
  victoryButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/playBossMusic", () => ({
  bossMusicButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/stop", () => ({
  stopButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/pause", () => ({
  pauseButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/resume", () => ({
  resumeButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/queue", () => ({
  queueButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/next", () => ({
  nextButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/previous", () => ({
  previousButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/addTrack", () => ({
  addTrackButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/loopTrack", () => ({
  loopTrackButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));
jest.mock("@/interactions/buttons/loopQueue", () => ({
  loopQueueButton: {
    setDisabled: jest.fn().mockReturnThis(),
    setStyle: jest.fn().mockReturnThis(),
  },
}));

// Required mock for discord.js Components V2 UI Builders and elements used inside buildNowPlayingMessage
jest.mock("discord.js", () => {
  const actualDiscord = jest.requireActual("discord.js");

  // Chainable mock builder
  class MockBuilder {
    addComponents = jest.fn().mockReturnThis();
    addTextDisplayComponents = jest.fn().mockReturnThis();
    setThumbnailAccessory = jest.fn().mockReturnThis();
    addSectionComponents = jest.fn().mockReturnThis();
    addSeparatorComponents = jest.fn().mockReturnThis();
    addActionRowComponents = jest.fn().mockReturnThis();
    setAccentColor = jest.fn().mockReturnThis();
    setContent = jest.fn().mockReturnThis();
    setURL = jest.fn().mockReturnThis();
  }

  return {
    ...actualDiscord,
    ActionRowBuilder: MockBuilder,
    ButtonBuilder: MockBuilder,
    ContainerBuilder: MockBuilder,
    SectionBuilder: MockBuilder,
    SeparatorBuilder: MockBuilder,
    TextDisplayBuilder: MockBuilder,
    ThumbnailBuilder: MockBuilder,
    MessageFlags: { IsComponentsV2: 1 << 0 },
    ButtonStyle: { Primary: 1, Secondary: 2 },
  };
});

describe("Now Playing Message Builder (buildNowPlayingMessage.ts)", () => {
  const mockT = jest.fn((key) => `translated-${key}`);
  let mockQueue: any;
  let mockTrack: any;

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslations as jest.Mock).mockReturnValue(mockT);
    (getFormattedTrackDescription as jest.Mock).mockReturnValue(
      "Mock Description"
    );
    (getThumbnail as jest.Mock).mockReturnValue("https://mock-thumbnail.url");
    (queueManager.getQueueType as jest.Mock).mockReturnValue("normal");

    mockTrack = { title: "Test Track" };
    mockQueue = {
      guild: { id: "guild-1" },
      repeatMode: QueueRepeatMode.OFF,
      history: {
        previousTrack: null,
        nextTrack: null,
      },
      node: {
        createProgressBar: jest.fn().mockReturnValue("[=== Progress ===]"),
      },
    };
  });

  it("should format successfully when actively playing a normal track", () => {
    const prevButtonMod =
      require("@/interactions/buttons/previous").previousButton;
    const loopTrackMod =
      require("@/interactions/buttons/loopTrack").loopTrackButton;

    mockQueue.history.previousTrack = { id: "t1" }; // Enable previous button
    mockQueue.repeatMode = QueueRepeatMode.TRACK;

    const payload = buildNowPlayingMessage({
      track: mockTrack,
      isPlaying: true,
      queue: mockQueue,
      footerText: "Requested by User",
      isTrackInDB: false,
    });

    // Validates the overall schema matches expected MessageOptions wrapper
    expect(payload.flags).toBe(MessageFlags.IsComponentsV2);
    expect(payload.allowedMentions).toEqual({ repliedUser: false });
    expect(payload.components).toHaveLength(1);

    const container = payload.components![0] as any;

    // Evaluates dynamic button mappings
    expect(prevButtonMod.setDisabled).toHaveBeenCalledWith(false);
    expect(loopTrackMod.setDisabled).toHaveBeenCalledWith(false);
    expect(loopTrackMod.setStyle).toHaveBeenCalledWith(1); // ButtonStyle.Primary

    // Evaluates general color mapping for normal playing
    expect(container.setAccentColor).toHaveBeenCalledWith(colors.nowPlaying);
  });

  it("should format successfully when the track is paused", () => {
    const nextButtonMod = require("@/interactions/buttons/next").nextButton;
    const loopQueueMod =
      require("@/interactions/buttons/loopQueue").loopQueueButton;

    mockQueue.history.nextTrack = { id: "t2" }; // Enable next button
    mockQueue.repeatMode = QueueRepeatMode.OFF;

    const payload = buildNowPlayingMessage({
      track: mockTrack,
      isPlaying: false, // Paused
      queue: mockQueue,
      footerText: "Requested by PauseUser",
      isTrackInDB: true, // Test track already mapped to disable "Add Track"
    });

    const container = payload.components![0] as any;

    // Validate states tracking correctly on paused logic
    expect(nextButtonMod.setDisabled).toHaveBeenCalledWith(false);
    expect(loopQueueMod.setDisabled).toHaveBeenCalledWith(true); // Loops disabled on pause

    // Asserts correct fallback coloring
    expect(container.setAccentColor).toHaveBeenCalledWith(colors.paused);
  });

  it("should format successfully with boss mode colors when processing a boss queue", () => {
    (queueManager.getQueueType as jest.Mock).mockReturnValue("boss");

    const payload = buildNowPlayingMessage({
      track: mockTrack,
      isPlaying: true,
      queue: mockQueue,
      footerText: "Demonic Presence",
      isTrackInDB: false,
    });

    const container = payload.components![0] as any;

    // Boss playing overrides the standard primary accent color bounds
    expect(container.setAccentColor).toHaveBeenCalledWith(colors.bossMode);
  });
});
