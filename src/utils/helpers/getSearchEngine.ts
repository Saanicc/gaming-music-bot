import { SearchQueryType } from "discord-player";
import { DeezerExtractor } from "discord-player-deezer";
import { SoundcloudExtractor } from "discord-player-soundcloud";

export const getSearchEngine = (
  query: string
): `ext:${string}` | SearchQueryType | undefined => {
  if (query.includes("soundcloud.com")) {
    return `ext:${SoundcloudExtractor.identifier}`;
  } else if (query.includes("deezer.com")) {
    return `ext:${DeezerExtractor.identifier}`;
  }

  return;
};
