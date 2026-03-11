import {
  ActivityType,
  Client,
  PresenceStatusData,
  TextChannel,
  VoiceBasedChannel,
  ChatInputCommandInteraction,
  ButtonInteraction,
} from "discord.js";
import { GuildQueue } from "discord-player";
import { buildMessage } from "../bot-message/buildMessage";
import { guardReply } from "./interactions";
import { useTranslations } from "../hooks/useTranslations";

interface BotActivity {
  client: Client;
  status: PresenceStatusData;
  activityText: string;
  activityType?: ActivityType;
}

interface JoinVoiceChannelArgs {
  queue: GuildQueue;
  voiceChannel: VoiceBasedChannel;
  interaction?: ChatInputCommandInteraction | ButtonInteraction;
  textChannel?: TextChannel;
}

export const setBotActivity = ({
  client,
  status,
  activityText,
  activityType,
}: BotActivity) => {
  client.user?.setActivity(activityText, {
    type: activityType,
  });
  client.user?.setStatus(status);
};

export const joinVoiceChannel = async ({
  queue,
  voiceChannel,
  interaction,
  textChannel,
}: JoinVoiceChannelArgs) => {
  const t = useTranslations(queue.guild.id);

  try {
    if (!queue.connection) await queue.connect(voiceChannel);
  } catch (e) {
    if (interaction) {
      return guardReply(interaction, "VOICE_CHANNEL_ERROR", "followUp");
    } else if (!interaction && textChannel) {
      await textChannel.send(
        buildMessage({
          title: t("common.error"),
          description: t("common.couldNotJoinVoiceChannel"),
          color: "error",
        })
      );
    } else {
      console.error("Could not join voice channel.", e);
    }
  }
};
