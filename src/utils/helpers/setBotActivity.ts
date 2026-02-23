import { ActivityType, Client, PresenceStatusData } from "discord.js";

interface BotActivity {
  client: Client;
  status: PresenceStatusData;
  activityText: string;
  activityType?: ActivityType;
}

export const setBotActivity = async ({
  client,
  status,
  activityText,
  activityType,
}: BotActivity) => {
  client.user?.setActivity(activityText, {
    type: activityType ? activityType : undefined,
  });
  client.user?.setStatus(status);
};
