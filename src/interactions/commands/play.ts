import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { useMainPlayer, useQueue } from "discord-player";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { updateUserLevel } from "@/utils/helpers/updateUserLevel";
import { getSearchEngine } from "@/utils/helpers/getSearchEngine";
import { getThumbnail } from "@/utils/helpers/utils";

export const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Plays a track from a url or search query")
  .addStringOption((option) =>
    option
      .setName("query")
      .setDescription("The url or query to search for")
      .setRequired(true)
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const player = useMainPlayer();
  const queue = useQueue();

  const query = interaction.options.getString("query", true);
  const member = await interaction.guild?.members.fetch(interaction.user.id);
  const channel = member?.voice.channel;

  if (!channel) {
    const data = buildMessage({
      title: "❌ You must be in a voice channel.",
      ephemeral: true,
    });
    return interaction.reply(data);
  }

  const guild = member.guild;
  let normalQueue = queue;

  if (!normalQueue) {
    normalQueue = player.nodes.create(guild, {
      metadata: { channel: interaction.channel, voiceChannel: channel },
      leaveOnEnd: false,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 15000,
    });
  }

  try {
    const result = await player.search(query, {
      requestedBy: interaction.user,
      searchEngine: getSearchEngine(query),
    });

    if (!result.tracks.length) {
      const data = buildMessage({
        title: "❌ No results found.",
      });
      return interaction.reply(data);
    }

    let message = null;

    if (result.hasPlaylist()) {
      normalQueue.addTrack(result.playlist?.tracks ?? []);

      message = buildMessage({
        title: `Queued`,
        description: `[${result.playlist?.title}](${result.playlist?.url}) with ${result.playlist?.tracks.length} tracks`,
        thumbnail: getThumbnail(result.playlist),
        footerText:
          "Not the correct track? Try being more specific or enter a URL",
        color: "queue",
      });
    } else {
      const track = result.tracks[0];
      normalQueue.addTrack(track);

      message = buildMessage({
        title: `Queued at position #${normalQueue.tracks.size}`,
        description: `${getFormattedTrackDescription(track, normalQueue)}`,
        thumbnail: getThumbnail(result.tracks[0]),
        footerText:
          "Not the correct track? Try being more specific or enter a URL",
        color: "queue",
      });
    }

    interaction.reply(message);

    await updateUserLevel(interaction, guild.id, "play");

    if (!normalQueue.connection) await normalQueue.connect(channel);
    if (!normalQueue.isPlaying()) await normalQueue.node.play();
  } catch (error) {
    console.error(error);
  }
};
