import { SearchQueryType, Playlist, Track } from "discord-player";
import { SoundcloudExtractor } from "discord-player-soundcloud";
import { DeezerExtractor } from "discord-player-deezer";
import { xpEmoji } from "../constants/emojis";
import { useTranslations } from "../hooks/useTranslations";

const gifs = [
  "https://c.tenor.com/oLvqOD4_sPUAAAAd/tenor.gif",
  "https://c.tenor.com/ifwnXMvqE0sAAAAC/tenor.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHQyMXRncDhtc2hwdGpidGpqcXB2MzByM200NGc1bWg0eDZwNWRkZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/ABgNxvbk95V3W/giphy.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYmE0NmkxYjRxYWFubW55ODJ1MGQ1YmViYTJ4aWUzeXd2OGd2M2JxbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/63MO9LTRoTXQk/giphy.gif",
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExaHBoYzE0aDZkN2xxNWhzcHBmNnR4NXd4c3V0OTNpdzJ5aW1jc2ZlNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/XeNrmVGsK2sHIjUosG/giphy.gif",
  "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExeDV1aGtwbno0NGJ0Z25tNTlueXIzdGhvMHhqZ3J2enE1cXJ0c3RtMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI1erPMTMBFmNHi/giphy.gif",
  "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2xvcnZ3YWJ1eHI0bTNnZmxieG90aW1tendlMzI1ZGxzcHdkcjJvcCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EBDuUkEh5ctI7augD8/giphy.gif",
];

export const getRandomFightGif = async () => {
  return gifs[Math.floor(Math.random() * gifs.length)];
};

export const getTreasureInfo = (
  userId: string,
  gainedXP: number,
  t: ReturnType<typeof useTranslations>
) => {
  if (!gainedXP) return;

  let title: string;
  let message: string;

  switch (true) {
    case gainedXP >= 200:
      title = t("levelSystem.treasure.legendary.title", {
        emoji: xpEmoji.legendary,
      });
      message = t("levelSystem.treasure.legendary.message", {
        user: userId,
      });
      break;
    case gainedXP >= 100:
      title = t("levelSystem.treasure.epic.title", {
        emoji: xpEmoji.epic,
      });
      message = t("levelSystem.treasure.epic.message", {
        user: userId,
      });
      break;
    case gainedXP >= 50:
      title = t("levelSystem.treasure.rare.title", {
        emoji: xpEmoji.rare,
      });
      message = t("levelSystem.treasure.rare.message", {
        user: userId,
      });
      break;
    case gainedXP >= 20:
      title = t("levelSystem.treasure.lucky.title", {
        emoji: xpEmoji.gold,
      });
      message = t("levelSystem.treasure.lucky.message", {
        user: userId,
      });
      break;
    default:
      title = t("levelSystem.treasure.small.title", {
        emoji: xpEmoji.coins,
      });
      message = t("levelSystem.treasure.small.message", {
        user: userId,
      });
  }

  return {
    title,
    description: `${message} (+${gainedXP} XP)`,
  };
};

export const getSearchEngine = (
  query: string
): `ext:${string}` | SearchQueryType | undefined => {
  const normalizedQuery = query.toLowerCase();
  if (normalizedQuery.includes("soundcloud.com")) {
    return `ext:${SoundcloudExtractor.identifier}`;
  } else if (normalizedQuery.includes("deezer.com")) {
    return `ext:${DeezerExtractor.identifier}`;
  }

  return;
};

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
