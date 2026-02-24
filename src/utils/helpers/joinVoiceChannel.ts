import { GuildQueue } from "discord-player";
import { TextChannel, VoiceBasedChannel } from "discord.js";
import { buildMessage } from "../bot-message/buildMessage";
import { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { guardReply } from "./interactionGuard";

interface JoinVoiceChannelArgs {
  queue: GuildQueue;
  voiceChannel: VoiceBasedChannel;
  interaction?: ChatInputCommandInteraction | ButtonInteraction;
  textChannel?: TextChannel;
}

export const joinVoiceChannel = async ({
  queue,
  voiceChannel,
  interaction,
  textChannel,
}: JoinVoiceChannelArgs) => {
  try {
    if (!queue.connection) await queue.connect(voiceChannel);
  } catch (e) {
    if (interaction) {
      return guardReply(interaction, "VOICE_CHANNEL_ERROR", "followUp");
    } else if (!interaction && textChannel) {
      await textChannel.send(
        buildMessage({
          title: "Error",
          description: "Could not join voice channel.",
          color: "error",
        })
      );
    } else {
      console.error("Could not join voice channel.", e);
    }
  }
};
