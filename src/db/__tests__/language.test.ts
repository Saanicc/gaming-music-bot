/**
 * Tests for src/db/language.ts
 */
import {
  saveLanguageToDB,
  getLanguageFromDB,
  saveBotLanguageToCache,
  getBotLanguageFromCache,
} from "../language";
import { GuildSettings } from "../schemas/GuildSettings";
import { DEFAULT_LANGUAGE, LanguageCode } from "../../ui/translations";

jest.mock("../schemas/GuildSettings", () => ({
  GuildSettings: {
    findOneAndUpdate: jest.fn(),
    findOne: jest.fn(),
  },
}));

describe("Language Database Service (language.ts)", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("Cache Management", () => {
    it("should safely store and retrieve memory states from localized cache", () => {
      // Testing uniqueness inherently protects against global map contamination
      expect(getBotLanguageFromCache("cache-guild-1")).toBeUndefined();

      saveBotLanguageToCache("cache-guild-1", "sv-SE" as LanguageCode);

      expect(getBotLanguageFromCache("cache-guild-1")).toBe("sv-SE");

      // Verify isolated states correctly
      expect(getBotLanguageFromCache("cache-guild-2")).toBeUndefined();
    });
  });

  describe("saveLanguageToDB()", () => {
    it("should successfully structure an upsert mapping explicitly pushing payload properties into schema configs", async () => {
      (GuildSettings.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(true);

      const payload = await saveLanguageToDB(
        "save-guild",
        "sv-SE" as LanguageCode
      );

      expect(GuildSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { guildId: "save-guild" },
        { language: "sv-SE" },
        { upsert: true }
      );
      expect(payload).toBe("sv-SE");
    });
  });

  describe("getLanguageFromDB()", () => {
    it("should short-circuit DB completely natively yielding cache properties if available locally", async () => {
      saveBotLanguageToCache("cached-guild", "sv-SE" as LanguageCode);

      const payload = await getLanguageFromDB("cached-guild");

      expect(payload).toBe("sv-SE");
      expect(GuildSettings.findOne).not.toHaveBeenCalled();
    });

    it("should fetch natively from DB bridging payloads directly into memory caches seamlessly if not cached", async () => {
      (GuildSettings.findOne as jest.Mock).mockResolvedValueOnce({
        language: "sv-SE",
      });

      // Confirm cache is entirely empty initially
      expect(getBotLanguageFromCache("uncached-guild")).toBeUndefined();

      const payload = await getLanguageFromDB("uncached-guild");

      // Validates external Mongoose calls happened cleanly
      expect(GuildSettings.findOne).toHaveBeenCalledWith({
        guildId: "uncached-guild",
      });

      // Return payload mapping success
      expect(payload).toBe("sv-SE");

      // Verification bridging cache implicitly updated internally successfully!
      expect(getBotLanguageFromCache("uncached-guild")).toBe("sv-SE");
    });

    it("should default gracefully natively mapping the constant fallback pushing recursively into the DB and Caching when unmapped completely", async () => {
      // Missing entry inside DB cleanly resolving null mappings typically
      (GuildSettings.findOne as jest.Mock).mockResolvedValueOnce(null);
      (GuildSettings.findOneAndUpdate as jest.Mock).mockResolvedValueOnce(true);

      const payload = await getLanguageFromDB("empty-guild");

      expect(GuildSettings.findOne).toHaveBeenCalledWith({
        guildId: "empty-guild",
      });

      // Verifies internal map resolving natively recursively mapping schema structures completely cleanly
      expect(GuildSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { guildId: "empty-guild" },
        { language: DEFAULT_LANGUAGE },
        { upsert: true }
      );

      // Verifies returning defaults properly
      expect(payload).toBe(DEFAULT_LANGUAGE);

      // Verifies cache populated
      expect(getBotLanguageFromCache("empty-guild")).toBe(DEFAULT_LANGUAGE);
    });

    it("should catch broken db saving attempts globally resolving smoothly back to the fallback payload completely implicitly bypassing memory caches", async () => {
      (GuildSettings.findOne as jest.Mock).mockResolvedValueOnce(null);

      // The recursively executed save process throwing API boundaries mapping rejection completely
      const unexpectedError = new Error("Mongoose Offline");
      (GuildSettings.findOneAndUpdate as jest.Mock).mockRejectedValueOnce(
        unexpectedError
      );

      const payload = await getLanguageFromDB("broken-guild");

      // Returns payload securely preventing executing upstream loops failing dynamically
      expect(payload).toBe(DEFAULT_LANGUAGE);

      // Should not be cached typically if saving failed dynamically implicitly natively evaluating internally within try-catch layouts
      expect(getBotLanguageFromCache("broken-guild")).toBeUndefined();

      // Confirms console intercepted mapping
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to save language to DB",
        unexpectedError
      );
    });
  });
});
