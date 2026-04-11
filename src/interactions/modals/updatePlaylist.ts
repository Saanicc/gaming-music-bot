import { ModalSubmitInteraction } from "discord.js";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { buildMessage } from "../../utils/bot-message/buildMessage";
import { db } from "../../db";
import { SUPPORTED_TRACK_URL_REGEX } from "@/utils/constants/regex";

const parseAndValidateTracks = (
  input: string
): { valid: string[]; invalid: string[] } => {
  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.reduce(
    (acc, url) => {
      if (SUPPORTED_TRACK_URL_REGEX.test(url)) {
        acc.valid.push(url);
      } else {
        acc.invalid.push(url);
      }
      return acc;
    },
    { valid: [] as string[], invalid: [] as string[] }
  );
};

export const execute = async (interaction: ModalSubmitInteraction) => {
  await interaction.deferReply();
  const t = useTranslations(interaction.guildId ?? "");

  const playlistId = interaction.customId.split(":")[1];
  const name = interaction.fields.getTextInputValue("name");
  const tracks = interaction.fields.getTextInputValue("tracks");
  const user = interaction.user;

  const { valid, invalid } = parseAndValidateTracks(tracks);

  try {
    await db.updatePlaylist(interaction.guildId ?? "", playlistId, {
      name,
      trackUrls: valid,
    });
  } catch (error) {
    await interaction.editReply(
      buildMessage({
        title: "Error updating playlist",
        description: `Failed to update playlist **${name}**`,
        color: "error",
        ephemeral: true,
      })
    );
    return;
  }

  await interaction.editReply(
    buildMessage({
      title: "Playlist updated",
      description: `${user} updated the playlist **${name}** ${valid.length ? `(now containing ${valid.length} tracks)` : ""}`,
      color: "success",
    })
  );

  if (invalid.length > 0) {
    await interaction.followUp(
      buildMessage({
        title: "Playlist updated - Info",
        description: `You updated the playlist **${name}**\n\nHowever, the following URLs are invalid or unsupported and were skipped:\n${invalid.map((url) => `- \`${url}\``).join("\n")}\n\nOnly single track URLs are supported.`,
        color: "info",
        ephemeral: true,
      })
    );
  }
};
