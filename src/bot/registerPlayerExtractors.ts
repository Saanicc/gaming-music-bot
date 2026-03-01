import { Player } from "discord-player";
import { SpotifyExtractor } from "discord-player-spotify";
import { SoundcloudExtractor } from "discord-player-soundcloud";
import { config } from "../config";
import { YoutubeiExtractor } from "discord-player-youtubei";

export const registerPlayerExtractors = async (player: Player) => {
  const spotifyExt = await player.extractors.register(SpotifyExtractor, {
    clientId: config.SPOTIFY_CLIENT_ID,
    clientSecret: config.SPOTIFY_CLIENT_SECRET,
    market: "SE",
  });
  const youtubeiExt = await player.extractors.register(YoutubeiExtractor, {
    cookie: config.YOUTUBE_COOKIE,
    logLevel: "ALL",
    useYoutubeDL: true,
  });
  const soundcloudExt = await player.extractors.register(
    SoundcloudExtractor,
    {}
  );

  if (spotifyExt) spotifyExt.priority = 3;
  if (youtubeiExt) youtubeiExt.priority = 2;
  if (soundcloudExt) soundcloudExt.priority = 1;
};
