import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { useMainPlayer, useQueue } from "discord-player";
import { GENRES } from "@/utils/constants/music-quiz-search-queries";
import { guardReply } from "@/utils/helpers/interactions";
import { getPlaylistChoices } from "@/utils/helpers/track";
import { execute as executePlayQuery } from "./query";
import { execute as executePlayNow } from "./now";
import { execute as executePlayNext } from "./next";
import { execute as executePlayBossMusic } from "./bossMusic";
import { execute as executePlayRandomPlaylist } from "./random/playlist";
import { execute as executePlayRandomTrack } from "./random/track";
import { execute as executePlayPlaylist } from "./playlist";

export const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription("All available play commands")
  .addSubcommandGroup((group) =>
    group
      .setName("boss")
      .setDescription("Boss command group")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("music")
          .setDescription("Start playing your self curated boss music!")
      )
  )
  .addSubcommandGroup((group) =>
    group
      .setName("random")
      .setDescription("Random command group")
      .addSubcommand((subcommand) =>
        subcommand
          .setName("playlist")
          .setDescription("Play a random playlist")
          .addStringOption((option) =>
            option
              .setName("genre")
              .setDescription("The genre of music to play.")
              .setRequired(false)
              .addChoices(
                ...GENRES.map((query) => ({
                  name: query,
                  value: query,
                }))
              )
          )
          .addIntegerOption((option) =>
            option
              .setName("amount")
              .setDescription("Number of tracks to play.")
              .setRequired(false)
              .addChoices(
                ...[10, 20, 30, 40, 50].map((query) => ({
                  name: query.toString(),
                  value: query,
                }))
              )
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("track")
          .setDescription("Play a random track")
          .addStringOption((option) =>
            option
              .setName("genre")
              .setDescription("The genre of music to play.")
              .setRequired(false)
              .addChoices(
                ...GENRES.map((query) => ({
                  name: query,
                  value: query,
                }))
              )
          )
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("query")
      .setDescription("Plays a track from a url or search query")
      .addStringOption((option) =>
        option
          .setName("term")
          .setDescription("The url or query to search for")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("now")
      .setDescription("Instantly play a track from a url or search term")
      .addStringOption((option) =>
        option
          .setName("term")
          .setDescription("The url or query to search for")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("next")
      .setDescription(
        "Enqueues a track from a url or search term, then plays it after the current track ends"
      )
      .addStringOption((option) =>
        option
          .setName("term")
          .setDescription("The url or query to search for")
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("playlist")
      .setDescription("Enqueues one of your own playlists")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("The name of the playlist to play")
          .setAutocomplete(true)
          .setRequired(true)
      )
  );

export const autocomplete = async (interaction: AutocompleteInteraction) => {
  await getPlaylistChoices(interaction);
};

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const subcommand = interaction.options.getSubcommand(true);
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  const player = useMainPlayer();
  let queue = useQueue();

  const member = await interaction.guild?.members.fetch(interaction.user.id);
  const voiceChannel = member?.voice.channel;
  const textChannel = interaction.channel;

  if (!member || !voiceChannel)
    return guardReply(interaction, "NO_VOICE_CHANNEL", "editReply");

  const guild = member.guild;

  if (!queue) {
    queue = player.nodes.create(guild, {
      metadata: { textChannel, voiceChannel },
      leaveOnEnd: false,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 15000,
    });
  }

  if (subcommandGroup) {
    if (subcommandGroup === "random") {
      if (subcommand === "playlist") {
        const genre = interaction.options.getString("genre", false);
        const amountOfTracks = interaction.options.getInteger("amount", false);

        await executePlayRandomPlaylist({
          interaction,
          genre,
          amountOfTracks,
          player,
          queue,
          voiceChannel,
        });
      } else if (subcommand === "track") {
        const genre = interaction.options.getString("genre", false);

        await executePlayRandomTrack({
          interaction,
          genre,
          player,
          queue,
          voiceChannel,
        });
      }
    } else if (subcommandGroup === "boss") {
      if (subcommand === "music") {
        await executePlayBossMusic({
          interaction,
          player,
          voiceChannel,
        });
      }
    }
  } else {
    switch (subcommand) {
      case "playlist": {
        const playlistId = interaction.options.getString("id", true);

        await executePlayPlaylist({
          interaction,
          playlistId,
          player,
          queue,
          voiceChannel,
        });
        break;
      }
      case "query": {
        const query = interaction.options.getString("term", true);
        await executePlayQuery({
          interaction,
          player,
          queue,
          query,
          voiceChannel,
        });
        break;
      }
      case "now": {
        const query = interaction.options.getString("term", true);
        await executePlayNow({
          interaction,
          player,
          queue,
          query,
          voiceChannel,
        });
        break;
      }
      case "next": {
        const query = interaction.options.getString("term", true);
        await executePlayNext({
          interaction,
          player,
          queue,
          query,
          voiceChannel,
        });
        break;
      }
      default:
        break;
    }
  }
};
