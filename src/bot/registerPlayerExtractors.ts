import { Player } from "discord-player";
// import { SpotifyExtractor } from "discord-player-spotify";
import { SoundcloudExtractor } from "discord-player-soundcloud";
import { config } from "../config";
import { YoutubeiExtractor, Log } from "discord-player-youtubei";
import { DeezerExtractor } from "discord-player-deezer";
import { youtubeCookieHandler } from "../utils/helpers/youtubeCookieHandler/youtubeCookieHandler";

Log.setLevel(Log.Level.NONE);

export const registerPlayerExtractors = async (player: Player) => {
  // const spotifyExt = await player.extractors.register(SpotifyExtractor, {
  //   clientId: config.SPOTIFY_CLIENT_ID,
  //   clientSecret: config.SPOTIFY_CLIENT_SECRET,
  //   market: "SE",
  // });
  const deezerExt = await player.extractors.register(DeezerExtractor, {
    arl: config.DEEZER_ARL,
    decryptionKey: config.DEEZER_DECRYPTION_KEY,
  });
  const youtubeiExt = await player.extractors.register(YoutubeiExtractor, {
    cookie: youtubeCookieHandler(),
    logLevel: "ALL",
    useYoutubeDL: true,
  });
  const soundcloudExt = await player.extractors.register(
    SoundcloudExtractor,
    {}
  );

  // if (spotifyExt) spotifyExt.priority = 3;
  if (deezerExt) deezerExt.priority = 3;
  if (youtubeiExt) youtubeiExt.priority = 2;
  if (soundcloudExt) soundcloudExt.priority = 1;
};
