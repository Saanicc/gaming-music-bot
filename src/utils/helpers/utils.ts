import { Playlist, Track } from "discord-player";

export const capitalize = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getThumbnail = (obj: Track | Playlist | null | undefined) => {
  const THUMBNAIL = "https://freesvg.org/storage/img/thumb/vinyl-plokstele.png";
  if (!obj || !obj.thumbnail) return THUMBNAIL;

  return obj.thumbnail;
};

export const removeWww = (url: string) => {
  return url.replace(/^(https?:\/\/)www\./, "$1");
};
