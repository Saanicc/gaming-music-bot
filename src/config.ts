import dotenv from "dotenv";

dotenv.config();

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  YOUTUBE_COOKIE,
  MONGO_URI,
  NODE_ENV,
  DISCORD_GUILD_ID,
} = process.env;

if (
  !DISCORD_TOKEN ||
  !DISCORD_CLIENT_ID ||
  !SPOTIFY_CLIENT_ID ||
  !SPOTIFY_CLIENT_SECRET ||
  !YOUTUBE_COOKIE ||
  !MONGO_URI
) {
  throw new Error("Missing environment variables");
}

export const config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  YOUTUBE_COOKIE,
  MONGO_URI,
  NODE_ENV: NODE_ENV || "production",
  DISCORD_GUILD_ID: DISCORD_GUILD_ID || "",
};
