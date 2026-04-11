import { ModalSubmitInteraction, TextChannel } from "discord.js";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { buildMessage } from "../../utils/bot-message/buildMessage";

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
