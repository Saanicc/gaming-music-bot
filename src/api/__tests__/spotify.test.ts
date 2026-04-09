/**
 * Tests for src/api/spotify.ts
 */
import { searchSpotifyPlaylists, getSpotifyToken } from "../spotify";

jest.mock("../../config", () => ({
  config: {
    SPOTIFY_CLIENT_ID: "mock-client-id",
    SPOTIFY_CLIENT_SECRET: "mock-client-secret",
  },
}));

jest.mock("../../utils/constants/music-quiz-search-queries", () => ({
  GENRES: ["rock", "pop", "jazz", "electronic", "game"],
}));

describe("Spotify API Integration (spotify.ts)", () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Fix Math.random for offset predictability
    jest.spyOn(Math, "random").mockReturnValue(0.5); // => floor(0.5 * 999) + 1 = 500

    fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      // Intercept Token Requests
      if (url.toString().includes("token")) {
        return {
          json: async () => ({ access_token: "mock-token", expires_in: 3600 }),
        } as any;
      }
      // Default Search Requests natively return empty
      return {
        ok: true,
        json: async () => ({ playlists: { items: [] } }),
      } as any;
    });

    // We intentionally force token expiration backward since state lives outside the function
    jest.advanceTimersByTime(4000 * 1000);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const mockSearchResponseOnce = (items: any[]) => {
    fetchSpy.mockImplementationOnce(async (url) => {
      if (url.toString().includes("token")) {
        return {
          json: async () => ({ access_token: "mock-token", expires_in: 3600 }),
        } as any;
      }
      return { ok: true, json: async () => ({ playlists: { items } }) } as any;
    });
  };

  describe("Token Retrieval & Caching", () => {
    it("should initially execute a POST auth lookup, and securely cache the payload to avoid duplicate networking calls", async () => {
      // First call (cache missing/expired implicitly in beforeEach)
      const token1 = await getSpotifyToken();

      const authCalls = fetchSpy.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("token")
      );
      expect(authCalls).toHaveLength(1);
      expect(token1).toBe("mock-token");

      // Execute again immediately without advancing time
      const token2 = await getSpotifyToken();

      const newAuthCalls = fetchSpy.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("token")
      );

      // Should STILL only be 1 evaluation natively as the cached payload skipped logic execution!
      expect(newAuthCalls).toHaveLength(1);
      expect(token2).toBe("mock-token");
    });

    it("should fetch natively again pushing cache expiration validations if timelines dynamically advance successfully past bounds", async () => {
      // Massively advance time completely bypassing ANY potential lingering module cache variables from previous tests dynamically
      jest.advanceTimersByTime(800000 * 1000);

      await getSpotifyToken(); // Forced guaranteed fresh native fetch lookup mapping securely

      // Fast forward explicitly past the internal 3600 seconds threshold
      jest.advanceTimersByTime(3601 * 1000);

      await getSpotifyToken(); // Should trigger EXACTLY 1 new guaranteed fetch evaluation natively

      const authCalls = fetchSpy.mock.calls.filter(
        (call) => typeof call[0] === "string" && call[0].includes("token")
      );
      expect(authCalls).toHaveLength(2); // Exact tracking guarantees deterministic execution layouts natively!
    });
  });

  describe("API Data Parsing & Extraction", () => {
    it("should gracefully extract urls catching matching title patterns perfectly", async () => {
      mockSearchResponseOnce([
        {
          name: "Epic Game Hits",
          description: "Focus tracks",
          external_urls: { spotify: "https://spotify/target" },
        },
      ]);
      const results = await searchSpotifyPlaylists("game", 0);

      expect(results).toHaveLength(1);
      expect(results[0]).toBe("https://spotify/target");
    });

    it("should skip purely empty/null elements natively returned by sparse API payload mapping", async () => {
      mockSearchResponseOnce([
        null, // Blank objects natively injected randomly natively by Spotify sometimes
        {
          name: "Game Beats",
          description: "Beats!",
          external_urls: { spotify: "https://spotify/real" },
        },
      ]);

      const results = await searchSpotifyPlaylists("game", 0);

      expect(results).toEqual(["https://spotify/real"]);
    });

    it("should skip payloads safely dropping items if neither name nor description strings securely include the base query", async () => {
      mockSearchResponseOnce([
        {
          name: "Unrelated Strings",
          description: "Unknown stuff",
          external_urls: { spotify: "skipped" },
        },
      ]);
      const results = await searchSpotifyPlaylists("game", 0);

      expect(results).toEqual([]);
    });

    describe("Conflicting Genre Filters", () => {
      it("should selectively drop items dynamically tracking descriptions that bleed into non-target genres implicitly", async () => {
        mockSearchResponseOnce([
          {
            name: "Game Beats",
            description: "Some fun rock and roll", // Bleeds into "rock" (conflicting genre internally)
            external_urls: { spotify: "skipped" },
          },
          {
            name: "Game Focus",
            description: "pure focus", // Clean
            external_urls: { spotify: "target" },
          },
        ]);

        const results = await searchSpotifyPlaylists("game", 0);

        expect(results).toEqual(["target"]); // Filters out the rock-polluted track flawlessly!
      });

      it("should not falsely drop items gracefully matching the intended mapped query precisely", async () => {
        mockSearchResponseOnce([
          {
            name: "Fast Rock",
            description: "pure rock elements!",
            external_urls: { spotify: "rock-item" },
          },
        ]);

        // Since my target IS "rock", it does not conflict intelligently preventing self-elimination limits dynamically.
        const results = await searchSpotifyPlaylists("rock", 0);

        expect(results).toEqual(["rock-item"]);
      });
    });
  });

  describe("Fallback & Retry Logic Architecture", () => {
    beforeEach(() => {
      // Force all search calls to inherently yield zero items forcing native retries dynamically
      fetchSpy.mockImplementation(async (url) => {
        if (url.toString().includes("token"))
          return {
            json: async () => ({ access_token: "mock", expires_in: 3600 }),
          } as any;
        return {
          ok: true,
          json: async () => ({ playlists: { items: [] } }),
        } as any;
      });
    });

    it("should successfully cascade missing bounds cleanly through 3 randomized parameters sequentially without breaking", async () => {
      // Math.random offset is 500
      const results = await searchSpotifyPlaylists("target", 150);

      // Safe returns successfully bounds tracking termination limit
      expect(results).toEqual([]);

      // Evaluates search routing exactly:
      const searchCalls = fetchSpy.mock.calls.filter(
        (call) => typeof call[0] === "string" && !call[0].includes("token")
      );

      expect(searchCalls).toHaveLength(3);

      // Call 0 -> requested offset limit externally cleanly (150)
      expect(searchCalls[0][0]).toContain("offset=150");

      // Call 1 -> retry 0 offset mismatching bounds internally randomizing (500)
      expect(searchCalls[1][0]).toContain("offset=500");

      // Call 2 -> retry 1 missing tracking dynamically resetting securely to 0 locally!
      expect(searchCalls[2][0]).toContain("offset=0");
    });

    it("should unconditionally exit natively avoiding recursive timeouts parsing MAX_RETRIES exactly securely", async () => {
      // Force breaking limits initializing search at boundary explicitly securely dynamically
      const results = await searchSpotifyPlaylists("target", 0, 3); // 3 > MAX_RETRIES (2)

      expect(results).toEqual([]);
      const searchCalls = fetchSpy.mock.calls.filter(
        (call) => typeof call[0] === "string" && !call[0].includes("token")
      );

      expect(searchCalls).toHaveLength(0); // Totally halts executing loops upstream!
    });

    it("should yield empty array mapping natively gracefully dropping routing entirely when fetch .ok maps flawlessly to false", async () => {
      // Specifically inject HTTP mapping issues mapping securely gracefully internally avoiding crashing processes globally!
      fetchSpy.mockImplementationOnce(async (url) => {
        if (url.toString().includes("token"))
          return {
            json: async () => ({ access_token: "mock", expires_in: 3600 }),
          } as any;
        return { ok: false, json: async () => ({}) } as any;
      });

      const results = await searchSpotifyPlaylists("target", 0);
      expect(results).toEqual([]);
    });
  });
});
