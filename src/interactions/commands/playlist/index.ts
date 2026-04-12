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
import { db } from "@/db";
import { guardReply } from "@/utils/helpers/interactions";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { getPlaylistChoices } from "@/utils/helpers/track";

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
  const t = useTranslations(interaction.guildId ?? "");

  const modal = new ModalBuilder()
    .setCustomId("create_playlist")
    .setTitle(t("commands.playlist.createModal.title"));

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(t("commands.playlist.createModal.namePlaceholder"))
    .setMinLength(2)
    .setMaxLength(50)
    .setRequired(true);

  const nameLabel = new LabelBuilder()
    .setLabel(t("commands.playlist.createModal.nameLabel"))
    .setTextInputComponent(nameInput);

  const tracksInput = new TextInputBuilder()
    .setCustomId("tracks")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(t("commands.playlist.createModal.tracksPlaceholder"))
    .setRequired(false);

  const tracksLabel = new LabelBuilder()
    .setLabel(t("commands.playlist.createModal.tracksLabel"))
    .setTextInputComponent(tracksInput);

  const nameDetails = new TextDisplayBuilder().setContent(
    t("commands.playlist.createModal.tracksDetails")
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

  const t = useTranslations(guildId);

  const modal = new ModalBuilder()
    .setCustomId(`update_playlist:${playlistId}`)
    .setTitle(
      t("commands.playlist.updateModal.title", { name: playlist.name })
    );

  const nameInput = new TextInputBuilder()
    .setCustomId("name")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(t("commands.playlist.updateModal.namePlaceholder"))
    .setValue(playlist.name)
    .setMinLength(2)
    .setMaxLength(50)
    .setRequired(true);

  const nameLabel = new LabelBuilder()
    .setLabel(t("commands.playlist.updateModal.nameLabel"))
    .setTextInputComponent(nameInput);

  const tracksInput = new TextInputBuilder()
    .setCustomId("tracks")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder(t("commands.playlist.updateModal.tracksPlaceholder"))
    .setValue(playlist.trackUrls.join("\n"))
    .setRequired(false);

  const tracksLabel = new LabelBuilder()
    .setLabel(t("commands.playlist.updateModal.tracksLabel"))
    .setTextInputComponent(tracksInput);

  const nameDetails = new TextDisplayBuilder().setContent(
    t("commands.playlist.updateModal.tracksDetails")
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

  const t = useTranslations(guildId);

  const modal = new ModalBuilder()
    .setCustomId(`delete_playlist:${playlistId}`)
    .setTitle(
      t("commands.playlist.deleteModal.title", { name: playlist.name })
    );

  const infoLabel = new TextDisplayBuilder().setContent(
    t("commands.playlist.deleteModal.infoLabel", {
      name: playlist.name,
      count: String(playlist.trackUrls.length),
    })
  );

  const confirmInput = new TextInputBuilder()
    .setCustomId("confirm")
    .setStyle(TextInputStyle.Short)
    .setRequired(true);

  const confirmLabel = new LabelBuilder()
    .setLabel(
      t("commands.playlist.deleteModal.confirmLabel", { name: playlist.name })
    )
    .setTextInputComponent(confirmInput);

  modal.addTextDisplayComponents(infoLabel).addLabelComponents(confirmLabel);

  await interaction.showModal(modal);
};
