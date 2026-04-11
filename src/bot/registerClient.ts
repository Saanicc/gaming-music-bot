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
import { modals } from "../interactions/modals";
import { handleInteraction } from "../utils/helpers/interactions";
import { setBotActivity } from "../utils/helpers/system";
import { db } from "../db";
import { saveBotLanguageToCache } from "../db/language";
import { fetch } from "undici";
import { handleModalInteraction } from "../utils/helpers/interactions/handleModalInteraction";

export const registerDiscordClient = (): Client => {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    rest: {
      makeRequest: fetch,
    },
  });

  const isDev = config.NODE_ENV === "dev";

  client.once(Events.ClientReady, async (readyClient) => {
    if (isDev) {
      setBotActivity({
        client: readyClient,
        status: PresenceUpdateStatus.Idle,
        activityText: "🚧 Under Development 🚧",
        activityType: ActivityType.Custom,
      });
      await deployCommands({ guildId: config.DISCORD_GUILD_ID });
      const language = await db.getLanguageFromDB(config.DISCORD_GUILD_ID);
      saveBotLanguageToCache(config.DISCORD_GUILD_ID, language);
    } else {
      setBotActivity({
        client: readyClient,
        status: PresenceUpdateStatus.Online,
        activityText: "/help",
        activityType: ActivityType.Listening,
      });

      await Promise.all(
        readyClient.guilds.cache.map(async (guild) => {
          const language = await db.getLanguageFromDB(guild.id);
          saveBotLanguageToCache(guild.id, language);
        })
      );
    }

    const environment = config.NODE_ENV.toUpperCase();
    console.log(`[${environment}] 🤖 Logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.GuildCreate, async (guild) => {
    await deployCommands({ guildId: guild.id });
    const language = await db.getLanguageFromDB(guild.id);
    saveBotLanguageToCache(guild.id, language);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;
      await handleInteraction(interaction, commands, commandName);
    } else if (interaction.isButton()) {
      const button = interaction.customId.split(":")[0];
      await handleInteraction(interaction, buttons, button);
    } else if (interaction.isModalSubmit()) {
      const modal = interaction.customId;
      await handleModalInteraction(interaction, modals, modal);
    } else if (interaction.isAutocomplete()) {
      const commandName = interaction.commandName;
      const handler = commands[commandName as keyof typeof commands];
      if (!handler) return;

      if ("autocomplete" in handler) {
        await handler.autocomplete(interaction);
      }
    }
  });

  client.on(Events.Error, (error) => {
    console.error("Discord Client Error:", error);
  });

  return client;
};
