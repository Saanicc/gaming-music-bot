import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { useQueue } from "discord-player";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import {
  getFormattedTrackDescription,
  addTrackToCache,
} from "@/utils/helpers/track";
import { getThumbnail, removeWww } from "@/utils/helpers/utils";
import { db } from "@/db";
import { guardReply } from "@/utils/helpers/interactions";
import { emoji } from "@/utils/constants/emojis";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { musicPlayerMessage } from "../../services/musicPlayerMessage";

export const addTrackButton = new ButtonBuilder()
  .setCustomId("addTrack")
  .setEmoji(emoji.save)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  const t = useTranslations(interaction.guildId ?? "");

  await interaction.deferReply();

  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "followUp");

  const currentTrack = queue.currentTrack;

  if (!currentTrack?.url)
    return guardReply(interaction, "NO_TRACK_URL", "followUp");

  const trackUrl = removeWww(currentTrack.url);

  let trackAlreadyExist: Boolean;
  try {
    trackAlreadyExist = !!(await db.findBossTrackByUrl(trackUrl));
  } catch (error) {
    console.error(
      `[addTrack (find in DB)]: ${
        error instanceof Error ? error.message : error
      }`
    );

    return guardReply(interaction, "GENERIC_ERROR", "followUp");
  }

  if (trackAlreadyExist)
    return guardReply(interaction, "TRACK_ALREADY_EXISTS", "followUp");

  try {
    await db.createBossTrack(trackUrl, "song");
  } catch (error) {
    console.error(
      `[addTrack (add to DB)]: ${
        error instanceof Error ? error.message : error
      }`
    );

    return guardReply(interaction, "DB_SAVE_ERROR", "followUp");
  }

  if (interaction.guildId) {
    addTrackToCache(interaction.guildId, trackUrl);
  }

  const data = buildMessage({
    title: t("buttons.addTrack.message.title"),
    description: t("buttons.addTrack.message.description", {
      user: interaction.user.toString(),
      track: getFormattedTrackDescription(currentTrack, queue),
    }),
    thumbnail: getThumbnail(currentTrack),
    color: "success",
  });

  musicPlayerMessage.buildAndEdit();
  return interaction.followUp(data);
};
