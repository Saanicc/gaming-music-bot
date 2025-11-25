import config from "../../bot-config.json";

export interface RankDefinition {
  minLevel: number;
  title: string;
  titleWithEmoji: string;
  image: string;
  emoji: string;
}

export const RANKS: RankDefinition[] = config.ranks.map(
  (rank) =>
    ({
      minLevel: rank.minLevel,
      title: rank.title,
      titleWithEmoji: `${rank.title} ${rank.emoji}`,
      image: rank.imageUrl,
      emoji: rank.emoji,
    } as RankDefinition)
);

export const getRankTitle = (level: number): string => {
  const rank = RANKS.find((r) => level >= r.minLevel);
  return rank ? rank.title : RANKS[RANKS.length - 1].title;
};

export const getRankTitleWithEmoji = (level: number): string => {
  const rank = RANKS.find((r) => level >= r.minLevel);
  return rank ? rank.titleWithEmoji : RANKS[RANKS.length - 1].titleWithEmoji;
};

export const getRankImage = (level: number): string => {
  const rank = RANKS.find((r) => level >= r.minLevel);
  return rank ? rank.image : RANKS[RANKS.length - 1].image;
};
