import dotenv from "dotenv";

dotenv.config();

type NodeEnv = "dev" | "prod";

interface Config {
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  SPOTIFY_CLIENT_ID: string | undefined;
  SPOTIFY_CLIENT_SECRET: string | undefined;
  YOUTUBE_NETSCAPE_COOKIES_B64: string;
  MONGO_URI: string;
  DEEZER_ARL: string;
  DEEZER_DECRYPTION_KEY: string | undefined;
  NODE_ENV: NodeEnv;
  DISCORD_GUILD_ID: string;
}

const requiredEnvVars = [
  "NODE_ENV",
  "DISCORD_TOKEN",
  "DISCORD_CLIENT_ID",
  "YOUTUBE_NETSCAPE_COOKIES_B64",
  "MONGO_URI",
  "DEEZER_ARL",
] as const;

const missingVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  throw new Error(`Missing environment variables: ${missingVars.join(", ")}`);
}

const {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  YOUTUBE_NETSCAPE_COOKIES_B64,
  MONGO_URI,
  NODE_ENV,
  DISCORD_GUILD_ID,
  DEEZER_ARL,
  DEEZER_DECRYPTION_KEY,
} = process.env as unknown as Config;

if (NODE_ENV === "prod") {
  console.log("Starting PROD environment");
} else if (NODE_ENV === "dev") {
  console.log("Starting DEV environment");
} else {
  throw new Error("NODE_ENV has to be either 'dev' or 'prod'.");
}

if (NODE_ENV === "dev" && !DISCORD_GUILD_ID) {
  throw new Error(
    "DISCORD_GUILD_ID is not set! It is required for guild command deployment in dev mode."
  );
}

export const config: Config = {
  DISCORD_TOKEN,
  DISCORD_CLIENT_ID,
  SPOTIFY_CLIENT_ID,
  SPOTIFY_CLIENT_SECRET,
  YOUTUBE_NETSCAPE_COOKIES_B64,
  MONGO_URI,
  DEEZER_ARL,
  DEEZER_DECRYPTION_KEY,
  NODE_ENV,
  DISCORD_GUILD_ID,
};
