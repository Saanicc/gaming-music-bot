import { queueManager, StoredQueue } from "@/services/queueManager";
import {
  Guild,
  TextBasedChannel,
  TextChannel,
  VoiceBasedChannel,
} from "discord.js";
import { Player, Track, useMainPlayer } from "discord-player";
import { joinVoiceChannel } from "./joinVoiceChannel";

const reSearch = async (track: Track, player: Player) => {
  try {
    const result = await player.search(track.url ?? track.title, {
      requestedBy: track.requestedBy ?? undefined,
    });
    if (result.tracks.length) return result.tracks[0];
  } catch (err) {
    console.warn(`Failed to restore track: ${track.title}`, err);
  }
};

export const restoreOldQueue = async ({
  guild,
  storedQueue,
  textChannel,
  voiceChannel,
}: {
  guild: Guild;
  storedQueue: StoredQueue;
  textChannel?: TextBasedChannel;
  voiceChannel?: VoiceBasedChannel;
}) => {
  const guildId = guild.id;

  if (!voiceChannel || !voiceChannel.isVoiceBased()) {
    console.warn(`No valid voice channel to restore queue for ${guildId}.`);
    return;
  }

  const player = useMainPlayer();

  const newQueue = player.nodes.create(guild, {
    metadata: { textChannel, voiceChannel },
    leaveOnEnd: false,
    leaveOnEmpty: true,
    leaveOnEmptyCooldown: 15000,
  });

  let currentTrack = undefined;
  if (storedQueue.currentTrack) {
    currentTrack = await reSearch(storedQueue.currentTrack, player);
  }

  for (const track of storedQueue.tracks) {
    const rebuilt = await reSearch(track, player);
    if (rebuilt) newQueue.addTrack(rebuilt);
  }

  const joinError = await joinVoiceChannel({
    queue: newQueue,
    voiceChannel,
    textChannel: textChannel as TextChannel,
  });

  if (joinError) return;

  if (currentTrack && storedQueue.position)
    await newQueue.node.play(currentTrack, { seek: storedQueue.position });
  else {
    await newQueue.node.play();
  }

  queueManager.clear(guildId);
};
