import {
  InteractionReplyOptions,
  MessageFlags,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  BaseMessageOptions,
  ButtonBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  MediaGalleryItemBuilder,
  MediaGalleryBuilder,
} from "discord.js";
import { colors as colorConstant, ColorType } from "../constants/colors";

type FontSize = "lg" | "md" | "sm";

export interface BuildMessageOptions {
  title: string;
  titleFontSize?: FontSize;
  color?: ColorType;
  ephemeral?: boolean;
  description?: string;
  thumbnail?: string;
  imageUrl?: string;
  footerText?: string;
  actionRowBuilder?: ActionRowBuilder<
    ButtonBuilder | StringSelectMenuBuilder
  >[];
}

export const buildMessage = ({
  title,
  titleFontSize = "sm",
  color,
  ephemeral = false,
  description,
  thumbnail,
  imageUrl,
  footerText,
  actionRowBuilder,
}: BuildMessageOptions): BaseMessageOptions => {
  const getTitleFontSize = () => {
    switch (titleFontSize) {
      case "lg":
        return "#";
      case "md":
        return "##";
      case "sm":
        return "###";
    }
  };

  const container = new ContainerBuilder();

  const headerSection = new SectionBuilder();

  const textDisplay = new TextDisplayBuilder().setContent(
    `${getTitleFontSize()} ${title}\n${description ?? ""}`
  );

  if (thumbnail) {
    const thumb = new ThumbnailBuilder().setURL(thumbnail);
    headerSection.setThumbnailAccessory(thumb);

    headerSection.addTextDisplayComponents(textDisplay);
    container.addSectionComponents(headerSection);
  } else {
    container.addTextDisplayComponents(textDisplay);
  }

  if (imageUrl) {
    const galleryItem = new MediaGalleryItemBuilder().setURL(imageUrl);
    const gallery = new MediaGalleryBuilder().addItems(galleryItem);
    container.addMediaGalleryComponents(gallery);
  }

  if (actionRowBuilder) {
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addActionRowComponents(actionRowBuilder);
  }

  if (footerText) {
    container.addSeparatorComponents(new SeparatorBuilder());
    const footerDisplay = new TextDisplayBuilder().setContent(
      `-# ${footerText}`
    );
    container.addTextDisplayComponents(footerDisplay);
  }

  if (color) {
    container.setAccentColor(colorConstant[color]);
  }

  const getFlags = () => {
    if (ephemeral) {
      return [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2];
    }
    return [MessageFlags.IsComponentsV2];
  };

  return {
    flags: getFlags(),
    components: [container],
    allowedMentions: { repliedUser: false, parse: [] },
  } as InteractionReplyOptions;
};
