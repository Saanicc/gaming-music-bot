import { searchDeezerPlaylists } from "./deezer";
import { searchSpotifyPlaylists } from "./spotify";

export const searchPlaylists = async (query: string) => {
  let result = await searchSpotifyPlaylists(query);
  if (!result.length) await searchDeezerPlaylists(query);
  return result;
};
