import {
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { useTranslations } from "@/utils/hooks/useTranslations";

export const data = new SlashCommandBuilder()
  .setName("create_playlist")
  .setDescription("Create a new playlist");

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const t = useTranslations(interaction.guildId ?? "");

  const modal = new ModalBuilder()
    .setCustomId("create_playlist")
    .setTitle("Create Playlist");

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter playlist name...")
    .setMinLength(2)
    .setMaxLength(50)
    .setRequired(true);

  const nameLabel = new LabelBuilder()
    .setLabel("Playlist Name")
    .setTextInputComponent(nameInput);

  const tracksInput = new TextInputBuilder()
    .setCustomId("tracks")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Enter track urls, one per line")
    .setRequired(false);

  const tracksLabel = new LabelBuilder()
    .setLabel("Track urls (optional)")
    .setTextInputComponent(tracksInput);

  const nameDetails = new TextDisplayBuilder().setContent(
    `-# Supported sources: __Youtube__, __Spotify__, __Deezer__, __Soundcloud__\n-# Example urls:\n-# <https://\u200Bwww.youtube.com/watch?v=12345>\n-# <https://\u200Bopen.spotify.com/track/12345>\n-# <https://\u200Bwww.deezer.com/track/12345>\n-# <https://\u200Bsoundcloud.com/12345>`
  );

  modal
    .addLabelComponents(nameLabel, tracksLabel)
    .addTextDisplayComponents(nameDetails);

  await interaction.showModal(modal);
};
