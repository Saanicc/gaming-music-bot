import { GuildQueue, Track } from "discord-player";

export const getFormattedTrackDescription = (
  track: Track | null,
  queue: GuildQueue | null
) => {
  if (!track) return "N/A";

  const totalTime = queue?.node.getTimestamp()?.total.label;

  let desc: string;

  if (
    track.url.match(/https:\/\/open.spotify.com\/track\/.*/) ||
    track.url.match(/https:\/\/www.deezer.com\/track\/.*/)
  ) {
    desc = `[${track.title}](${track.url}) - ${track.author}`;
  } else {
    desc = `[${track.title}](${track.url})`;
  }

  if (!queue) return desc;

  if (queue.currentTrack?.id === track.id) {
    return `${desc} [${totalTime}]`;
  }
  return desc;
};
