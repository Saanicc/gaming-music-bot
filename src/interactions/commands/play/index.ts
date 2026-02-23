import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { GENRES } from "@/src/utils/constants/music-quiz-search-queries";
import { useMainPlayer, useQueue } from "discord-player";
import { buildMessage } from "@/src/utils/bot-message/buildMessage";
import { execute as executePlayQuery } from "./play";
import { execute as executePlayNow } from "./playNow";
import { execute as executePlayNext } from "./playnext";
import { execute as executePlayBossMusic } from "./playBossMusic";
import { execute as executePlayRandomPlaylist } from "./random/playlist";
import { execute as executePlayRandomTrack } from "./random/track";

export const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Play commands")
  .addSubcommandGroup((group) =>
    group
      .setName("boss")
      .setDescription("Boss command group")
      .addSubcommand((subcommand) =>
        subcommand.setName("music").setDescription("Play boss music")
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
      .setDescription("Play a track")
      .addStringOption((option) =>
        option
          .setName("query")
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
          .setName("query")
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
          .setName("query")
          .setDescription("The url or query to search for")
          .setRequired(true)
      )
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);
  const player = useMainPlayer();
  let queue = useQueue();

  const member = await interaction.guild?.members.fetch(interaction.user.id);
  const voiceChannel = member?.voice.channel;
  const textChannel = interaction.channel;

  if (!voiceChannel) {
    const data = buildMessage({
      title: "❌ You must be in a voice channel to play music.",
      ephemeral: true,
    });
    return interaction.reply(data);
  }

  const guild = member.guild;

  if (!queue) {
    queue = player.nodes.create(guild, {
      metadata: { textChannel, voiceChannel },
      leaveOnEnd: false,
      leaveOnEmpty: true,
      leaveOnEmptyCooldown: 15000,
    });
  }

  switch (subcommand) {
    case "music": {
      await executePlayBossMusic({
        interaction,
        player,
        queue,
        voiceChannel,
      });
      break;
    }
    case "playlist": {
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
      break;
    }
    case "track": {
      const genre = interaction.options.getString("genre", false);

      await executePlayRandomTrack({
        interaction,
        genre,
        player,
        queue,
        voiceChannel,
      });
      break;
    }
    case "query": {
      const query = interaction.options.getString("query", true);
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
      const query = interaction.options.getString("query", true);
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
      const query = interaction.options.getString("query", true);
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
};
