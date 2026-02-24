import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { useMainPlayer, useQueue } from "discord-player";
import { getThumbnail } from "@/utils/helpers/utils";
import { BossTrack, TrackType } from "@/models/BossTrack";
import { getSearchEngine } from "@/utils/helpers/getSearchEngine";

export const data = new SlashCommandBuilder()
  .setName("add_track")
  .setDescription("Add a new track to the boss music library")
  .addStringOption((option) =>
    option
      .setName("url")
      .setDescription("Enter url of track to add")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Select a track type")
      .setRequired(true)
      .addChoices(
        {
          name: "Horn sound",
          value: "horn" as TrackType,
        },
        {
          name: "Song",
          value: "song" as TrackType,
        }
      )
  );

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const url = interaction.options.getString("url", true);
  const selectedType = interaction.options.getString("type", true) as TrackType;

  if (!url.match(/https:\/\/.*.*/)) {
    const data = buildMessage({
      title: "Not a valid url",
      description: "Please enter a valid url",
      ephemeral: true,
      color: "error",
    });
    return interaction.reply(data);
  }

  let trackAlreadyExist: Boolean;

  try {
    trackAlreadyExist = !!(await BossTrack.findOne({ trackUrl: url }));
  } catch (error) {
    console.error(
      `[addTrack (find in DB)]: ${
        error instanceof Error ? error.message : error
      }`
    );

    const message = buildMessage({
      title: "An error occured. Please try again.",
      ephemeral: true,
      color: "error",
    });
    return interaction.reply(message);
  }

  if (trackAlreadyExist) {
    const message = buildMessage({
      title: "The track already exist!",
      ephemeral: true,
      color: "error",
    });
    return interaction.reply(message);
  }

  const player = useMainPlayer();
  const queue = useQueue();

  const result = await player.search(url, {
    requestedBy: interaction.user,
    searchEngine: getSearchEngine(url),
  });

  if (result.tracks.length === 0) {
    const data = buildMessage({
      title: "No track found",
      description:
        "No track with that URL was found, please make sure the URL is valid.",
      color: "error",
      ephemeral: true,
    });

    return interaction.reply(data);
  }

  try {
    await BossTrack.create({ trackUrl: url, trackType: selectedType });
  } catch (error) {
    console.error(
      `[addTrack (add to DB)]: ${
        error instanceof Error ? error.message : error
      }`
    );

    const message = buildMessage({
      title:
        "An error occured when saving track to database. Please try again.",
      ephemeral: true,
      color: "error",
    });
    return interaction.reply(message);
  }

  const data = buildMessage({
    title: `Added successfully`,
    description: `${interaction.user.toString()} added ${getFormattedTrackDescription(
      result.tracks[0],
      queue
    )} to the ${
      selectedType === "song" ? "boss music" : "horn sound"
    } library!`,
    thumbnail: getThumbnail(result.tracks[0]),
    color: "success",
  });

  return interaction.reply(data);
};
