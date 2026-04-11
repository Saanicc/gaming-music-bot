import { ModalSubmitInteraction } from "discord.js";
import { useTranslations } from "@/utils/hooks/useTranslations";
import { buildMessage } from "../../utils/bot-message/buildMessage";
import { db } from "../../db";
import { guardReply } from "../../utils/helpers/interactions";

export const execute = async (interaction: ModalSubmitInteraction) => {
  await interaction.deferReply();
  const t = useTranslations(interaction.guildId ?? "");

  const playlistId = interaction.customId.split(":")[1];
  const name = interaction.fields.getTextInputValue("confirm");
  const user = interaction.user;

  const playlist = await db.findPlaylistById(
    interaction.guildId ?? "",
    playlistId
  );

  if (!playlist) {
    return guardReply(interaction, "PLAYLIST_NOT_FOUND", "editReply");
  }

  if (name !== playlist.name) {
    return interaction.editReply(
      buildMessage({
        title: t("commands.playlist.deleteModal.mismatchErrorEmbed.title"),
        description: t(
          "commands.playlist.deleteModal.mismatchErrorEmbed.description"
        ),
        color: "error",
        ephemeral: true,
      })
    );
  }

  try {
    await db.deletePlaylist(interaction.guildId ?? "", playlistId);
  } catch (error) {
    await interaction.editReply(
      buildMessage({
        title: t("commands.playlist.deleteModal.errorEmbed.title"),
        description: t("commands.playlist.deleteModal.errorEmbed.description"),
        color: "error",
        ephemeral: true,
      })
    );
    return;
  }

  return interaction.editReply(
    buildMessage({
      title: t("commands.playlist.deleteModal.successEmbed.title"),
      description: t("commands.playlist.deleteModal.successEmbed.description", {
        user: user.toString(),
        name: playlist.name,
      }),
      color: "success",
    })
  );
};
