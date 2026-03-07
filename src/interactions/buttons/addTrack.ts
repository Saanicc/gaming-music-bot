import { ButtonBuilder, ButtonInteraction, ButtonStyle } from "discord.js";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { getFormattedTrackDescription } from "@/utils/helpers/getFormattedTrackDescription";
import { useQueue } from "discord-player";
import { getThumbnail, removeWww } from "@/utils/helpers/utils";
import { db } from "@/db";
import { addTrackToCache } from "@/utils/helpers/isTrackInCache";
import { guardReply } from "@/utils/helpers/interactionGuard";
import { emoji } from "@/utils/constants/emojis";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const addTrackButton = new ButtonBuilder()
  .setCustomId("addTrack")
  .setEmoji(emoji.save)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  const t = useTranslations(interaction.guildId ?? "");

  await interaction.deferReply();

  const queue = useQueue();

  if (!queue) return guardReply(interaction, "NO_QUEUE", "followUp");

  let trackUrl = queue?.currentTrack?.url;

  if (!trackUrl) return guardReply(interaction, "NO_TRACK_URL", "followUp");

  trackUrl = removeWww(trackUrl);

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
      track: getFormattedTrackDescription(queue.currentTrack, queue),
    }),
    thumbnail: getThumbnail(queue.currentTrack),
    color: "success",
  });

  return interaction.followUp(data);
};
