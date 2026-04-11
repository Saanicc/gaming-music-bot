import { ModalSubmitInteraction, TextChannel } from "discord.js";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { buildMessage } from "../../utils/bot-message/buildMessage";
import { db } from "../../db";
import { guardReply } from "../../utils/helpers/interactions";

const SUPPORTED_TRACK_URL_REGEX =
  /^(https?:\/\/)(www\.)?(youtube\.com\/watch\?v=(?!.*[&?]list=)|youtu\.be\/|open\.spotify\.com\/track\/|www\.deezer\.com\/track\/|soundcloud\.com\/(?!.*\/sets\/)[\w\-]+\/)[\w\-]+/;

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
        title: "Error creating playlist",
        description: `Failed to create playlist **${name}**`,
        color: "error",
        ephemeral: true,
      })
    );
    return;
  }

  await interaction.editReply(
    buildMessage({
      title: "Playlist created",
      description: `${user} created a playlist ${valid.length ? `with ${valid.length} tracks` : ""} called **${name}**`,
      color: "success",
    })
  );

  if (invalid.length > 0) {
    await interaction.followUp(
      buildMessage({
        title: "Playlist created - Info",
        description: `You just created a playlist called **${name}**\n\nHowever, the following URLs are invalid or unsupported:\n${invalid.map((url) => `- \`${url}\``).join("\n")}\n\nOnly single track URLs are supported.`,
        color: "info",
        footerText:
          "You can add more tracks later using the `/playlist update` command.",
        ephemeral: true,
      })
    );
  }
};
