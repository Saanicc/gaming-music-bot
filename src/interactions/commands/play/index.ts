import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { GENRES } from "@/utils/constants/music-quiz-search-queries";
import { useMainPlayer, useQueue } from "discord-player";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { execute as executePlayQuery } from "./query";
import { execute as executePlayNow } from "./now";
import { execute as executePlayNext } from "./next";
import { execute as executePlayBossMusic } from "./bossMusic";
import { execute as executePlayRandomPlaylist } from "./random/playlist";
import { execute as executePlayRandomTrack } from "./random/track";
import { t } from "@/src/ui/translations";

export const data = new SlashCommandBuilder()
  .setName("play")
  .setDescription(t("en-US", "commands.play.description"))
  .addSubcommandGroup((group) =>
    group
      .setName("boss")
      .setDescription(t("en-US", "commands.play.boss.description"))
      .addSubcommand((subcommand) =>
        subcommand
          .setName("music")
          .setDescription(t("en-US", "commands.play.boss.music.description"))
      )
  )
  .addSubcommandGroup((group) =>
    group
      .setName("random")
      .setDescription(t("en-US", "commands.play.random.description"))
      .addSubcommand((subcommand) =>
        subcommand
          .setName("playlist")
          .setDescription(
            t("en-US", "commands.play.random.playlist.description")
          )
          .addStringOption((option) =>
            option
              .setName("genre")
              .setDescription(
                t(
                  "en-US",
                  "commands.play.random.playlist.options.genre.description"
                )
              )
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
              .setDescription(
                t(
                  "en-US",
                  "commands.play.random.playlist.options.amount.description"
                )
              )
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
          .setDescription(t("en-US", "commands.play.random.track.description"))
          .addStringOption((option) =>
            option
              .setName("genre")
              .setDescription(
                t(
                  "en-US",
                  "commands.play.random.track.options.genre.description"
                )
              )
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
      .setDescription(t("en-US", "commands.play.query.description"))
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription(
            t("en-US", "commands.play.query.options.query.description")
          )
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("now")
      .setDescription(t("en-US", "commands.play.now.description"))
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription(
            t("en-US", "commands.play.now.options.query.description")
          )
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("next")
      .setDescription(t("en-US", "commands.play.next.description"))
      .addStringOption((option) =>
        option
          .setName("query")
          .setDescription(
            t("en-US", "commands.play.next.options.query.description")
          )
          .setRequired(true)
      )
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  await interaction.deferReply();

  const subcommand = interaction.options.getSubcommand(true);
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

  switch (subcommand) {
    case "music": {
      await executePlayBossMusic({
        interaction,
        player,
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
