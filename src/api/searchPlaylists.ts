import { config } from "../config";
import { searchDeezerPlaylists } from "./deezer";
import { searchSpotifyPlaylists } from "./spotify";

export const searchPlaylists = async (query: string) => {
  if (config.SPOTIFY_CLIENT_ID && config.SPOTIFY_CLIENT_SECRET) {
    let result = await searchSpotifyPlaylists(query);
    if (!result.length) result = await searchDeezerPlaylists(query);
    return result;
  }

  return await searchDeezerPlaylists(query);
};
