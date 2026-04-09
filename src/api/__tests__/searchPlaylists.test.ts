/**
 * Tests for src/api/searchPlaylists.ts
 */
import { searchPlaylists } from "../searchPlaylists";
import { searchSpotifyPlaylists } from "../spotify";
import { searchDeezerPlaylists } from "../deezer";
import { config } from "../../config";

jest.mock("../spotify", () => ({
  searchSpotifyPlaylists: jest.fn(),
}));

jest.mock("../deezer", () => ({
  searchDeezerPlaylists: jest.fn(),
}));

jest.mock("../../config", () => ({
  config: {
    SPOTIFY_CLIENT_ID: "mock-id",
    SPOTIFY_CLIENT_SECRET: "mock-secret",
  },
}));

describe("Playlist Aggregator Service (searchPlaylists.ts)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("API Availability Execution", () => {
    afterEach(() => {
      // Revert configs safely preventing global leak
      config.SPOTIFY_CLIENT_ID = "mock-id";
      config.SPOTIFY_CLIENT_SECRET = "mock-secret";
    });

    it("should instantly execute and return Spotify payloads directly natively skipping Deezer evaluation completely if config limits structurally exist AND payload generates successfully", async () => {
      const mockResult = ["https://spotify/game-music"];
      (searchSpotifyPlaylists as jest.Mock).mockResolvedValueOnce(mockResult);

      const payload = await searchPlaylists("game");

      expect(searchSpotifyPlaylists).toHaveBeenCalledWith("game");
      expect(searchDeezerPlaylists).not.toHaveBeenCalled();
      expect(payload).toEqual(mockResult);
    });

    it("should recursively cascade natively dropping gracefully into Deezer payload execution bounds whenever Spotify effectively evaluates zero map layouts locally", async () => {
      // Spotify returns absolutely nothing organically natively
      (searchSpotifyPlaylists as jest.Mock).mockResolvedValueOnce([]);

      const mockDeezerResult = ["https://deezer/game-mix"];
      (searchDeezerPlaylists as jest.Mock).mockResolvedValueOnce(
        mockDeezerResult
      );

      const payload = await searchPlaylists("game");

      // Verify routing effectively dropped linearly checking both hooks seamlessly
      expect(searchSpotifyPlaylists).toHaveBeenCalledWith("game");
      expect(searchDeezerPlaylists).toHaveBeenCalledWith("game");
      expect(payload).toEqual(mockDeezerResult);
    });

    it("should unconditionally bypass Spotify routing directly pushing into Deezer evaluation if the ID token maps falsy in configurations", async () => {
      config.SPOTIFY_CLIENT_ID = ""; // Simulate empty environment variable

      const mockDeezerResult = ["https://deezer/pure"];
      (searchDeezerPlaylists as jest.Mock).mockResolvedValueOnce(
        mockDeezerResult
      );

      const payload = await searchPlaylists("test");

      expect(searchSpotifyPlaylists).not.toHaveBeenCalled();
      expect(searchDeezerPlaylists).toHaveBeenCalledWith("test");
      expect(payload).toEqual(mockDeezerResult);
    });

    it("should unconditionally bypass Spotify routing natively if the SECRET token specifically drops cleanly from configuration limits", async () => {
      config.SPOTIFY_CLIENT_SECRET = undefined as any;

      const mockDeezerResult = ["https://deezer/pure2"];
      (searchDeezerPlaylists as jest.Mock).mockResolvedValueOnce(
        mockDeezerResult
      );

      const payload = await searchPlaylists("test");

      expect(searchSpotifyPlaylists).not.toHaveBeenCalled();
      expect(searchDeezerPlaylists).toHaveBeenCalledWith("test");
      expect(payload).toEqual(mockDeezerResult);
    });
  });
});
