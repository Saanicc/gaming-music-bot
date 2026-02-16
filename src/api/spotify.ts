import { config } from "../config";

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
  query: string
): Promise<string[]> => {
  const token = await getSpotifyToken();

  const response = await fetch(
    "https://api.spotify.com/v1/search?" +
      new URLSearchParams({
        q: query,
        type: "playlist",
        limit: "20",
      }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await response.json();
  const playlists = data.playlists.items as (SpotifyPlaylist | null)[];
  return playlists
    .filter((p) => p !== null)
    .map((p) => p.external_urls.spotify);
};
