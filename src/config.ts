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

if (!NODE_ENV || NODE_ENV !== "dev") {
  console.warn("Development NODE_ENV is not set! Defaulting to 'production'.");
}

if (NODE_ENV === "dev" && !DISCORD_GUILD_ID) {
  throw new Error(
    "DISCORD_GUILD_ID is not set! It is required for guild command deployment in dev mode."
  );
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
