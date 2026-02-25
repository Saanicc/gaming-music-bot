import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { useMainPlayer, useQueue } from "discord-player";
import { getThumbnail } from "@/utils/helpers/utils";
import { BossTrack, TrackType } from "@/models/BossTrack";
import { getSearchEngine } from "@/utils/helpers/getSearchEngine";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { useTranslations } from "@/utils/hooks/useTranslations";

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
      .setDescription("Select the type of track")
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
  const t = useTranslations(interaction.guildId ?? "");

  const url = interaction.options.getString("url", true);
  const selectedType = interaction.options.getString("type", true) as TrackType;

  if (!url.match(/https:\/\/.*.*/))
    return guardReply(interaction, "INVALID_URL");

  let trackAlreadyExist: Boolean;

  try {
    trackAlreadyExist = !!(await BossTrack.findOne({ trackUrl: url }));
  } catch (error) {
    console.error(
      `[addTrack (find in DB)]: ${
        error instanceof Error ? error.message : error
      }`
    );

    return guardReply(interaction, "GENERIC_ERROR");
  }

  if (trackAlreadyExist) return guardReply(interaction, "TRACK_ALREADY_EXISTS");

  const player = useMainPlayer();
  const queue = useQueue();

  const result = await player.search(url, {
    requestedBy: interaction.user,
    searchEngine: getSearchEngine(url),
  });

  if (result.tracks.length === 0)
    return guardReply(interaction, "NO_TRACK_FOUND");

  try {
    await BossTrack.create({ trackUrl: url, trackType: selectedType });
  } catch (error) {
    console.error(
      `[addTrack (add to DB)]: ${
        error instanceof Error ? error.message : error
      }`
    );

    return guardReply(interaction, "DB_SAVE_ERROR");
  }

  const data = buildMessage({
    title: t("commands.addTrack.message.trackAdded"),
    description: t("commands.addTrack.message.trackAddedDescription", {
      user: interaction.user.toString(),
      track: getFormattedTrackDescription(result.tracks[0], queue),
      type:
        selectedType === "song"
          ? t("commands.addTrack.message.bossMusic")
          : t("commands.addTrack.message.hornSound"),
    }),
    thumbnail: getThumbnail(result.tracks[0]),
    color: "success",
  });

  return interaction.reply(data);
};
