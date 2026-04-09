/**
 * Tests for src/api/deezer.ts
 */
import { searchDeezerPlaylists } from "../deezer";

interface DeepPartialPlaylist {
  title?: string;
  link?: string;
  user?: { name: string };
}

describe("Deezer API Integration (deezer.ts)", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default fetch mock returning a clean empty data wrapper to safely execute array evaluations natively without crashing
    fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: [] }),
    } as any);

    // Mock Math.random dynamically ensuring our randomized retry endpoints evaluate identically tracking loops
    jest.spyOn(Math, "random").mockReturnValue(0.5); // Math.floor(0.5 * 100) = 50
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.restoreAllMocks();
  });

  const mockResponse = (playlists: DeepPartialPlaylist[]) => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: playlists }),
    } as any);
  };

  describe("Official Curator Extraction & Genre Matching", () => {
    it("should extract matching lists natively when curated officially using string matched Deezer templates", async () => {
      mockResponse([
        {
          title: "Random Focus",
          link: "https://deezer/1",
          user: { name: "Deezer Lofi Editor" },
        }, // Wrong genre template officially mapped
        {
          title: "Intense Battles",
          link: "https://deezer/2",
          user: { name: "Random User" },
        }, // Correct genre title, but unofficial curator (so dropped natively here)
        {
          title: "Boss Fights",
          link: "https://deezer/correct",
          user: { name: "deezer game editor" },
        }, // True officially curated template map -> Should be extracted 
      ]);

      // Evaluates: officialCurator: true natively
      const results = await searchDeezerPlaylists("game", 0, true);

      expect(results).toHaveLength(1);
      expect(results[0]).toBe("https://deezer/correct");
    });
  });

  describe("Unofficial Filter Mode", () => {
    it("should successfully extract titles regardless of curator when strictly evaluating string queries dynamically", async () => {
      mockResponse([
        {
          title: "Game Music Overload",
          link: "https://deezer/target",
          user: { name: "Not Official Person" },
        },
        {
          title: "Something Else Entirely",
          link: "https://deezer/skip",
          user: { name: "Blank" },
        },
      ]);

      const results = await searchDeezerPlaylists("game", 0, false);

      expect(results).toHaveLength(1);
      expect(results[0]).toBe("https://deezer/target");
    });
  });

  describe("Fallback & Recursive Retries Architecture", () => {
    it("Branch 1: should retry internally resetting index to 0 if official query yields absolutely zero map results at random indexes", async () => {
      // 1st request: index 50 -> yields nothing. 
      mockResponse([]);
      // 2nd request: index 0 (invoked by the logic branch natively) -> yields payload securely.
      mockResponse([
        { title: "Matched", link: "https://deezer/found", user: { name: "deezer target editor" } },
      ]);

      const results = await searchDeezerPlaylists("target", 50, true);

      // Successfully grabbed payload internally recursively
      expect(results).toEqual(["https://deezer/found"]);
      
      // Proves 2 queries were generated seamlessly securely
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // Verify the target query URL tracked params dynamically (checking `index` parameters)
      const firstCallUrl = fetchSpy.mock.calls[0][0] as string;
      expect(firstCallUrl).toContain("index=50");

      const secondCallUrl = fetchSpy.mock.calls[1][0] as string;
      expect(secondCallUrl).toContain("index=0");
    });

    it("Branch 2: should seamlessly drop official filter requirements dynamically if index=0 officially also yields zero map hits natively", async () => {
      // 1st request: index 0 + officialCurator -> yields nothing.
      mockResponse([]);
      // 2nd request: Random index (50 due to 0.5 mock) + unofficial logic -> yields payload safely evaluating loosely!
      mockResponse([
        { title: "Matched target title", link: "https://deezer/fallback-found", user: { name: "someone" } },
      ]);

      const results = await searchDeezerPlaylists("target", 0, true);

      expect(results).toEqual(["https://deezer/fallback-found"]);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      // 1st evaluation -> index: 0
      expect(fetchSpy.mock.calls[0][0]).toContain("index=0");
      // 2nd evaluation -> index: 50 (Math.random mock multiplier)
      expect(fetchSpy.mock.calls[1][0]).toContain("index=50");
    });

    it("Branch 3: should bounce randomly structured unstructured queries backwards mapping cleanly down to index=0 securely on complete misses", async () => {
      // 1st request: random index (e.g. 50) + unofficialCurator -> yields nothing
      mockResponse([]);
      // 2nd request: index 0 + unofficialCurator -> yields something matching loose criteria.
      mockResponse([
        { title: "Target Found Loose", link: "https://deezer/branch-3", user: { name: "nobody" } },
      ]);

      const results = await searchDeezerPlaylists("target", 50, false);

      expect(results).toEqual(["https://deezer/branch-3"]);
      expect(fetchSpy).toHaveBeenCalledTimes(2);

      expect(fetchSpy.mock.calls[0][0]).toContain("index=50");
      expect(fetchSpy.mock.calls[1][0]).toContain("index=0");
    });

    it("should unconditionally terminate safely dropping logic entirely into empty array returns whenever retry counts exceed MAX_RETRIES globally", async () => {
      // Try to search with retry limit already breached tracking boundary natively
      const results = await searchDeezerPlaylists("test", 0, true, 4);

      // Empty mapping array safely resolved
      expect(results).toEqual([]);
      // And evaluating completely bypasses fetch securely dropping loops
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("should intercept total API rejections seamlessly converting networking flaws into structured logic retries implicitly", async () => {
      // Setup payload explicitly rejecting via standard HTTP exception mappings
      fetchSpy.mockRejectedValue(new Error("TCP Connection Refused"));

      // The execution natively loops trying recursively generating payloads until the > 3 limit breaches
      const results = await searchDeezerPlaylists("test", 0, true, 0);

      // Effectively drops execution after trying cleanly 4 times mapping internally natively
      expect(results).toEqual([]);

      // Initial Call (0) -> Retry Call (1) -> Retry Call (2) -> Retry Call (3) -> Then Retry Call (4) skips API fetch entirely! 
      // Thus 4 requests total.
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });
  });
});
