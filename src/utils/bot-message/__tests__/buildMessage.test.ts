/**
 * Tests for src/utils/bot-message/buildMessage.ts
 */
import { buildMessage } from "../buildMessage";
import { colors } from "../../constants/colors";
import { InteractionReplyOptions, MessageFlags } from "discord.js";

// Mock discord.js Components V2 UI Builders
jest.mock("discord.js", () => {
  const actualDiscord = jest.requireActual("discord.js");

  class MockBuilder {
    components: any[] = [];
    payload: any = {};

    addComponents = jest.fn().mockReturnThis();
    addTextDisplayComponents = jest.fn((comp) => {
      this.components.push(comp);
      return this;
    });
    setThumbnailAccessory = jest.fn().mockReturnThis();
    addSectionComponents = jest.fn((comp) => {
      this.components.push(comp);
      return this;
    });
    addSeparatorComponents = jest.fn().mockReturnThis();
    addMediaGalleryComponents = jest.fn().mockReturnThis();
    addActionRowComponents = jest.fn().mockReturnThis();
    setAccentColor = jest.fn((color) => {
      this.payload.color = color;
      return this;
    });
    setContent = jest.fn((text) => {
      this.payload.content = text;
      return this;
    });
    setURL = jest.fn((url) => {
      this.payload.url = url;
      return this;
    });
    addItems = jest.fn().mockReturnThis();
  }

  return {
    ...actualDiscord,
    ActionRowBuilder: MockBuilder,
    ContainerBuilder: MockBuilder,
    SectionBuilder: MockBuilder,
    SeparatorBuilder: MockBuilder,
    TextDisplayBuilder: MockBuilder,
    ThumbnailBuilder: MockBuilder,
    MediaGalleryBuilder: MockBuilder,
    MediaGalleryItemBuilder: MockBuilder,
    MessageFlags: {
      IsComponentsV2: 1 << 0,
      Ephemeral: 1 << 6,
    },
  };
});

describe("Message Builder (buildMessage.ts)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Title Formatting and Font Size", () => {
    it("should format small titles (###) by default", () => {
      const payload = buildMessage({ title: "Small Default" });
      const container: any = payload.components![0];
      const textComp = container.components[0];

      expect(textComp.payload.content).toBe(`### Small Default\n`);
    });

    it("should format md titles (##)", () => {
      const payload = buildMessage({ title: "Medium", titleFontSize: "md" });
      const container: any = payload.components![0];
      const textComp = container.components[0];

      expect(textComp.payload.content).toBe(`## Medium\n`);
    });

    it("should format lg titles (#)", () => {
      const payload = buildMessage({ title: "Large", titleFontSize: "lg" });
      const container: any = payload.components![0];
      const textComp = container.components[0];

      expect(textComp.payload.content).toBe(`# Large\n`);
    });

    it("should append a description beneath the title if present", () => {
      const payload = buildMessage({
        title: "Title",
        description: "And description!",
      });
      const container: any = payload.components![0];
      const textComp = container.components[0];

      expect(textComp.payload.content).toBe(`### Title\nAnd description!`);
    });
  });

  describe("Thumbnail Rendering Options", () => {
    it("should inject text components natively into the container when no thumbnail is supplied", () => {
      const payload = buildMessage({ title: "No Thumb" });
      const container: any = payload.components![0];

      // Directly pushed components
      expect(container.addTextDisplayComponents).toHaveBeenCalled();
      expect(container.addSectionComponents).not.toHaveBeenCalled();
    });

    it("should inject a Section container wrapping the text and the thumbnail accessory if a thumbnail is provided", () => {
      const payload = buildMessage({
        title: "Thumb",
        thumbnail: "https://thumb.url",
      });
      const container: any = payload.components![0];

      // Uses `addSectionComponents` wrapping the thumbnail and text
      expect(container.addSectionComponents).toHaveBeenCalled();
      expect(container.addTextDisplayComponents).not.toHaveBeenCalled(); // The container didn't natively mount the text

      const storedSection = container.components[0];
      // The section mounted the thumbnail and text inside
      expect(storedSection.setThumbnailAccessory).toHaveBeenCalled();
      expect(storedSection.addTextDisplayComponents).toHaveBeenCalled();
    });
  });

  describe("Optional Field Components", () => {
    it("should inject an Action Row with a visual separator if provided", () => {
      const mockActionRow = { isMock: true } as any;
      const payload = buildMessage({
        title: "Row",
        actionRowBuilder: [mockActionRow],
      });
      const container: any = payload.components![0];

      expect(container.addSeparatorComponents).toHaveBeenCalled();
      expect(container.addActionRowComponents).toHaveBeenCalledWith([
        mockActionRow,
      ]);
    });

    it("should inject footerText formatted in small gray font (-#) with a visual separator if provided", () => {
      const payload = buildMessage({
        title: "Footer",
        footerText: "Footer Label",
      });
      const container: any = payload.components![0];

      expect(container.addSeparatorComponents).toHaveBeenCalled();
      expect(container.addTextDisplayComponents).toHaveBeenCalled();

      // Check the last mounted text component (since title is also mounted)
      const textComp = container.components[container.components.length - 1];
      expect(textComp.payload.content).toBe(`-# Footer Label`);
    });
  });

  describe("Colors and Contextual Flags", () => {
    it("should map arbitrary color requests cleanly to the colors payload configuration", () => {
      // Validate string mapper to ColorType successfully
      const payload = buildMessage({ title: "Color", color: "error" });
      const container: any = payload.components![0];

      // Assuming constants/colors exposes an 'error' prop
      expect(container.setAccentColor).toHaveBeenCalledWith(colors.error);
    });

    it("should return basic component flags when ephemeral is false or undefined", () => {
      const payload = buildMessage({
        title: "Standard",
      }) as InteractionReplyOptions;
      expect(payload.flags).toEqual([MessageFlags.IsComponentsV2]);
      expect(payload.allowedMentions).toEqual({
        repliedUser: false,
        parse: [],
      });
    });

    it("should attach ephemeral flags gracefully alongside component flags when toggled", () => {
      const payload = buildMessage({
        title: "Secret",
        ephemeral: true,
      }) as InteractionReplyOptions;
      expect(payload.flags).toEqual([
        MessageFlags.Ephemeral,
        MessageFlags.IsComponentsV2,
      ]);
    });
  });
});
