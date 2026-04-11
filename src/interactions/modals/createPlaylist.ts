import { ModalSubmitInteraction } from "discord.js";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { buildMessage } from "../../utils/bot-message/buildMessage";
import { db } from "../../db";
import { guardReply } from "../../utils/helpers/interactions";
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

  const name = interaction.fields.getTextInputValue("name");
  const tracks = interaction.fields.getTextInputValue("tracks");
  const user = interaction.user;

  const { valid, invalid } = parseAndValidateTracks(tracks);

  try {
    await db.createPlaylist(interaction.guildId ?? "", {
      name,
      trackUrls: valid,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Playlist name already exists"
    ) {
      return guardReply(interaction, "DUPLICATE_PLAYLIST", "editReply", {
        playlistName: name,
      });
    }

    await interaction.editReply(
      buildMessage({
        title: t("commands.playlist.createModal.errorEmbed.title"),
        description: t("commands.playlist.createModal.errorEmbed.description", {
          name,
        }),
        color: "error",
        ephemeral: true,
      })
    );
    return;
  }

  const description =
    valid.length > 0
      ? t("commands.playlist.createModal.successEmbed.descriptionWithTracks", {
          user: user.toString(),
          count: String(valid.length),
          name,
        })
      : t("commands.playlist.createModal.successEmbed.description", {
          user: user.toString(),
          name,
        });

  await interaction.editReply(
    buildMessage({
      title: t("commands.playlist.createModal.successEmbed.title"),
      description,
      color: "success",
    })
  );

  if (invalid.length > 0) {
    await interaction.followUp(
      buildMessage({
        title: t("commands.playlist.createModal.infoEmbed.title"),
        description: t("commands.playlist.createModal.infoEmbed.description", {
          name,
          invalidUrls: invalid.map((url) => `- \`${url}\``).join("\n"),
        }),
        color: "info",
        footerText: t("commands.playlist.createModal.infoEmbed.footer"),
        ephemeral: true,
      })
    );
  }
};
