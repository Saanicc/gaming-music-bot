import { config } from "../config";
import { GENRES } from "../utils/constants/music-quiz-search-queries";

type SpotifyPlaylist = {
  collaborative: boolean;
  description: string;
  external_urls: {
    spotify: string;
  };
  href: string;
  id: string;
  images: [{ url: string }];
  name: string;
  owner: {
    display_name: string;
    external_urls: { spotify: string };
    href: string;
    id: string;
    type: string;
    uri: string;
  };
  primary_color: string | null;
  public: boolean;
  snapshot_id: string;
  tracks: {
    href: string;
    total: number;
  };
  items: {
    href: string;
    total: number;
  };
  type: "playlist";
  uri: string;
};

let cachedToken: string | null = null;
let tokenExpires = 0;

const getSpotifyToken = async (): Promise<string> => {
  const now = Date.now();

  if (cachedToken && now < tokenExpires) {
    return cachedToken;
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "client_credentials",
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization:
        "Basic " +
        Buffer.from(
          config.SPOTIFY_CLIENT_ID + ":" + config.SPOTIFY_CLIENT_SECRET
        ).toString("base64"),
    },
  });

  const data = await response.json();

  cachedToken = data.access_token;
  tokenExpires = now + data.expires_in * 1000;

  return cachedToken!;
};

export const searchSpotifyPlaylists = async (
  query: string,
  offset: number = Math.floor(Math.random() * 100)
): Promise<string[]> => {
  const token = await getSpotifyToken();

  const response = await fetch(
    "https://api.spotify.com/v1/search?" +
      new URLSearchParams({
        q: query,
        type: "playlist",
        limit: "50",
        offset: offset.toString(),
      }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data = await response.json();

  if (!response.ok || !data.playlists?.items) {
    return [];
  }

  const playlists = data.playlists.items as (SpotifyPlaylist | null)[];
  const lowerQuery = query.toLowerCase();

  const conflictingGenres = GENRES.filter(
    (g) =>
      g.toLowerCase() !== lowerQuery && !lowerQuery.includes(g.toLowerCase())
  ).map((g) => g.toLowerCase());

  const result = playlists
    .filter((p) => {
      if (p === null) return false;

      const description = (p.description ?? "").toLowerCase();
      const matchesQuery =
        p.name.toLowerCase().includes(lowerQuery) ||
        description.includes(lowerQuery);
      if (!matchesQuery) return false;

      const hasConflictingGenre = conflictingGenres.some((genre) =>
        description.includes(genre)
      );
      if (hasConflictingGenre) return false;

      return true;
    })
    .map((p) => p!.external_urls.spotify);

  if (result.length === 0 && offset !== 0) {
    return searchSpotifyPlaylists(query, 0);
  }

  return result;
};
