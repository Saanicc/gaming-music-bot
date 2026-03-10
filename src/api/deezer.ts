type DeezerPlaylist = {
  id: number;
  title: string;
  description: string;
  link: string;
  picture: string;
  picture_small: string;
  picture_medium: string;
  picture_big: string;
  picture_xl: string;
  nb_tracks: number;
  fan: number;
  public: boolean;
  user: {
    id: number;
    name: string;
    tracklist: string;
    type: "user";
  };
  type: "playlist";
};

const editorMatchesGenre = (curatorName: string, genre: string): boolean => {
  const DEEZER_EDITOR_REGEX = /deezer\s+(.+?)\s+editor/i;
  const match = curatorName.match(DEEZER_EDITOR_REGEX);
  if (!match) return false;

  return match[1].toLowerCase().includes(genre.toLowerCase());
};

let retry = 0;

export const searchDeezerPlaylists = async (
  query: string,
  index: number = Math.floor(Math.random() * 100),
  officialCurator: boolean = true
): Promise<string[]> => {
  console.log("Retry: ", retry);
  const response = await fetch(
    "https://api.deezer.com/search/playlist?" +
      new URLSearchParams({
        q: query,
        limit: "50",
        index: index.toString(),
      })
  );

  const data = await response.json();

  if (!response.ok || !data.data) {
    return [];
  }

  const lowerQuery = query.toLowerCase();

  const playlists = data.data as DeezerPlaylist[];

  let result: string[] = [];

  if (officialCurator) {
    result = playlists
      .filter((p) => editorMatchesGenre(p.user.name, lowerQuery))
      .map((p) => p.link);
  } else {
    result = playlists
      .filter((p) => p.title.toLowerCase().includes(lowerQuery))
      .map((p) => p.link);
  }

  if (result.length === 0 && officialCurator && index !== 0) {
    retry++;
    return searchDeezerPlaylists(query, 0, true);
  } else if (result.length === 0 && officialCurator && index === 0) {
    retry++;
    const randomIndex = Math.floor(Math.random() * 100);
    return searchDeezerPlaylists(query, randomIndex, false);
  } else if (result.length === 0 && index !== 0) {
    retry++;
    return searchDeezerPlaylists(query, 0, false);
  }

  return result;
};
