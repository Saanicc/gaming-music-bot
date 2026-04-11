import {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  LabelBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { getPlaylistChoices } from "@/utils/helpers/track";
import { db } from "@/root/src/db";
import { guardReply } from "@/utils/helpers/interactions";

export const data = new SlashCommandBuilder()
  .setName("playlist")
  .setDescription("Playlist management commands")
  .addSubcommand((subcommand) =>
    subcommand.setName("create").setDescription("Create a new playlist")
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("update")
      .setDescription("Update an existing playlist")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("The playlist to update")
          .setAutocomplete(true)
          .setRequired(true)
      )
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName("delete")
      .setDescription("Delete an existing playlist")
      .addStringOption((option) =>
        option
          .setName("id")
          .setDescription("The playlist to delete")
          .setAutocomplete(true)
          .setRequired(true)
      )
  );

export const autocomplete = async (interaction: AutocompleteInteraction) => {
  await getPlaylistChoices(interaction);
};

export const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "create") {
    return handleCreate(interaction);
  } else if (subcommand === "update") {
    return handleUpdate(interaction);
  } else if (subcommand === "delete") {
    return handleDelete(interaction);
  }
};

const handleCreate = async (interaction: ChatInputCommandInteraction) => {
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

const handleUpdate = async (interaction: ChatInputCommandInteraction) => {
  const playlistId = interaction.options.getString("id", true);
  const guildId = interaction.guildId ?? "";

  const playlist = await db.findPlaylistById(guildId, playlistId);

  if (!playlist) {
    return guardReply(interaction, "PLAYLIST_NOT_FOUND", "reply");
  }

  const modal = new ModalBuilder()
    .setCustomId(`update_playlist:${playlistId}`)
    .setTitle(`Update Playlist: ${playlist.name}`);

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("Enter playlist name...")
    .setValue(playlist.name)
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
    .setValue(playlist.trackUrls.join("\n"))
    .setRequired(false);

  const tracksLabel = new LabelBuilder()
    .setLabel("Track urls")
    .setTextInputComponent(tracksInput);

  const nameDetails = new TextDisplayBuilder().setContent(
    `-# Supported sources: __Youtube__, __Spotify__, __Deezer__, __Soundcloud__\n-# Example urls:\n-# <https://\u200Bwww.youtube.com/watch?v=12345>\n-# <https://\u200Bopen.spotify.com/track/12345>\n-# <https://\u200Bwww.deezer.com/track/12345>\n-# <https://\u200Bsoundcloud.com/12345>`
  );

  modal
    .addLabelComponents(nameLabel, tracksLabel)
    .addTextDisplayComponents(nameDetails);

  await interaction.showModal(modal);
};

const handleDelete = async (interaction: ChatInputCommandInteraction) => {
  const playlistId = interaction.options.getString("id", true);
  const guildId = interaction.guildId ?? "";

  const playlist = await db.findPlaylistById(guildId, playlistId);

  if (!playlist) {
    return guardReply(interaction, "PLAYLIST_NOT_FOUND", "reply");
  }

  const modal = new ModalBuilder()
    .setCustomId(`delete_playlist:${playlistId}`)
    .setTitle(`Delete Playlist: ${playlist.name}`);

  const infoLabel = new TextDisplayBuilder().setContent(
    `You are about to delete the playlist __${playlist.name}__\nIt contains ${playlist.trackUrls.length} tracks.`
  );

  const confirmInput = new TextInputBuilder()
    .setCustomId("confirm")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const confirmLabel = new LabelBuilder()
    .setLabel(`Type "${playlist.name}" to confirm deletion`)
    .setTextInputComponent(confirmInput);

  modal.addTextDisplayComponents(infoLabel).addLabelComponents(confirmLabel);

  await interaction.showModal(modal);
};
