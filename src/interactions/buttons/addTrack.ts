import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { useQueue } from "discord-player";
import { getThumbnail } from "@/utils/helpers/utils";
import { BossTrack } from "@/models/BossTrack";
import { addTrackToCache } from "@/utils/helpers/isTrackInCache";
import { emoji } from "@/utils/constants/emojis";

export const addTrackButton = new ButtonBuilder()
  .setCustomId("addTrack")
  .setEmoji(emoji.save)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  await interaction.deferReply();

  const queue = useQueue();

  const trackUrl = queue?.currentTrack?.url;

  if (!trackUrl) {
    const message = buildMessage({
      title: "No url found for the current track",
      ephemeral: true,
      color: "error",
    });

    return interaction.followUp(message);
  }

  let trackAlreadyExist: Boolean;
  try {
    trackAlreadyExist = !!(await BossTrack.findOne({ trackUrl: trackUrl }));
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
    return interaction.followUp(message);
  }

  if (trackAlreadyExist) {
    const message = buildMessage({
      title: "The track already exist!",
      ephemeral: true,
      color: "error",
    });
    return interaction.followUp(message);
  }

  try {
    await BossTrack.create({ trackUrl, trackType: "song" });
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
    return interaction.followUp(message);
  }

  if (interaction.guildId) {
    addTrackToCache(interaction.guildId, trackUrl);
  }

  const data = buildMessage({
    title: `Added successfully`,
    description: `${interaction.user.toString()} added ${getFormattedTrackDescription(
      queue.currentTrack,
      queue
    )} to the boss music library!`,
    thumbnail: getThumbnail(queue.currentTrack),
    color: "success",
  });

  return interaction.followUp(data);
};
