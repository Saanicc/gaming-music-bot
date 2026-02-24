import {
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  MessageCreateOptions,
  TextChannel,
} from "discord.js";
import { queueManager } from "@/services/queueManager";
import { restoreOldQueue } from "@/utils/helpers/restoreOldQueue";
import { delay } from "@/utils/helpers/utils";
import { buildMessage } from "@/utils/bot-message/buildMessage";
import { musicPlayerMessage } from "@/services/musicPlayerMessage";
import { useQueue } from "discord-player";
import { emoji } from "@/utils/constants/emojis";

export const victoryButton = new ButtonBuilder()
  .setCustomId("victory")
  .setEmoji(emoji.victory)
  .setStyle(ButtonStyle.Secondary);

export const execute = async (interaction: ButtonInteraction) => {
  await interaction.deferUpdate();
  const { guild } = interaction;
  if (!guild) {
    return interaction.reply("⚠️ No guild was found.");
  }

  const queue = useQueue();

  if (!queue) {
    return interaction.reply("⚠️ No active music queue.");
  }

  queue.node.stop();
  (queue.metadata as any).isSwitching = true;
  queue.delete();

  const stored = queueManager.retrieve(guild.id);

  if (!stored) {
    const data = buildMessage({
      title:
        "Nothing to restore, leaving voice chat. Please queue some new track(s) to resume playback!",
    });
    await musicPlayerMessage.delete();
    queueManager.setQueueType("normal");
    return await (interaction.channel as TextChannel).send(
      data as MessageCreateOptions
    );
  }

  const data = buildMessage({
    title: "Restoring old queue...",
    color: "info",
  });

  const msg = await (interaction.channel as TextChannel).send(
    data as MessageCreateOptions
  );

  await delay(1250);

  await restoreOldQueue({
    guild,
    storedQueue: stored,
    textChannel: interaction.channel ?? undefined,
    voiceChannel: stored.voiceChannel,
  });

  await msg.delete();
};
