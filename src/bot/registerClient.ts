import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  PresenceUpdateStatus,
} from "discord.js";
import { config } from "../config";
import { deployCommands } from "../deploy-commands";
import { buttons } from "../interactions/buttons";
import { commands } from "../interactions/commands";
import { handleInteraction } from "../utils/helpers/handleInteraction";
import { setBotActivity } from "../utils/helpers/setBotActivity";

export const registerDiscordClient = (): Client => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  const isDev = config.NODE_ENV === "dev";

  client.once(Events.ClientReady, async (readyClient) => {
    if (isDev) {
      await deployCommands({ guildId: config.DISCORD_GUILD_ID });
      await setBotActivity({
        client: readyClient,
        status: PresenceUpdateStatus.Idle,
        activityText: "🚧 Under Development 🚧",
        activityType: ActivityType.Custom,
      });
    } else {
      await setBotActivity({
        client: readyClient,
        status: PresenceUpdateStatus.Online,
        activityText: "/help",
        activityType: ActivityType.Listening,
      });
    }

    const environment = isDev ? "DEV" : "PROD";
    console.log(`[${environment}] 🤖 Logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.GuildCreate, async (guild) => {
    await deployCommands({ guildId: guild.id });
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      await handleInteraction(interaction, commands, commandName);
    } else if (interaction.isButton()) {
      const button = interaction.customId.split(":")[0];
      await handleInteraction(interaction, buttons, button);
    }
  });

  client.on(Events.Error, (error) => {
    console.error("Discord Client Error:", error);
  });

  return client;
};
