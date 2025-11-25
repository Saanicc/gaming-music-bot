import config from "@/bot-config.json";

export type ColorType = keyof typeof config.colors;
export type Colors = Record<ColorType, number>;

const parseColor = (hex: string): number => {
  return parseInt(hex.replace("#", ""), 16);
};

export const colors: Colors = Object.entries(config.colors).reduce(
  (acc, [key, value]) => {
    acc[key as ColorType] = parseColor(value);
    return acc;
  },
  {} as Colors
);
